package utils

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// APIResponse represents a standard API response
type APIResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
	Error   interface{} `json:"error,omitempty"`
}

// SuccessResponse sends a successful API response
func SuccessResponse(c *gin.Context, statusCode int, message string, data interface{}) {
	c.JSON(statusCode, APIResponse{
		Success: true,
		Message: message,
		Data:    data,
	})
}

// ErrorResponse sends an error API response
func ErrorResponse(c *gin.Context, statusCode int, message string) {
	c.JSON(statusCode, APIResponse{
		Success: false,
		Message: message,
		Error:   message,
	})
}

// ErrorResponseWithDetails sends an error API response with detailed error information
func ErrorResponseWithDetails(c *gin.Context, statusCode int, message string, errorDetails interface{}) {
	c.JSON(statusCode, APIResponse{
		Success: false,
		Message: message,
		Error:   errorDetails,
	})
}

// ValidationErrorResponse sends a validation error response
func ValidationErrorResponse(c *gin.Context, errors map[string]string) {
	c.JSON(http.StatusBadRequest, APIResponse{
		Success: false,
		Message: "Validation failed",
		Error:   errors,
	})
}

// PaginatedResponse represents a paginated API response
type PaginatedResponse struct {
	Success    bool        `json:"success"`
	Message    string      `json:"message"`
	Data       interface{} `json:"data"`
	Pagination Pagination  `json:"pagination"`
}

// Pagination represents pagination metadata
type Pagination struct {
	CurrentPage int    `json:"current_page"`
	TotalPages  int    `json:"total_pages"`
	TotalCount  int    `json:"total_count"`
	HasNext     bool   `json:"has_next"`
	HasPrevious bool   `json:"has_previous"`
	NextCursor  string `json:"next_cursor,omitempty"`
	PrevCursor  string `json:"prev_cursor,omitempty"`
}

// PaginatedSuccessResponse sends a paginated successful API response
func PaginatedSuccessResponse(c *gin.Context, statusCode int, message string, data interface{}, pagination Pagination) {
	c.JSON(statusCode, PaginatedResponse{
		Success:    true,
		Message:    message,
		Data:       data,
		Pagination: pagination,
	})
}

// HealthCheckResponse sends a health check response
func HealthCheckResponse(c *gin.Context, healthy bool, services map[string]bool) {
	statusCode := http.StatusOK
	message := "Service is healthy"

	if !healthy {
		statusCode = http.StatusServiceUnavailable
		message = "Service is unhealthy"
	}

	c.JSON(statusCode, gin.H{
		"success":  healthy,
		"message":  message,
		"services": services,
		"timestamp": gin.H{
			"utc": gin.H{
				"timestamp": gin.H{},
			},
		},
	})
}
