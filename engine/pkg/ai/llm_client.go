package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"health-dashboard-backend/internal/config"
)

// LLMClient interface for different LLM providers
type LLMClient interface {
	GenerateResponse(ctx context.Context, messages []ChatMessage, maxTokens int, temperature float32) (*ChatResponse, error)
	GenerateEmbedding(ctx context.Context, text string) ([]float32, error)
	HealthCheck(ctx context.Context) error
}

// ChatMessage represents a chat message for the LLM
type ChatMessage struct {
	Role    string `json:"role"` // "system", "user", "assistant"
	Content string `json:"content"`
}

// ChatResponse represents the LLM's response
type ChatResponse struct {
	Content      string `json:"content"`
	TokensUsed   int    `json:"tokens_used"`
	FinishReason string `json:"finish_reason"`
}

// SonarClient implements LLMClient for Perplexity's Sonar API
type SonarClient struct {
	apiKey string
	model  string
	client *http.Client
}

// NewLLMClient creates a new LLM client based on the provider
func NewLLMClient(cfg *config.Config) (LLMClient, error) {
	if cfg.LLMProvider != "sonar" {
		return nil, fmt.Errorf("unsupported LLM provider: %s", cfg.LLMProvider)
	}
	return NewSonarClient(cfg)
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
func (s *SonarClient) GenerateResponse(ctx context.Context, messages []ChatMessage, maxTokens int, temperature float32) (*ChatResponse, error) {
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
	return &ChatResponse{
		Content:      choice.Message.Content,
		TokensUsed:   response.Usage.TotalTokens,
		FinishReason: choice.FinishReason,
	}, nil
}

// GenerateEmbedding generates an embedding using Sonar API
func (s *SonarClient) GenerateEmbedding(ctx context.Context, text string) ([]float32, error) {
	// TODO: Implement if Sonar API provides embedding functionality
	return nil, fmt.Errorf("embeddings not supported by Sonar API")
}

// HealthCheck checks if Sonar API is accessible
func (s *SonarClient) HealthCheck(ctx context.Context) error {
	// Simple health check by sending a minimal request
	messages := []ChatMessage{
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

// GenerateSystemPrompt creates a system prompt for health-related queries
func GenerateSystemPrompt() string {
	return `You are a knowledgeable health assistant with access to the user's health data and uploaded medical documents. Your role is to:

1. Provide accurate, evidence-based health information
2. Help users understand their health metrics and trends
3. Answer questions about their medical documents
4. Offer general wellness advice
5. Identify patterns in health data

Important guidelines:
- Always emphasize that you're not a replacement for professional medical advice
- Encourage users to consult healthcare providers for serious concerns
- Use the available tools to fetch relevant health data and document context
- Be empathetic and supportive while being informative
- If health metrics are concerning, gently suggest medical consultation
- Respect user privacy and only access data relevant to their queries

Available tools:
- fetch_health_data: Get user's health metrics and trends
- query_rag_context: Search through uploaded medical documents
- analyze_trends: Analyze patterns in health data
- generate_insights: Provide personalized health insights

Please be helpful, accurate, and caring in your responses.`
}

// GenerateRAGPrompt creates a prompt for RAG-enhanced responses
func GenerateRAGPrompt(userQuery string, healthContext string, documentContext string) string {
	prompt := fmt.Sprintf(`Based on the user's query and the available context, provide a comprehensive response.

User Query: %s

Health Data Context:
%s

Document Context:
%s

Please provide a helpful response that:
1. Directly addresses the user's question
2. References relevant information from their health data
3. Incorporates insights from their uploaded documents
4. Offers actionable advice when appropriate
5. Maintains a supportive and informative tone

Remember to always recommend consulting with healthcare professionals for medical decisions.`, userQuery, healthContext, documentContext)

	return prompt
}
