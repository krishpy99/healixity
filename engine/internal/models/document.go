package models

import (
	"time"

	"github.com/aws/aws-sdk-go/service/dynamodb"
	"github.com/aws/aws-sdk-go/service/dynamodb/dynamodbattribute"
	"github.com/google/uuid"
)

// Document represents a health document stored in the system
type Document struct {
	UserID       string    `json:"user_id" dynamodbav:"user_id"`
	DocumentID   string    `json:"document_id" dynamodbav:"document_id"`
	Title        string    `json:"title" dynamodbav:"title"`
	FileName     string    `json:"file_name" dynamodbav:"file_name"`
	FileType     string    `json:"file_type" dynamodbav:"file_type"`
	FileSize     int64     `json:"file_size" dynamodbav:"file_size"`
	S3Key        string    `json:"s3_key" dynamodbav:"s3_key"`
	UploadTime   time.Time `json:"upload_time" dynamodbav:"upload_time"`
	ProcessedAt  time.Time `json:"processed_at,omitempty" dynamodbav:"processed_at,omitempty"`
	Status       string    `json:"status" dynamodbav:"status"` // "uploaded", "processing", "processed", "failed"
	ChunkCount   int       `json:"chunk_count" dynamodbav:"chunk_count"`
	Tags         []string  `json:"tags,omitempty" dynamodbav:"tags,omitempty"`
	Category     string    `json:"category,omitempty" dynamodbav:"category,omitempty"`
	Description  string    `json:"description,omitempty" dynamodbav:"description,omitempty"`
	ErrorMessage string    `json:"error_message,omitempty" dynamodbav:"error_message,omitempty"`
}

// DocumentChunk represents a chunk of a document for vector storage
type DocumentChunk struct {
	ChunkID    string            `json:"chunk_id"`
	DocumentID string            `json:"document_id"`
	UserID     string            `json:"user_id"`
	Content    string            `json:"content"`
	ChunkIndex int               `json:"chunk_index"`
	Metadata   map[string]string `json:"metadata"`
	Embedding  []float32         `json:"embedding,omitempty"`
}

// DocumentUploadRequest represents a document upload request
type DocumentUploadRequest struct {
	Title       string   `json:"title" binding:"required"`
	Category    string   `json:"category,omitempty"`
	Description string   `json:"description,omitempty"`
	Tags        []string `json:"tags,omitempty"`
}

// DocumentListResponse represents response for listing documents
type DocumentListResponse struct {
	Documents  []Document `json:"documents"`
	TotalCount int        `json:"total_count"`
	HasMore    bool       `json:"has_more"`
	NextCursor string     `json:"next_cursor,omitempty"`
}

// DocumentUploadResponse represents response after document upload
type DocumentUploadResponse struct {
	DocumentID string `json:"document_id"`
	Status     string `json:"status"`
	Message    string `json:"message"`
}

// DocumentStatus constants
const (
	StatusUploaded   = "uploaded"
	StatusProcessing = "processing"
	StatusProcessed  = "processed"
	StatusFailed     = "failed"
)

// DocumentCategory constants
const (
	CategoryLabResults    = "lab_results"
	CategoryPrescription  = "prescription"
	CategoryMedicalReport = "medical_report"
	CategoryInsurance     = "insurance"
	CategoryGeneral       = "general"
)

// NewDocument creates a new document instance
func NewDocument(userID, title, fileName, fileType string, fileSize int64) *Document {
	return &Document{
		UserID:     userID,
		DocumentID: uuid.New().String(),
		Title:      title,
		FileName:   fileName,
		FileType:   fileType,
		FileSize:   fileSize,
		UploadTime: time.Now(),
		Status:     StatusUploaded,
		ChunkCount: 0,
	}
}

// NewDocumentChunk creates a new document chunk
func NewDocumentChunk(documentID, userID, content string, chunkIndex int) *DocumentChunk {
	return &DocumentChunk{
		ChunkID:    uuid.New().String(),
		DocumentID: documentID,
		UserID:     userID,
		Content:    content,
		ChunkIndex: chunkIndex,
		Metadata:   make(map[string]string),
	}
}

// ToDynamoDBItem converts Document to DynamoDB item
func (d *Document) ToDynamoDBItem() (map[string]*dynamodb.AttributeValue, error) {
	return dynamodbattribute.MarshalMap(d)
}

// FromDynamoDBItem converts DynamoDB item to Document
func (d *Document) FromDynamoDBItem(item map[string]*dynamodb.AttributeValue) error {
	return dynamodbattribute.UnmarshalMap(item, d)
}

// GetPartitionKey returns the partition key for DynamoDB
func (d *Document) GetPartitionKey() string {
	return d.UserID
}

// GetSortKey returns the sort key for DynamoDB
func (d *Document) GetSortKey() string {
	return d.DocumentID
}

// SetS3Key sets the S3 key for the document
func (d *Document) SetS3Key(bucket string) {
	d.S3Key = d.UserID + "/" + d.DocumentID + "/" + d.FileName
}

// IsProcessed checks if the document has been processed
func (d *Document) IsProcessed() bool {
	return d.Status == StatusProcessed
}

// MarkAsProcessing marks the document as being processed
func (d *Document) MarkAsProcessing() {
	d.Status = StatusProcessing
}

// MarkAsProcessed marks the document as processed
func (d *Document) MarkAsProcessed(chunkCount int) {
	d.Status = StatusProcessed
	d.ChunkCount = chunkCount
	d.ProcessedAt = time.Now()
}

// MarkAsFailed marks the document as failed to process
func (d *Document) MarkAsFailed(errorMessage string) {
	d.Status = StatusFailed
	d.ErrorMessage = errorMessage
}

// GetMetadata returns metadata for the document chunk
func (dc *DocumentChunk) GetMetadata() map[string]interface{} {
	metadata := map[string]interface{}{
		"document_id":  dc.DocumentID,
		"user_id":      dc.UserID,
		"chunk_id":     dc.ChunkID,
		"chunk_index":  dc.ChunkIndex,
		"content_type": "document_chunk",
	}

	// Add custom metadata
	for k, v := range dc.Metadata {
		metadata[k] = v
	}

	return metadata
}

// SetMetadata sets custom metadata for the chunk
func (dc *DocumentChunk) SetMetadata(key, value string) {
	if dc.Metadata == nil {
		dc.Metadata = make(map[string]string)
	}
	dc.Metadata[key] = value
}
