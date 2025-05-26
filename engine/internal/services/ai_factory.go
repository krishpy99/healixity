package services

import (
	"fmt"

	"health-dashboard-backend/internal/config"
	"health-dashboard-backend/pkg/ai"
	"health-dashboard-backend/pkg/ai/embeddings"
	"health-dashboard-backend/pkg/ai/llms"
)

// AIClientFactory provides methods to create AI clients
type AIClientFactory struct {
	cfg *config.Config
}

// NewAIClientFactory creates a new AI client factory
func NewAIClientFactory(cfg *config.Config) *AIClientFactory {
	return &AIClientFactory{
		cfg: cfg,
	}
}

// CreateLLMClient creates a new LLM client based on the provider
func (f *AIClientFactory) CreateLLMClient() (ai.LLMClient, error) {
	switch f.cfg.LLMProvider {
	case "sonar":
		return llms.NewSonarClient(f.cfg)
	default:
		return nil, fmt.Errorf("unsupported LLM provider: %s", f.cfg.LLMProvider)
	}
}

// CreateEmbeddingClient creates a new embedding client
func (f *AIClientFactory) CreateEmbeddingClient() (ai.EmbeddingClient, error) {
	// For now, we only support OpenAI for embeddings
	return embeddings.NewOpenAIClient(f.cfg)
}
