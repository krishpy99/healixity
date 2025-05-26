package embeddings

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	"health-dashboard-backend/internal/config"
)

// OpenAIClient implements EmbeddingClient for OpenAI's API
type OpenAIClient struct {
	apiKey string
	model  string
	client *http.Client
}

// NewOpenAIClient creates a new OpenAI client for embeddings
func NewOpenAIClient(cfg *config.Config) (*OpenAIClient, error) {
	if cfg.OpenAIAPIKey == "" {
		return nil, fmt.Errorf("OpenAI API key is required")
	}

	model := cfg.EmbeddingModel
	if model == "" {
		model = "text-embedding-3-large" // Default OpenAI embedding model
	}

	// Log the model being used for debugging
	fmt.Printf("DEBUG: Using embedding model: %s\n", model)

	// Warn about dimension mismatches
	switch model {
	case "text-embedding-ada-002", "text-embedding-3-small":
		fmt.Printf("WARNING: Model %s produces 1536-dimensional vectors. Ensure your Pinecone index is configured for 1536 dimensions.\n", model)
	case "text-embedding-3-large":
		fmt.Printf("INFO: Model %s produces 3072-dimensional vectors. Ensure your Pinecone index is configured for 3072 dimensions.\n", model)
	default:
		fmt.Printf("WARNING: Unknown embedding model %s. Please verify the dimensions match your Pinecone index.\n", model)
	}

	return &OpenAIClient{
		apiKey: cfg.OpenAIAPIKey,
		model:  model,
		client: &http.Client{},
	}, nil
}

// GenerateEmbedding generates an embedding using OpenAI API
func (c *OpenAIClient) GenerateEmbedding(ctx context.Context, text string) ([]float32, error) {
	requestBody := map[string]interface{}{
		"model": c.model,
		"input": text,
	}

	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", "https://api.openai.com/v1/embeddings", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.apiKey))

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API request failed with status: %d", resp.StatusCode)
	}

	var response struct {
		Data []struct {
			Embedding []float32 `json:"embedding"`
		} `json:"data"`
		Usage struct {
			TotalTokens int `json:"total_tokens"`
		} `json:"usage"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	if len(response.Data) == 0 {
		return nil, fmt.Errorf("no embedding data returned from OpenAI API")
	}

	embedding := response.Data[0].Embedding
	fmt.Printf("DEBUG: Generated embedding with %d dimensions using model %s\n", len(embedding), c.model)

	return embedding, nil
}
