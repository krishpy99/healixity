package ai

import (
	"context"
)

// EmbeddingClient interface for different embedding providers
type EmbeddingClient interface {
	GenerateEmbedding(ctx context.Context, text string) ([]float32, error)
}
