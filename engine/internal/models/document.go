package models

import (
	"fmt"
	"time"

	"github.com/aws/aws-sdk-go/service/dynamodb"
	"github.com/aws/aws-sdk-go/service/dynamodb/dynamodbattribute"
	"github.com/google/uuid"
)

// Document represents a health document stored in the system
type Document struct {
	UserID                string    `json:"user_id" dynamodbav:"user_id"`
	SortKey               string    `json:"sort_key" dynamodbav:"sort_key"` // category#timestamp
	DocumentID            string    `json:"document_id" dynamodbav:"document_id"`
	Title                 string    `json:"title" dynamodbav:"title"`
	FileName              string    `json:"file_name" dynamodbav:"file_name"`
	FileType              string    `json:"file_type" dynamodbav:"file_type"`
	ContentType           string    `json:"content_type" dynamodbav:"content_type"`
	FileSize              int64     `json:"file_size" dynamodbav:"file_size"`
	S3Key                 string    `json:"s3_key" dynamodbav:"s3_key"`
	S3URL                 string    `json:"s3_url,omitempty" dynamodbav:"s3_url,omitempty"`
	UploadTime            time.Time `json:"upload_time" dynamodbav:"upload_time"`
	ProcessedAt           time.Time `json:"processed_at,omitempty" dynamodbav:"processed_at,omitempty"`
	Status                string    `json:"status" dynamodbav:"status"` // "uploaded", "processing", "processed", "failed"
	ChunkCount            int       `json:"chunk_count" dynamodbav:"chunk_count"`
	Tags                  []string  `json:"tags,omitempty" dynamodbav:"tags,omitempty"`
	Category              string    `json:"category" dynamodbav:"category"`
	Description           string    `json:"description,omitempty" dynamodbav:"description,omitempty"`
	ErrorMessage          string    `json:"error_message,omitempty" dynamodbav:"error_message,omitempty"`
	ProcessingAttempts    int       `json:"processing_attempts" dynamodbav:"processing_attempts"`
	LastProcessingAttempt time.Time `json:"last_processing_attempt,omitempty" dynamodbav:"last_processing_attempt,omitempty"`
	IndexedInPinecone     bool      `json:"indexed_in_pinecone" dynamodbav:"indexed_in_pinecone"`
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
	Document *Document `json:"document"`
	Status   string    `json:"status"`
	Message  string    `json:"message"`
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
func NewDocument(userID, title, fileName, fileType, contentType, category string, fileSize int64) *Document {
	now := time.Now()
	timestamp := now.Unix()

	return &Document{
		UserID:      userID,
		SortKey:     fmt.Sprintf("%s#%d", category, timestamp),
		DocumentID:  uuid.New().String(),
		Title:       title,
		FileName:    fileName,
		FileType:    fileType,
		ContentType: contentType,
		FileSize:    fileSize,
		Category:    category,
		UploadTime:  now,
		Status:      StatusUploaded,
		ChunkCount:  0,
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
	// Use the actual sort_key field which has format category#timestamp
	return d.SortKey
}

// SetS3Key sets the S3 key for the document
func (d *Document) SetS3Key(bucket string) {
	d.S3Key = fmt.Sprintf("%s/%s/%s", d.UserID, d.DocumentID, d.FileName)
}

// SetS3URL sets the S3 URL for the document
func (d *Document) SetS3URL(url string) {
	d.S3URL = url
}

// IsProcessed checks if the document has been processed
func (d *Document) IsProcessed() bool {
	return d.Status == StatusProcessed
}

// MarkAsProcessing marks the document as being processed
func (d *Document) MarkAsProcessing() {
	d.Status = StatusProcessing
	d.ProcessingAttempts++
	d.LastProcessingAttempt = time.Now()
}

// MarkAsProcessed marks the document as processed
func (d *Document) MarkAsProcessed(chunkCount int) {
	d.Status = StatusProcessed
	d.ChunkCount = chunkCount
	d.ProcessedAt = time.Now()
	d.IndexedInPinecone = true
}

// MarkAsFailed marks the document as failed to process
func (d *Document) MarkAsFailed(errorMessage string) {
	d.Status = StatusFailed
	d.ErrorMessage = errorMessage
	d.ProcessingAttempts++
	d.LastProcessingAttempt = time.Now()
}

// CanRetryProcessing checks if the document can be retried for processing
func (d *Document) CanRetryProcessing() bool {
	return d.Status == StatusFailed && d.ProcessingAttempts < 3
}

// ShouldAutoProcess checks if the document should be automatically processed
func (d *Document) ShouldAutoProcess() bool {
	return d.Status == StatusUploaded && d.ProcessingAttempts == 0
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
