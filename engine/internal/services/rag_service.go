package services

import (
	"context"
	"fmt"

	"health-dashboard-backend/internal/config"
	"health-dashboard-backend/internal/models"
	"health-dashboard-backend/internal/vectordb"
	"health-dashboard-backend/pkg/ai"
)

// RAGService handles retrieval-augmented generation operations
type RAGService struct {
	vectorDB  *vectordb.PineconeClient
	llmClient ai.LLMClient
	cfg       *config.Config
}

// NewRAGService creates a new RAG service
func NewRAGService(vectorDB *vectordb.PineconeClient, llmClient ai.LLMClient, cfg *config.Config) *RAGService {
	return &RAGService{
		vectorDB:  vectorDB,
		llmClient: llmClient,
		cfg:       cfg,
	}
}

// ProcessDocumentChunks processes document chunks and stores them in vector database
func (r *RAGService) ProcessDocumentChunks(userID, documentID string, chunks []models.DocumentChunk) error {
	ctx := context.Background()

	// Generate embeddings for each chunk
	var vectors []vectordb.Vector
	for _, chunk := range chunks {
		// Generate embedding
		embedding, err := r.llmClient.GenerateEmbedding(ctx, chunk.Content)
		if err != nil {
			return fmt.Errorf("failed to generate embedding for chunk %s: %w", chunk.ChunkID, err)
		}

		// Create vector
		chunk.Embedding = embedding
		vector := vectordb.CreateVectorFromChunk(&chunk)
		vectors = append(vectors, *vector)
	}

	// Store vectors in Pinecone
	if err := r.vectorDB.UpsertVectors(ctx, vectors); err != nil {
		return fmt.Errorf("failed to store vectors in database: %w", err)
	}

	return nil
}

// QueryRelevantContext queries for relevant document context
func (r *RAGService) QueryRelevantContext(ctx context.Context, userID, query string, topK int) ([]models.RAGContext, error) {
	// Generate embedding for the query
	queryEmbedding, err := r.llmClient.GenerateEmbedding(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to generate query embedding: %w", err)
	}

	// Create filter for user's documents
	filter := vectordb.FilterByUser(userID)

	// Query similar vectors
	response, err := r.vectorDB.QueryVectors(ctx, queryEmbedding, topK, filter)
	if err != nil {
		return nil, fmt.Errorf("failed to query vectors: %w", err)
	}

	// Convert results to RAG context
	var contexts []models.RAGContext
	for _, result := range response.Results {
		context := models.RAGContext{
			DocumentID: extractDocumentID(result.Metadata),
			ChunkID:    result.ID,
			Content:    extractContent(result.Metadata),
			Score:      result.Score,
		}
		contexts = append(contexts, context)
	}

	return contexts, nil
}

// QueryDocumentContext queries for context within specific documents
func (r *RAGService) QueryDocumentContext(ctx context.Context, userID string, documentIDs []string, query string, topK int) ([]models.RAGContext, error) {
	// Generate embedding for the query
	queryEmbedding, err := r.llmClient.GenerateEmbedding(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to generate query embedding: %w", err)
	}

	var allContexts []models.RAGContext

	// Query each document separately
	for _, documentID := range documentIDs {
		filter := vectordb.FilterByDocument(userID, documentID)

		response, err := r.vectorDB.QueryVectors(ctx, queryEmbedding, topK, filter)
		if err != nil {
			continue // Skip failed documents
		}

		// Convert results to RAG context
		for _, result := range response.Results {
			context := models.RAGContext{
				DocumentID: documentID,
				ChunkID:    result.ID,
				Content:    extractContent(result.Metadata),
				Score:      result.Score,
			}
			allContexts = append(allContexts, context)
		}
	}

	return allContexts, nil
}

// DeleteDocumentVectors deletes vectors for a specific document
func (r *RAGService) DeleteDocumentVectors(ctx context.Context, userID, documentID string) error {
	filter := vectordb.FilterByDocument(userID, documentID)
	return r.vectorDB.DeleteVectorsByFilter(ctx, filter)
}

// DeleteUserVectors deletes all vectors for a user
func (r *RAGService) DeleteUserVectors(ctx context.Context, userID string) error {
	filter := vectordb.FilterByUser(userID)
	return r.vectorDB.DeleteVectorsByFilter(ctx, filter)
}

// SearchDocuments searches for relevant documents based on semantic similarity
func (r *RAGService) SearchDocuments(ctx context.Context, userID, query string, topK int) ([]models.Source, error) {
	contexts, err := r.QueryRelevantContext(ctx, userID, query, topK)
	if err != nil {
		return nil, err
	}

	// Group contexts by document and convert to sources
	documentMap := make(map[string][]models.RAGContext)
	for _, context := range contexts {
		documentMap[context.DocumentID] = append(documentMap[context.DocumentID], context)
	}

	var sources []models.Source
	for documentID, docContexts := range documentMap {
		// Use the highest scoring chunk as the representative
		bestContext := docContexts[0]
		for _, context := range docContexts {
			if context.Score > bestContext.Score {
				bestContext = context
			}
		}

		source := models.Source{
			DocumentID:   documentID,
			DocumentName: "Document", // Would need to fetch actual name
			ChunkID:      bestContext.ChunkID,
			Content:      bestContext.Content,
			Relevance:    bestContext.Score,
		}
		sources = append(sources, source)
	}

	return sources, nil
}

// extractDocumentID extracts document ID from vector metadata
func extractDocumentID(metadata vectordb.VectorMetadata) string {
	if docID, ok := metadata["document_id"].(string); ok {
		return docID
	}
	return ""
}

// extractContent extracts content from vector metadata (placeholder)
func extractContent(metadata vectordb.VectorMetadata) string {
	// In a real implementation, you'd store chunk content in metadata
	// or fetch it from another source
	if content, ok := metadata["content"].(string); ok {
		return content
	}
	return "Content not available"
}

// GetIndexStats returns statistics about the vector index
func (r *RAGService) GetIndexStats(ctx context.Context) (map[string]interface{}, error) {
	stats, err := r.vectorDB.GetIndexStats(ctx)
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"total_vectors": stats,
	}, nil
}
