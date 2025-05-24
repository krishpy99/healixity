package vectordb

import (
	"context"
	"fmt"

	"github.com/pinecone-io/go-pinecone/pinecone"
	"google.golang.org/protobuf/types/known/structpb"

	"health-dashboard-backend/internal/config"
	"health-dashboard-backend/internal/models"
)

// PineconeClient wraps the official Pinecone Go SDK
type PineconeClient struct {
	client          *pinecone.Client
	indexConnection *pinecone.IndexConnection
	indexName       string
}

// Vector represents a vector with metadata
type Vector struct {
	ID       string
	Values   []float32
	Metadata VectorMetadata
}

// VectorMetadata represents metadata for a vector
type VectorMetadata map[string]interface{}

// QueryResponse represents a query response from Pinecone
type QueryResponse struct {
	Results []QueryResult
}

// QueryResult represents a single query result
type QueryResult struct {
	ID       string
	Score    float32
	Metadata VectorMetadata
}

// NewPineconeClient creates a new Pinecone client using the official SDK
func NewPineconeClient(cfg *config.Config) (*PineconeClient, error) {
	clientParams := pinecone.NewClientParams{
		ApiKey: cfg.PineconeAPIKey,
	}

	client, err := pinecone.NewClient(clientParams)
	if err != nil {
		return nil, fmt.Errorf("failed to create Pinecone client: %w", err)
	}

	return &PineconeClient{
		client:    client,
		indexName: cfg.PineconeIndexName,
	}, nil
}

// ConnectToIndex connects to the Pinecone index
func (p *PineconeClient) ConnectToIndex(ctx context.Context) error {
	// Get index details
	idx, err := p.client.DescribeIndex(ctx, p.indexName)
	if err != nil {
		return fmt.Errorf("failed to describe index: %w", err)
	}

	// Connect to index
	indexConnection, err := p.client.Index(pinecone.NewIndexConnParams{
		Host: idx.Host,
	})
	if err != nil {
		return fmt.Errorf("failed to connect to index: %w", err)
	}

	p.indexConnection = indexConnection
	return nil
}

// UpsertVectors upserts vectors to the Pinecone index
func (p *PineconeClient) UpsertVectors(ctx context.Context, vectors []Vector) error {
	if p.indexConnection == nil {
		if err := p.ConnectToIndex(ctx); err != nil {
			return err
		}
	}

	// Convert our Vector type to Pinecone's Vector type
	pineconeVectors := make([]*pinecone.Vector, len(vectors))
	for i, v := range vectors {
		// Convert metadata to structpb.Struct
		metadata, err := structpb.NewStruct(v.Metadata)
		if err != nil {
			return fmt.Errorf("failed to convert metadata for vector %s: %w", v.ID, err)
		}

		pineconeVectors[i] = &pinecone.Vector{
			Id:       v.ID,
			Values:   v.Values,
			Metadata: metadata,
		}
	}

	_, err := p.indexConnection.UpsertVectors(ctx, pineconeVectors)
	if err != nil {
		return fmt.Errorf("failed to upsert vectors: %w", err)
	}

	return nil
}

// QueryVectors queries the Pinecone index for similar vectors
func (p *PineconeClient) QueryVectors(ctx context.Context, queryVector []float32, topK int, filter VectorMetadata) (*QueryResponse, error) {
	if p.indexConnection == nil {
		if err := p.ConnectToIndex(ctx); err != nil {
			return nil, err
		}
	}

	// Convert filter to structpb.Struct if provided
	var metadataFilter *structpb.Struct
	if filter != nil {
		var err error
		metadataFilter, err = structpb.NewStruct(filter)
		if err != nil {
			return nil, fmt.Errorf("failed to convert filter: %w", err)
		}
	}

	// Query the index
	response, err := p.indexConnection.QueryByVectorValues(ctx, &pinecone.QueryByVectorValuesRequest{
		Vector:          queryVector,
		TopK:            uint32(topK),
		MetadataFilter:  metadataFilter,
		IncludeValues:   false,
		IncludeMetadata: true,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to query vectors: %w", err)
	}

	// Convert response to our format
	results := make([]QueryResult, len(response.Matches))
	for i, match := range response.Matches {
		metadata := make(VectorMetadata)
		if match.Vector.Metadata != nil {
			metadata = match.Vector.Metadata.AsMap()
		}

		results[i] = QueryResult{
			ID:       match.Vector.Id,
			Score:    match.Score,
			Metadata: metadata,
		}
	}

	return &QueryResponse{
		Results: results,
	}, nil
}

// DeleteVectorsByFilter deletes vectors matching a filter
func (p *PineconeClient) DeleteVectorsByFilter(ctx context.Context, filter VectorMetadata) error {
	if p.indexConnection == nil {
		if err := p.ConnectToIndex(ctx); err != nil {
			return err
		}
	}

	// Convert filter to structpb.Struct
	metadataFilter, err := structpb.NewStruct(filter)
	if err != nil {
		return fmt.Errorf("failed to convert filter: %w", err)
	}

	err = p.indexConnection.DeleteVectorsByFilter(ctx, metadataFilter)
	if err != nil {
		return fmt.Errorf("failed to delete vectors by filter: %w", err)
	}

	return nil
}

// GetIndexStats returns statistics about the index
func (p *PineconeClient) GetIndexStats(ctx context.Context) (interface{}, error) {
	if p.indexConnection == nil {
		if err := p.ConnectToIndex(ctx); err != nil {
			return nil, err
		}
	}

	stats, err := p.indexConnection.DescribeIndexStats(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get index stats: %w", err)
	}

	return stats, nil
}

// Helper functions for creating vectors and filters

// CreateVectorFromChunk creates a vector from a document chunk
func CreateVectorFromChunk(chunk *models.DocumentChunk) *Vector {
	metadata := VectorMetadata{
		"document_id": chunk.DocumentID,
		"chunk_id":    chunk.ChunkID,
		"content":     chunk.Content,
		"user_id":     chunk.UserID,
	}

	return &Vector{
		ID:       chunk.ChunkID,
		Values:   chunk.Embedding,
		Metadata: metadata,
	}
}

// FilterByUser creates a filter for a specific user
func FilterByUser(userID string) VectorMetadata {
	return VectorMetadata{
		"user_id": userID,
	}
}

// FilterByDocument creates a filter for a specific document
func FilterByDocument(userID, documentID string) VectorMetadata {
	return VectorMetadata{
		"user_id":     userID,
		"document_id": documentID,
	}
}

// FilterByDocumentType creates a filter for a specific document type
func FilterByDocumentType(userID, docType string) VectorMetadata {
	return VectorMetadata{
		"user_id":      userID,
		"content_type": docType,
	}
}

// HealthCheck checks if Pinecone is accessible
func (p *PineconeClient) HealthCheck(ctx context.Context) error {
	_, err := p.GetIndexStats(ctx)
	if err != nil {
		return fmt.Errorf("Pinecone health check failed: %w", err)
	}
	return nil
}
