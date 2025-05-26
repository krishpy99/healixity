package main

import (
	"context"
	"fmt"
	"log"

	"health-dashboard-backend/internal/config"
	"health-dashboard-backend/internal/services"
	"health-dashboard-backend/pkg/ai"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Create AI client factory
	factory := services.NewAIClientFactory(cfg)

	// Example 1: Using LLM Client (Sonar)
	fmt.Println("=== LLM Client Example ===")
	llmClient, err := factory.CreateLLMClient()
	if err != nil {
		log.Printf("Failed to create LLM client: %v", err)
	} else {
		// Test LLM client
		messages := []ai.ChatMessage{
			{
				Role:    "system",
				Content: "You are a helpful health assistant.",
			},
			{
				Role:    "user",
				Content: "What are the benefits of regular exercise?",
			},
		}

		ctx := context.Background()
		response, err := llmClient.GenerateResponse(ctx, messages, 100, 0.7)
		if err != nil {
			log.Printf("LLM request failed: %v", err)
		} else {
			fmt.Printf("LLM Response: %s\n", response.Content)
			fmt.Printf("Tokens used: %d\n", response.TokensUsed)
		}
	}

	// Example 2: Using Embedding Client (OpenAI)
	fmt.Println("\n=== Embedding Client Example ===")
	embeddingClient, err := factory.CreateEmbeddingClient()
	if err != nil {
		log.Printf("Failed to create embedding client: %v", err)
	} else {
		// Test embedding client
		text := "Regular exercise improves cardiovascular health and mental wellbeing."
		ctx := context.Background()
		embedding, err := embeddingClient.GenerateEmbedding(ctx, text)
		if err != nil {
			log.Printf("Embedding request failed: %v", err)
		} else {
			fmt.Printf("Generated embedding with %d dimensions\n", len(embedding))
			fmt.Printf("First 5 values: %v\n", embedding[:5])
		}
	}

	// Example 3: Using both clients together (RAG-like scenario)
	fmt.Println("\n=== Combined Usage Example ===")
	if llmClient != nil && embeddingClient != nil {
		// This would be a typical RAG workflow:
		// 1. Generate embedding for user query
		// 2. Search vector database (not shown here)
		// 3. Use LLM to generate response with context

		userQuery := "How does sleep affect my health?"

		// Generate embedding for the query
		queryEmbedding, err := embeddingClient.GenerateEmbedding(context.Background(), userQuery)
		if err != nil {
			log.Printf("Failed to generate query embedding: %v", err)
		} else {
			fmt.Printf("Query embedding generated (%d dimensions)\n", len(queryEmbedding))

			// In a real scenario, you would:
			// - Use the embedding to search your vector database
			// - Retrieve relevant document chunks
			// - Include those chunks in the LLM prompt

			// For this example, we'll just use the LLM directly
			messages := []ai.ChatMessage{
				{
					Role:    "system",
					Content: ai.GenerateSystemPrompt(),
				},
				{
					Role:    "user",
					Content: userQuery,
				},
			}

			response, err := llmClient.GenerateResponse(context.Background(), messages, 200, 0.7)
			if err != nil {
				log.Printf("Failed to generate LLM response: %v", err)
			} else {
				fmt.Printf("LLM Response: %s\n", response.Content)
			}
		}
	}

	fmt.Println("\n=== Example Complete ===")
}
