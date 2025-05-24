package services

import (
	"context"
	"fmt"
	"strings"
	"time"

	"health-dashboard-backend/internal/config"
	"health-dashboard-backend/internal/models"
	"health-dashboard-backend/pkg/ai"
)

// AIAgent orchestrates AI-powered health analysis and chat
type AIAgent struct {
	healthService *HealthService
	ragService    *RAGService
	llmClient     ai.LLMClient
	cfg           *config.Config
}

// NewAIAgent creates a new AI agent
func NewAIAgent(healthService *HealthService, ragService *RAGService, llmClient ai.LLMClient, cfg *config.Config) *AIAgent {
	return &AIAgent{
		healthService: healthService,
		ragService:    ragService,
		llmClient:     llmClient,
		cfg:           cfg,
	}
}

// ProcessQuery processes a user query and generates a comprehensive response
func (a *AIAgent) ProcessQuery(ctx context.Context, userID string, query string) (*models.ChatResponse, error) {
	startTime := time.Now()

	// Analyze query intent
	intent := a.analyzeQueryIntent(query)

	// Gather relevant context based on intent
	healthContext, ragContext, err := a.gatherContext(ctx, userID, query, intent)
	if err != nil {
		return nil, fmt.Errorf("failed to gather context: %w", err)
	}

	// Generate response using LLM
	response, err := a.generateResponse(ctx, query, healthContext, ragContext)
	if err != nil {
		return nil, fmt.Errorf("failed to generate response: %w", err)
	}

	// Enrich response with structured data
	enrichedResponse := a.enrichResponse(response, healthContext, ragContext)
	enrichedResponse.ProcessingTime = time.Since(startTime).Milliseconds()

	return enrichedResponse, nil
}

// analyzeQueryIntent determines the type and intent of the user's query
func (a *AIAgent) analyzeQueryIntent(query string) models.QueryIntent {
	queryLower := strings.ToLower(query)

	// Health data queries
	healthKeywords := []string{"blood pressure", "heart rate", "weight", "glucose", "cholesterol", "trend", "history"}
	for _, keyword := range healthKeywords {
		if strings.Contains(queryLower, keyword) {
			return models.IntentHealthQuery
		}
	}

	// Document queries
	docKeywords := []string{"document", "report", "lab", "test", "results", "prescription"}
	for _, keyword := range docKeywords {
		if strings.Contains(queryLower, keyword) {
			return models.IntentDocumentQuery
		}
	}

	// Trend analysis
	trendKeywords := []string{"trend", "pattern", "change", "over time", "improving", "getting worse"}
	for _, keyword := range trendKeywords {
		if strings.Contains(queryLower, keyword) {
			return models.IntentTrendAnalysis
		}
	}

	// Recommendation queries
	recommendationKeywords := []string{"recommend", "suggest", "advice", "should i", "what can i"}
	for _, keyword := range recommendationKeywords {
		if strings.Contains(queryLower, keyword) {
			return models.IntentRecommendation
		}
	}

	return models.IntentGeneralQuery
}

// gatherContext collects relevant health data and document context
func (a *AIAgent) gatherContext(ctx context.Context, userID, query string, intent models.QueryIntent) ([]models.HealthContext, []models.RAGContext, error) {
	var healthContext []models.HealthContext
	var ragContext []models.RAGContext

	// Gather health data context if relevant
	if intent == models.IntentHealthQuery || intent == models.IntentTrendAnalysis || intent == models.IntentRecommendation {
		latestMetrics, err := a.healthService.GetLatestMetrics(userID)
		if err == nil {
			for metricType, metric := range latestMetrics {
				healthContext = append(healthContext, models.HealthContext{
					MetricType: metricType,
					Value:      metric.Value,
					Unit:       metric.Unit,
					Timestamp:  metric.Timestamp,
					Query:      query,
				})
			}
		}
	}

	// Gather document context if relevant
	if intent == models.IntentDocumentQuery || intent == models.IntentGeneralQuery {
		contexts, err := a.ragService.QueryRelevantContext(ctx, userID, query, 5)
		if err == nil {
			ragContext = contexts
		}
	}

	return healthContext, ragContext, nil
}

// generateResponse creates an AI response using the LLM
func (a *AIAgent) generateResponse(ctx context.Context, query string, healthContext []models.HealthContext, ragContext []models.RAGContext) (*models.ChatResponse, error) {
	// Build context strings
	healthContextStr := a.buildHealthContextString(healthContext)
	ragContextStr := a.buildRAGContextString(ragContext)

	// Create messages for the LLM
	messages := []ai.ChatMessage{
		{
			Role:    "system",
			Content: ai.GenerateSystemPrompt(),
		},
		{
			Role:    "user",
			Content: ai.GenerateRAGPrompt(query, healthContextStr, ragContextStr),
		},
	}

	// Generate response
	llmResponse, err := a.llmClient.GenerateResponse(ctx, messages, a.cfg.MaxTokens, a.cfg.Temperature)
	if err != nil {
		return nil, err
	}

	return &models.ChatResponse{
		ID:         generateResponseID(),
		Message:    llmResponse.Content,
		Timestamp:  time.Now(),
		TokensUsed: llmResponse.TokensUsed,
	}, nil
}

// enrichResponse adds structured data to the response
func (a *AIAgent) enrichResponse(response *models.ChatResponse, healthContext []models.HealthContext, ragContext []models.RAGContext) *models.ChatResponse {
	// Add health data references
	var healthData []models.HealthInfo
	for _, hc := range healthContext {
		healthInfo := models.HealthInfo{
			MetricType: hc.MetricType,
			Value:      hc.Value,
			Unit:       hc.Unit,
			Timestamp:  hc.Timestamp,
			IsNormal:   a.isHealthValueNormal(hc.MetricType, hc.Value),
		}
		healthData = append(healthData, healthInfo)
	}

	// Add document sources
	var sources []models.Source
	for _, rc := range ragContext {
		source := models.Source{
			DocumentID:   rc.DocumentID,
			DocumentName: "Health Document",
			ChunkID:      rc.ChunkID,
			Content:      rc.Content,
			Relevance:    rc.Score,
		}
		sources = append(sources, source)
	}

	response.HealthData = healthData
	response.Sources = sources

	return response
}

// buildHealthContextString creates a formatted string from health context
func (a *AIAgent) buildHealthContextString(healthContext []models.HealthContext) string {
	if len(healthContext) == 0 {
		return "No recent health data available."
	}

	var contextStr strings.Builder
	contextStr.WriteString("Recent Health Metrics:\n")

	for _, hc := range healthContext {
		contextStr.WriteString(fmt.Sprintf("- %s: %.2f %s (recorded on %s)\n",
			hc.MetricType, hc.Value, hc.Unit, hc.Timestamp.Format("2006-01-02")))
	}

	return contextStr.String()
}

// buildRAGContextString creates a formatted string from RAG context
func (a *AIAgent) buildRAGContextString(ragContext []models.RAGContext) string {
	if len(ragContext) == 0 {
		return "No relevant documents found."
	}

	var contextStr strings.Builder
	contextStr.WriteString("Relevant Document Context:\n")

	for i, rc := range ragContext {
		if i >= 3 { // Limit to top 3 contexts
			break
		}
		contextStr.WriteString(fmt.Sprintf("- Document %s: %s\n", rc.DocumentID, rc.Content[:min(200, len(rc.Content))]))
	}

	return contextStr.String()
}

// isHealthValueNormal checks if a health value is within normal range
func (a *AIAgent) isHealthValueNormal(metricType string, value float64) bool {
	if metricInfo, exists := models.SupportedMetrics[metricType]; exists {
		return metricInfo.IsWithinNormalRange(value)
	}
	return true // Default to normal if unknown metric
}

// GenerateHealthInsights generates personalized health insights
func (a *AIAgent) GenerateHealthInsights(ctx context.Context, userID string) ([]models.Metadata, error) {
	// Get health summary
	summary, err := a.healthService.GetHealthSummary(userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get health summary: %w", err)
	}

	// Generate insights using AI
	query := "Generate personalized health insights based on my recent health data and trends"
	healthContext := a.convertSummaryToHealthContext(summary)
	ragContext := []models.RAGContext{} // No document context for insights

	_, err = a.generateResponse(ctx, query, healthContext, ragContext)
	if err != nil {
		return nil, err
	}

	// Return placeholder insights
	return []models.Metadata{
		{
			QueryType:  "insights",
			Intent:     "generate_insights",
			Confidence: 0.8,
		},
	}, nil
}

// convertSummaryToHealthContext converts health summary to health context
func (a *AIAgent) convertSummaryToHealthContext(summary *models.HealthSummary) []models.HealthContext {
	var contexts []models.HealthContext
	for metricType, metric := range summary.Metrics {
		contexts = append(contexts, models.HealthContext{
			MetricType: metricType,
			Value:      metric.Value,
			Unit:       metric.Unit,
			Timestamp:  metric.Timestamp,
		})
	}
	return contexts
}

// generateResponseID generates a unique response ID
func generateResponseID() string {
	return "resp_" + time.Now().Format("20060102150405") + "_" + randomString(6)
}

// randomString generates a random string of given length
func randomString(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyz0123456789"
	result := make([]byte, length)
	for i := range result {
		result[i] = charset[time.Now().UnixNano()%int64(len(charset))]
	}
	return string(result)
}

// min returns the minimum of two integers
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
