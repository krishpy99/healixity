package ai

import (
	"context"
)

// LLMClient interface for different LLM providers
type LLMClient interface {
	GenerateResponse(ctx context.Context, messages []ChatMessage, maxTokens int, temperature float32) (*ChatResponse, error)
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
