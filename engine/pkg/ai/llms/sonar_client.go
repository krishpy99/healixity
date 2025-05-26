package llms

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"health-dashboard-backend/internal/config"
	"health-dashboard-backend/pkg/ai"
)

// SonarClient implements LLMClient for Perplexity's Sonar API
type SonarClient struct {
	apiKey string
	model  string
	client *http.Client
}

// NewSonarClient creates a new Sonar client
func NewSonarClient(cfg *config.Config) (*SonarClient, error) {
	if cfg.SonarAPIKey == "" {
		return nil, fmt.Errorf("Sonar API key is required")
	}

	return &SonarClient{
		apiKey: cfg.SonarAPIKey,
		model:  cfg.ChatModel,
		client: &http.Client{},
	}, nil
}

// GenerateResponse generates a response using Sonar API
func (s *SonarClient) GenerateResponse(ctx context.Context, messages []ai.ChatMessage, maxTokens int, temperature float32) (*ai.ChatResponse, error) {
	requestBody := map[string]interface{}{
		"model":    s.model,
		"messages": messages,
	}

	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", "https://api.perplexity.ai/chat/completions", strings.NewReader(string(jsonData)))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.apiKey))

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API request failed with status: %d", resp.StatusCode)
	}

	var response struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
			FinishReason string `json:"finish_reason"`
		} `json:"choices"`
		Usage struct {
			TotalTokens int `json:"total_tokens"`
		} `json:"usage"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	if len(response.Choices) == 0 {
		return nil, fmt.Errorf("no response choices returned from Sonar API")
	}

	choice := response.Choices[0]
	return &ai.ChatResponse{
		Content:      choice.Message.Content,
		TokensUsed:   response.Usage.TotalTokens,
		FinishReason: choice.FinishReason,
	}, nil
}

// HealthCheck checks if Sonar API is accessible
func (s *SonarClient) HealthCheck(ctx context.Context) error {
	// Simple health check by sending a minimal request
	messages := []ai.ChatMessage{
		{
			Role:    "system",
			Content: "Be precise and concise.",
		},
		{
			Role:    "user",
			Content: "Hello",
		},
	}

	_, err := s.GenerateResponse(ctx, messages, 10, 0.7)
	return err
}
