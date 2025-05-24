package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"go.uber.org/zap"

	"health-dashboard-backend/internal/middleware"
	"health-dashboard-backend/internal/models"
	"health-dashboard-backend/internal/services"
	"health-dashboard-backend/internal/utils"
)

// ChatHandler handles chat endpoints
type ChatHandler struct {
	aiAgent  *services.AIAgent
	logger   *zap.Logger
	upgrader websocket.Upgrader
	sessions map[string]*ChatSession
}

// ChatSession represents an active chat session
type ChatSession struct {
	UserID     string
	SessionID  string
	Connection *websocket.Conn
	Messages   []models.ChatMessage
	LastActive time.Time
}

// NewChatHandler creates a new chat handler
func NewChatHandler(aiAgent *services.AIAgent, logger *zap.Logger) *ChatHandler {
	upgrader := websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			// In production, implement proper origin checking
			return true
		},
	}

	return &ChatHandler{
		aiAgent:  aiAgent,
		logger:   logger,
		upgrader: upgrader,
		sessions: make(map[string]*ChatSession),
	}
}

// ProcessQuery handles POST /api/chat
func (ch *ChatHandler) ProcessQuery(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == "" {
		utils.ErrorResponse(c, http.StatusUnauthorized, "User not authenticated")
		return
	}

	var request models.ChatRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		ch.logger.Error("Failed to bind chat request", zap.Error(err))
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request format")
		return
	}

	// Validate request
	if request.Message == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Message is required")
		return
	}

	// Process query with AI agent
	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
	defer cancel()

	response, err := ch.aiAgent.ProcessQuery(ctx, userID, request.Message)
	if err != nil {
		ch.logger.Error("Failed to process chat query",
			zap.String("user_id", userID),
			zap.String("message", request.Message),
			zap.Error(err))
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to process query")
		return
	}

	// Set session ID if provided
	if request.SessionID != "" {
		response.SessionID = request.SessionID
	} else {
		response.SessionID = generateSessionID()
	}

	ch.logger.Info("Chat query processed successfully",
		zap.String("user_id", userID),
		zap.String("session_id", response.SessionID),
		zap.Int("tokens_used", response.TokensUsed))

	utils.SuccessResponse(c, http.StatusOK, "Query processed successfully", response)
}

// GetChatHistory handles GET /api/chat/history
func (ch *ChatHandler) GetChatHistory(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == "" {
		utils.ErrorResponse(c, http.StatusUnauthorized, "User not authenticated")
		return
	}

	sessionID := c.Query("session_id")
	limit := c.DefaultQuery("limit", "50")

	// For now, return placeholder history
	// In a production system, you'd store and retrieve from a database
	history := &models.ChatHistory{
		UserID:     userID,
		Sessions:   []models.ChatSession{},
		TotalCount: 0,
		HasMore:    false,
	}

	ch.logger.Info("Chat history retrieved",
		zap.String("user_id", userID),
		zap.String("session_id", sessionID),
		zap.String("limit", limit))

	utils.SuccessResponse(c, http.StatusOK, "Chat history retrieved successfully", history)
}

// HandleWebSocket handles WebSocket connections for real-time chat
func (ch *ChatHandler) HandleWebSocket(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Upgrade connection to WebSocket
	conn, err := ch.upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		ch.logger.Error("Failed to upgrade to WebSocket",
			zap.String("user_id", userID),
			zap.Error(err))
		return
	}
	defer conn.Close()

	// Create session
	sessionID := generateSessionID()
	session := &ChatSession{
		UserID:     userID,
		SessionID:  sessionID,
		Connection: conn,
		Messages:   make([]models.ChatMessage, 0),
		LastActive: time.Now(),
	}

	// Store session
	ch.sessions[sessionID] = session

	ch.logger.Info("WebSocket connection established",
		zap.String("user_id", userID),
		zap.String("session_id", sessionID))

	// Send welcome message
	welcomeMsg := models.WebSocketMessage{
		Type:      "connected",
		Data:      gin.H{"message": "Connected to health assistant", "session_id": sessionID},
		Timestamp: time.Now(),
		SessionID: sessionID,
	}

	if err := conn.WriteJSON(welcomeMsg); err != nil {
		ch.logger.Error("Failed to send welcome message", zap.Error(err))
		return
	}

	// Handle messages
	ch.handleWebSocketMessages(session)

	// Cleanup session when connection closes
	delete(ch.sessions, sessionID)
	ch.logger.Info("WebSocket connection closed",
		zap.String("user_id", userID),
		zap.String("session_id", sessionID))
}

// handleWebSocketMessages processes incoming WebSocket messages
func (ch *ChatHandler) handleWebSocketMessages(session *ChatSession) {
	for {
		var wsMessage models.WebSocketMessage
		err := session.Connection.ReadJSON(&wsMessage)
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				ch.logger.Error("WebSocket error", zap.Error(err))
			}
			break
		}

		session.LastActive = time.Now()

		switch wsMessage.Type {
		case "message":
			ch.handleChatMessage(session, wsMessage)
		case "typing":
			ch.handleTypingIndicator(session, wsMessage)
		default:
			ch.logger.Warn("Unknown WebSocket message type",
				zap.String("type", wsMessage.Type),
				zap.String("session_id", session.SessionID))
		}
	}
}

// handleChatMessage processes a chat message via WebSocket
func (ch *ChatHandler) handleChatMessage(session *ChatSession, wsMessage models.WebSocketMessage) {
	// Extract message from WebSocket data
	data, ok := wsMessage.Data.(map[string]interface{})
	if !ok {
		ch.sendError(session, "Invalid message format")
		return
	}

	message, ok := data["message"].(string)
	if !ok || message == "" {
		ch.sendError(session, "Message is required")
		return
	}

	// Send typing indicator
	ch.sendTypingIndicator(session, true)

	// Process with AI agent
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	response, err := ch.aiAgent.ProcessQuery(ctx, session.UserID, message)
	if err != nil {
		ch.logger.Error("Failed to process WebSocket chat query",
			zap.String("user_id", session.UserID),
			zap.String("session_id", session.SessionID),
			zap.Error(err))
		ch.sendError(session, "Failed to process message")
		return
	}

	// Stop typing indicator
	ch.sendTypingIndicator(session, false)

	// Send response
	response.SessionID = session.SessionID
	responseMsg := models.WebSocketMessage{
		Type:      "message",
		Data:      response,
		Timestamp: time.Now(),
		SessionID: session.SessionID,
	}

	if err := session.Connection.WriteJSON(responseMsg); err != nil {
		ch.logger.Error("Failed to send WebSocket response", zap.Error(err))
		return
	}

	// Store messages in session
	userMsg := models.NewChatMessage(session.UserID, "user", message)
	assistantMsg := models.NewChatMessage(session.UserID, "assistant", response.Message)
	session.Messages = append(session.Messages, *userMsg, *assistantMsg)
}

// handleTypingIndicator handles typing indicator messages
func (ch *ChatHandler) handleTypingIndicator(session *ChatSession, wsMessage models.WebSocketMessage) {
	// Echo typing indicator back to user if needed
	// In a multi-user chat, you'd broadcast to other users
}

// sendTypingIndicator sends a typing indicator to the client
func (ch *ChatHandler) sendTypingIndicator(session *ChatSession, isTyping bool) {
	indicator := models.WebSocketMessage{
		Type: "typing",
		Data: models.TypingIndicator{
			IsTyping: isTyping,
			UserID:   "assistant",
		},
		Timestamp: time.Now(),
		SessionID: session.SessionID,
	}

	session.Connection.WriteJSON(indicator)
}

// sendError sends an error message via WebSocket
func (ch *ChatHandler) sendError(session *ChatSession, message string) {
	errorMsg := models.WebSocketMessage{
		Type: "error",
		Data: models.ErrorMessage{
			Code:    400,
			Message: message,
		},
		Timestamp: time.Now(),
		SessionID: session.SessionID,
	}

	session.Connection.WriteJSON(errorMsg)
}

// generateSessionID generates a unique session ID
func generateSessionID() string {
	return "sess_" + time.Now().Format("20060102150405") + "_" + randomStringChat(8)
}

// randomStringChat generates a random string for chat sessions
func randomStringChat(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyz0123456789"
	result := make([]byte, length)
	for i := range result {
		result[i] = charset[time.Now().UnixNano()%int64(len(charset))]
	}
	return string(result)
}
