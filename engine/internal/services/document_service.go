package services

import (
	"fmt"
	"mime/multipart"
	"path/filepath"
	"strings"

	"health-dashboard-backend/internal/config"
	"health-dashboard-backend/internal/database"
	"health-dashboard-backend/internal/models"
	"health-dashboard-backend/internal/storage"
	"health-dashboard-backend/pkg/fileprocessor"
)

// DocumentService handles document operations
type DocumentService struct {
	s3Client  *storage.S3Client
	db        *database.DynamoDBClient
	processor *fileprocessor.FileProcessor
	cfg       *config.Config
}

// NewDocumentService creates a new document service
func NewDocumentService(s3Client *storage.S3Client, db *database.DynamoDBClient, cfg *config.Config) *DocumentService {
	return &DocumentService{
		s3Client:  s3Client,
		db:        db,
		processor: fileprocessor.NewFileProcessor(),
		cfg:       cfg,
	}
}

// UploadDocument uploads and processes a document
func (d *DocumentService) UploadDocument(userID string, file *multipart.FileHeader, request *models.DocumentUploadRequest) (*models.DocumentUploadResponse, error) {
	// Validate file
	if err := d.validateFile(file); err != nil {
		return nil, err
	}

	// Create document record
	fileType := strings.ToLower(filepath.Ext(file.Filename)[1:])
	document := models.NewDocument(userID, request.Title, file.Filename, fileType, file.Size)
	document.Category = request.Category
	document.Description = request.Description
	document.Tags = request.Tags
	document.SetS3Key(d.cfg.S3Bucket)

	// Upload file to S3
	fileReader, err := file.Open()
	if err != nil {
		return nil, fmt.Errorf("failed to open file: %w", err)
	}
	defer fileReader.Close()

	metadata := map[string]*string{
		"user_id":     &userID,
		"document_id": &document.DocumentID,
		"title":       &request.Title,
		"file_type":   &fileType,
	}

	_, err = d.s3Client.UploadFile(document.S3Key, fileReader, file.Header.Get("Content-Type"), metadata)
	if err != nil {
		return nil, fmt.Errorf("failed to upload file to S3: %w", err)
	}

	// Save document metadata to database
	if err := d.db.PutDocument(document); err != nil {
		// Try to cleanup S3 file if database save fails
		d.s3Client.DeleteFile(document.S3Key)
		return nil, fmt.Errorf("failed to save document metadata: %w", err)
	}

	return &models.DocumentUploadResponse{
		DocumentID: document.DocumentID,
		Status:     models.StatusUploaded,
		Message:    "Document uploaded successfully",
	}, nil
}

// GetUserDocuments retrieves documents for a user
func (d *DocumentService) GetUserDocuments(userID string, limit int, cursor string) (*models.DocumentListResponse, error) {
	// Parse cursor if provided (simplified implementation)

	documents, nextKey, err := d.db.GetUserDocuments(userID, limit, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to get user documents: %w", err)
	}

	hasMore := nextKey != nil
	nextCursor := ""
	if hasMore {
		// Convert nextKey to cursor string (simplified)
		nextCursor = "next_page"
	}

	return &models.DocumentListResponse{
		Documents:  documents,
		TotalCount: len(documents),
		HasMore:    hasMore,
		NextCursor: nextCursor,
	}, nil
}

// GetDocument retrieves a specific document
func (d *DocumentService) GetDocument(userID, documentID string) (*models.Document, error) {
	return d.db.GetDocument(userID, documentID)
}

// DeleteDocument deletes a document and its file
func (d *DocumentService) DeleteDocument(userID, documentID string) error {
	// Get document first
	document, err := d.db.GetDocument(userID, documentID)
	if err != nil {
		return fmt.Errorf("failed to get document: %w", err)
	}

	// Delete from S3
	if err := d.s3Client.DeleteFile(document.S3Key); err != nil {
		// Log error but continue with database deletion
		// In production, you might want to retry or queue for later cleanup
	}

	// Delete from database
	if err := d.db.DeleteDocument(userID, documentID); err != nil {
		return fmt.Errorf("failed to delete document from database: %w", err)
	}

	return nil
}

// ProcessDocument extracts text and creates chunks from a document
func (d *DocumentService) ProcessDocument(userID, documentID string) error {
	// Get document
	document, err := d.db.GetDocument(userID, documentID)
	if err != nil {
		return fmt.Errorf("failed to get document: %w", err)
	}

	// Mark as processing
	document.MarkAsProcessing()
	if err := d.db.UpdateDocument(document); err != nil {
		return fmt.Errorf("failed to update document status: %w", err)
	}

	// Download file from S3
	fileData, err := d.s3Client.DownloadFile(document.S3Key)
	if err != nil {
		document.MarkAsFailed("Failed to download file from S3")
		d.db.UpdateDocument(document)
		return fmt.Errorf("failed to download file: %w", err)
	}

	// Extract text
	text, err := d.processor.ExtractText(fileData, document.FileType)
	if err != nil {
		document.MarkAsFailed("Failed to extract text from file")
		d.db.UpdateDocument(document)
		return fmt.Errorf("failed to extract text: %w", err)
	}

	// Create chunks
	chunks := d.processor.ChunkText(text, d.cfg.ChunkSize, d.cfg.ChunkOverlap)

	// Mark as processed
	document.MarkAsProcessed(len(chunks))
	if err := d.db.UpdateDocument(document); err != nil {
		return fmt.Errorf("failed to update document status: %w", err)
	}

	return nil
}

// GetDocumentContent retrieves the content of a document
func (d *DocumentService) GetDocumentContent(userID, documentID string) ([]byte, error) {
	document, err := d.db.GetDocument(userID, documentID)
	if err != nil {
		return nil, fmt.Errorf("failed to get document: %w", err)
	}

	return d.s3Client.DownloadFile(document.S3Key)
}

// validateFile validates the uploaded file
func (d *DocumentService) validateFile(file *multipart.FileHeader) error {
	// Check file size
	if file.Size > d.cfg.MaxFileSize {
		return fmt.Errorf("file size exceeds maximum allowed size of %d bytes", d.cfg.MaxFileSize)
	}

	// Check file type
	fileType := strings.ToLower(filepath.Ext(file.Filename)[1:])
	if !d.processor.IsFormatSupported(fileType) {
		return fmt.Errorf("unsupported file type: %s", fileType)
	}

	return nil
}
