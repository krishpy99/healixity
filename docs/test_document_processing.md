# Document Processing Test Plan

## Overview
This document outlines the testing plan for the new automatic document processing functionality.

## Changes Made

### Backend Changes
1. **Automatic Processing**: Documents are now automatically processed after upload
2. **Enhanced Status Tracking**: Added `processing_attempts`, `last_processing_attempt`, and `indexed_in_pinecone` fields
3. **Pinecone Integration**: Chunks are automatically indexed in Pinecone with document metadata
4. **Retry Mechanism**: Failed documents can be retried up to 3 times
5. **Document Querying**: New API endpoint for AI to search through document content

### Frontend Changes
1. **Removed Process Button**: Manual processing button removed since processing is automatic
2. **Added Retry Button**: Only shown for failed documents
3. **Enhanced Status Display**: Better visual indicators for processing states
4. **Updated Messages**: Reflects automatic processing

## Test Cases

### 1. Document Upload and Automatic Processing
- **Test**: Upload a PDF document
- **Expected**: 
  - Document status starts as "uploaded"
  - Automatically changes to "processing"
  - Eventually becomes "processed" with chunk count > 0
  - `indexed_in_pinecone` should be true

### 2. Failed Document Processing
- **Test**: Upload an invalid or corrupted file
- **Expected**:
  - Document status becomes "failed"
  - Error message is populated
  - Retry button appears in UI
  - Processing attempts incremented

### 3. Document Retry
- **Test**: Click retry on a failed document
- **Expected**:
  - Status changes back to "processing"
  - Error message cleared
  - Processing attempts incremented
  - If successful, status becomes "processed"

### 4. Document Deletion
- **Test**: Delete a processed document
- **Expected**:
  - Document removed from database
  - File deleted from S3
  - Chunks removed from Pinecone

### 5. Document Querying
- **Test**: Use the `/api/documents/query` endpoint
- **Expected**:
  - Returns relevant chunks based on semantic similarity
  - Results include document metadata
  - Chunks can be traced back to source documents

### 6. AI Chat Integration
- **Test**: Ask AI about uploaded document content
- **Expected**:
  - AI can find relevant information from documents
  - Responses include source references
  - Document content is properly integrated into responses

## API Endpoints

### New Endpoints
- `POST /api/documents/:id/retry` - Retry failed document processing
- `POST /api/documents/query` - Query documents for AI

### Modified Endpoints
- `POST /api/documents/upload` - Now triggers automatic processing

## Database Schema Updates

### Document Table
```json
{
  "processing_attempts": 0,
  "last_processing_attempt": "2024-01-01T00:00:00Z",
  "indexed_in_pinecone": false
}
```

## Pinecone Metadata Structure

Each chunk stored in Pinecone includes:
```json
{
  "document_id": "uuid",
  "chunk_id": "uuid", 
  "content": "chunk text content",
  "user_id": "user_uuid",
  "chunk_index": 0,
  "document_title": "Document Title",
  "document_category": "lab_results",
  "document_file_type": "pdf",
  "upload_time": "2024-01-01T00:00:00Z"
}
```

## Error Handling

1. **S3 Upload Failure**: Document not saved to database
2. **Text Extraction Failure**: Document marked as failed with error message
3. **Pinecone Indexing Failure**: Document marked as failed, can be retried
4. **Retry Limit**: Documents that fail 3 times cannot be retried

## Performance Considerations

1. **Async Processing**: Document processing happens in background goroutines
2. **Chunk Size**: Configurable via `CHUNK_SIZE` environment variable
3. **Embedding Generation**: Rate limited by LLM provider
4. **Pinecone Upserts**: Batched for efficiency

## Monitoring

Monitor the following metrics:
1. Document processing success rate
2. Average processing time
3. Pinecone indexing errors
4. Retry frequency
5. Query response times 