package models

import (
	"time"
)

// ChatMessage represents a single message in a conversation
type ChatMessage struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	Role      string    `json:"role"` // "user" or "assistant"
	Content   string    `json:"content"`
	Timestamp time.Time `json:"timestamp"`
	Metadata  Metadata  `json:"metadata,omitempty"`
}

// ChatRequest represents a chat request from the user
type ChatRequest struct {
	Message   string            `json:"message" binding:"required"`
	SessionID string            `json:"session_id,omitempty"`
	Context   map[string]string `json:"context,omitempty"`
	MaxTokens int               `json:"max_tokens,omitempty"`
	Stream    bool              `json:"stream,omitempty"`
}

// ChatResponse represents the AI's response
type ChatResponse struct {
	ID             string       `json:"id"`
	Message        string       `json:"message"`
	SessionID      string       `json:"session_id"`
	Sources        []Source     `json:"sources,omitempty"`
	HealthData     []HealthInfo `json:"health_data,omitempty"`
	Suggestions    []string     `json:"suggestions,omitempty"`
	Timestamp      time.Time    `json:"timestamp"`
	TokensUsed     int          `json:"tokens_used,omitempty"`
	ProcessingTime int64        `json:"processing_time_ms,omitempty"`
}

// Source represents a source document used in the response
type Source struct {
	DocumentID   string  `json:"document_id"`
	DocumentName string  `json:"document_name"`
	ChunkID      string  `json:"chunk_id"`
	Content      string  `json:"content"`
	Relevance    float32 `json:"relevance"`
	PageNumber   int     `json:"page_number,omitempty"`
}

// HealthInfo represents health data referenced in the response
type HealthInfo struct {
	MetricType string    `json:"metric_type"`
	Value      float64   `json:"value"`
	Unit       string    `json:"unit"`
	Timestamp  time.Time `json:"timestamp"`
	Trend      string    `json:"trend,omitempty"`
	IsNormal   bool      `json:"is_normal"`
}

// Metadata contains additional information about the message
type Metadata struct {
	ToolsUsed     []string          `json:"tools_used,omitempty"`
	QueryType     string            `json:"query_type,omitempty"`
	Intent        string            `json:"intent,omitempty"`
	Confidence    float32           `json:"confidence,omitempty"`
	RAGContext    []RAGContext      `json:"rag_context,omitempty"`
	HealthContext []HealthContext   `json:"health_context,omitempty"`
	Errors        []string          `json:"errors,omitempty"`
	Debug         map[string]string `json:"debug,omitempty"`
}

// RAGContext represents context retrieved from documents
type RAGContext struct {
	DocumentID string  `json:"document_id"`
	ChunkID    string  `json:"chunk_id"`
	Content    string  `json:"content"`
	Score      float32 `json:"score"`
}

// HealthContext represents health data context
type HealthContext struct {
	MetricType string    `json:"metric_type"`
	Value      float64   `json:"value"`
	Unit       string    `json:"unit"`
	Timestamp  time.Time `json:"timestamp"`
	Query      string    `json:"query"`
}

// ChatSession represents a conversation session
type ChatSession struct {
	SessionID    string            `json:"session_id"`
	UserID       string            `json:"user_id"`
	StartTime    time.Time         `json:"start_time"`
	LastActive   time.Time         `json:"last_active"`
	MessageCount int               `json:"message_count"`
	Messages     []ChatMessage     `json:"messages"`
	Context      map[string]string `json:"context,omitempty"`
}

// WebSocketMessage represents a WebSocket message
type WebSocketMessage struct {
	Type      string      `json:"type"` // "message", "typing", "error", "connected", "disconnected"
	Data      interface{} `json:"data"`
	Timestamp time.Time   `json:"timestamp"`
	SessionID string      `json:"session_id,omitempty"`
}

// TypingIndicator represents typing status
type TypingIndicator struct {
	IsTyping bool   `json:"is_typing"`
	UserID   string `json:"user_id"`
}

// ErrorMessage represents an error in WebSocket communication
type ErrorMessage struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Details string `json:"details,omitempty"`
}

// StreamChunk represents a chunk of streamed response
type StreamChunk struct {
	ID      string `json:"id"`
	Content string `json:"content"`
	Done    bool   `json:"done"`
}

// ChatHistory represents chat history for a user
type ChatHistory struct {
	UserID     string        `json:"user_id"`
	Sessions   []ChatSession `json:"sessions"`
	TotalCount int           `json:"total_count"`
	HasMore    bool          `json:"has_more"`
	NextCursor string        `json:"next_cursor,omitempty"`
}

// QueryIntent represents different types of user queries
type QueryIntent string

const (
	IntentHealthQuery    QueryIntent = "health_query"
	IntentDocumentQuery  QueryIntent = "document_query"
	IntentGeneralQuery   QueryIntent = "general_query"
	IntentDataEntry      QueryIntent = "data_entry"
	IntentTrendAnalysis  QueryIntent = "trend_analysis"
	IntentRecommendation QueryIntent = "recommendation"
)

// ToolName represents AI agent tools
type ToolName string

const (
	ToolFetchHealthData  ToolName = "fetch_health_data"
	ToolQueryRAGContext  ToolName = "query_rag_context"
	ToolAnalyzeTrends    ToolName = "analyze_trends"
	ToolGenerateInsights ToolName = "generate_insights"
	ToolSearchDocuments  ToolName = "search_documents"
)

// ToolCall represents a call to an AI agent tool
type ToolCall struct {
	Name       ToolName               `json:"name"`
	Parameters map[string]interface{} `json:"parameters"`
	Result     interface{}            `json:"result,omitempty"`
	Error      string                 `json:"error,omitempty"`
	Duration   int64                  `json:"duration_ms,omitempty"`
}

// NewChatMessage creates a new chat message
func NewChatMessage(userID, role, content string) *ChatMessage {
	return &ChatMessage{
		ID:        generateMessageID(),
		UserID:    userID,
		Role:      role,
		Content:   content,
		Timestamp: time.Now(),
		Metadata:  Metadata{},
	}
}

// NewChatSession creates a new chat session
func NewChatSession(userID string) *ChatSession {
	return &ChatSession{
		SessionID:    generateSessionID(),
		UserID:       userID,
		StartTime:    time.Now(),
		LastActive:   time.Now(),
		MessageCount: 0,
		Messages:     make([]ChatMessage, 0),
		Context:      make(map[string]string),
	}
}

// AddMessage adds a message to the chat session
func (cs *ChatSession) AddMessage(message *ChatMessage) {
	cs.Messages = append(cs.Messages, *message)
	cs.MessageCount++
	cs.LastActive = time.Now()
}

// GetRecentMessages returns the most recent messages (for context)
func (cs *ChatSession) GetRecentMessages(limit int) []ChatMessage {
	if len(cs.Messages) <= limit {
		return cs.Messages
	}
	return cs.Messages[len(cs.Messages)-limit:]
}

// generateMessageID generates a unique message ID
func generateMessageID() string {
	// Using simple timestamp-based ID for now
	// In production, use UUID or similar
	return "msg_" + time.Now().Format("20060102150405") + "_" + randomString(6)
}

// generateSessionID generates a unique session ID
func generateSessionID() string {
	// Using simple timestamp-based ID for now
	// In production, use UUID or similar
	return "sess_" + time.Now().Format("20060102150405") + "_" + randomString(8)
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
