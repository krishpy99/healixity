package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"health-dashboard-backend/internal/middleware"
	"health-dashboard-backend/internal/services"
)

// AuthHandler handles authentication-related requests
type AuthHandler struct {
	authService *services.AuthService
	logger      *zap.Logger
}

// NewAuthHandler creates a new auth handler
func NewAuthHandler(authService *services.AuthService, logger *zap.Logger) *AuthHandler {
	return &AuthHandler{
		authService: authService,
		logger:      logger,
	}
}

// GetCurrentUser returns the current authenticated user's information
func (h *AuthHandler) GetCurrentUser(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	user, err := h.authService.GetUserProfile(c.Request.Context(), userID)
	if err != nil {
		h.logger.Error("Failed to get user profile", zap.String("user_id", userID), zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user profile"})
		return
	}

	// Return sanitized user information
	response := gin.H{
		"id":         user.ID,
		"email":      "",
		"username":   "",
		"first_name": user.FirstName,
		"last_name":  user.LastName,
		"created_at": user.CreatedAt,
		"updated_at": user.UpdatedAt,
	}

	// Add email if available
	if len(user.EmailAddresses) > 0 {
		response["email"] = user.EmailAddresses[0].EmailAddress
	}

	// Add username if available
	if user.Username != nil {
		response["username"] = *user.Username
	}

	c.JSON(http.StatusOK, response)
}

// UpdateProfile updates the current user's profile metadata
func (h *AuthHandler) UpdateProfile(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var req struct {
		PublicMetadata map[string]interface{} `json:"public_metadata,omitempty"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Update user metadata
	updatedUser, err := h.authService.UpdateUserMetadata(c.Request.Context(), userID, req.PublicMetadata)
	if err != nil {
		h.logger.Error("Failed to update user metadata", zap.String("user_id", userID), zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update profile"})
		return
	}

	// Return sanitized user information
	response := gin.H{
		"id":         updatedUser.ID,
		"email":      "",
		"username":   "",
		"first_name": updatedUser.FirstName,
		"last_name":  updatedUser.LastName,
		"updated_at": updatedUser.UpdatedAt,
		"success":    true,
	}

	// Add email if available
	if len(updatedUser.EmailAddresses) > 0 {
		response["email"] = updatedUser.EmailAddresses[0].EmailAddress
	}

	// Add username if available
	if updatedUser.Username != nil {
		response["username"] = *updatedUser.Username
	}

	c.JSON(http.StatusOK, response)
}

// GetUserRoles returns the current user's roles
func (h *AuthHandler) GetUserRoles(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	roles, err := h.authService.GetUserRoles(c.Request.Context(), userID)
	if err != nil {
		h.logger.Error("Failed to get user roles", zap.String("user_id", userID), zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user roles"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"user_id": userID,
		"roles":   roles,
	})
}

// UpdateUserRoles updates the current user's roles (admin only)
func (h *AuthHandler) UpdateUserRoles(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Check if current user is admin (you might want to implement this check)
	isAdmin, err := h.authService.HasRole(c.Request.Context(), userID, "admin")
	if err != nil {
		h.logger.Error("Failed to check admin role", zap.String("user_id", userID), zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify permissions"})
		return
	}

	if !isAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
		return
	}

	var req struct {
		TargetUserID string   `json:"target_user_id" binding:"required"`
		Roles        []string `json:"roles" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Update target user's roles
	metadata := map[string]interface{}{
		"roles": req.Roles,
	}

	_, err = h.authService.UpdateUserMetadata(c.Request.Context(), req.TargetUserID, metadata)
	if err != nil {
		h.logger.Error("Failed to update user roles",
			zap.String("admin_user_id", userID),
			zap.String("target_user_id", req.TargetUserID),
			zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user roles"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"target_user_id": req.TargetUserID,
		"roles":          req.Roles,
		"success":        true,
	})
}

// CheckAuth checks if the user is authenticated and returns their basic info
func (h *AuthHandler) CheckAuth(c *gin.Context) {
	userID := middleware.GetUserID(c)
	isAuthenticated := middleware.IsAuthenticated(c)

	if !isAuthenticated || userID == "" {
		c.JSON(http.StatusOK, gin.H{
			"authenticated": false,
			"user":          nil,
		})
		return
	}

	// Get basic user info
	user, err := h.authService.GetUserProfile(c.Request.Context(), userID)
	if err != nil {
		h.logger.Error("Failed to get user profile for auth check", zap.String("user_id", userID), zap.Error(err))
		c.JSON(http.StatusOK, gin.H{
			"authenticated": false,
			"user":          nil,
		})
		return
	}

	// Return basic user info
	userInfo := gin.H{
		"id":         user.ID,
		"first_name": user.FirstName,
		"last_name":  user.LastName,
	}

	// Add email if available
	if len(user.EmailAddresses) > 0 {
		userInfo["email"] = user.EmailAddresses[0].EmailAddress
	}

	// Add username if available
	if user.Username != nil {
		userInfo["username"] = *user.Username
	}

	c.JSON(http.StatusOK, gin.H{
		"authenticated": true,
		"user":          userInfo,
	})
}
