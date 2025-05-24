package middleware

import (
	"bytes"
	"io"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// RequestLogger creates a logging middleware using zap
func RequestLogger(logger *zap.Logger) gin.HandlerFunc {
	return gin.LoggerWithFormatter(func(param gin.LogFormatterParams) string {
		// Use zap for structured logging instead of the default formatter
		fields := []zap.Field{
			zap.String("method", param.Method),
			zap.String("path", param.Path),
			zap.String("protocol", param.Request.Proto),
			zap.Int("status_code", param.StatusCode),
			zap.Duration("latency", param.Latency),
			zap.String("client_ip", param.ClientIP),
			zap.String("user_agent", param.Request.UserAgent()),
		}

		if param.ErrorMessage != "" {
			fields = append(fields, zap.String("error", param.ErrorMessage))
		}

		// Log with appropriate level based on status code
		if param.StatusCode >= 500 {
			logger.Error("HTTP request", fields...)
		} else if param.StatusCode >= 400 {
			logger.Warn("HTTP request", fields...)
		} else {
			logger.Info("HTTP request", fields...)
		}

		return ""
	})
}

// DetailedRequestLogger creates a more detailed logging middleware
func DetailedRequestLogger(logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Start timer
		start := time.Now()
		path := c.Request.URL.Path
		raw := c.Request.URL.RawQuery

		// Read request body if needed (for debugging)
		var requestBody []byte
		if c.Request.Body != nil && shouldLogRequestBody(c.Request.Method, c.ContentType()) {
			requestBody, _ = io.ReadAll(c.Request.Body)
			c.Request.Body = io.NopCloser(bytes.NewBuffer(requestBody))
		}

		// Create response body writer
		writer := &responseBodyWriter{body: bytes.NewBufferString(""), ResponseWriter: c.Writer}
		c.Writer = writer

		// Process request
		c.Next()

		// Calculate latency
		latency := time.Since(start)

		// Get user information if available
		userID := c.GetString("user_id")

		fields := []zap.Field{
			zap.String("method", c.Request.Method),
			zap.String("path", path),
			zap.String("query", raw),
			zap.String("protocol", c.Request.Proto),
			zap.Int("status_code", c.Writer.Status()),
			zap.Duration("latency", latency),
			zap.String("client_ip", c.ClientIP()),
			zap.String("user_agent", c.Request.UserAgent()),
			zap.String("content_type", c.ContentType()),
			zap.Int("request_size", int(c.Request.ContentLength)),
			zap.Int("response_size", writer.body.Len()),
		}

		if userID != "" {
			fields = append(fields, zap.String("user_id", userID))
		}

		// Add request body for certain content types (be careful with sensitive data)
		if len(requestBody) > 0 && len(requestBody) < 1024 { // Limit body size
			fields = append(fields, zap.String("request_body", string(requestBody)))
		}

		// Log errors if any
		if len(c.Errors) > 0 {
			errors := make([]string, len(c.Errors))
			for i, err := range c.Errors {
				errors[i] = err.Error()
			}
			fields = append(fields, zap.Strings("errors", errors))
		}

		// Log with appropriate level
		if c.Writer.Status() >= 500 {
			logger.Error("HTTP request completed", fields...)
		} else if c.Writer.Status() >= 400 {
			logger.Warn("HTTP request completed", fields...)
		} else {
			logger.Info("HTTP request completed", fields...)
		}
	}
}

// SecurityLogger logs security-related events
func SecurityLogger(logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Log authentication attempts
		authHeader := c.GetHeader("Authorization")
		if authHeader != "" {
			logger.Info("Authentication attempt",
				zap.String("client_ip", c.ClientIP()),
				zap.String("user_agent", c.Request.UserAgent()),
				zap.String("path", c.Request.URL.Path),
				zap.String("method", c.Request.Method),
			)
		}

		c.Next()

		// Log authentication failures
		if c.Writer.Status() == 401 {
			logger.Warn("Authentication failed",
				zap.String("client_ip", c.ClientIP()),
				zap.String("user_agent", c.Request.UserAgent()),
				zap.String("path", c.Request.URL.Path),
				zap.String("method", c.Request.Method),
			)
		}

		// Log access to sensitive endpoints
		if isSensitiveEndpoint(c.Request.URL.Path) {
			userID := c.GetString("user_id")
			logger.Info("Sensitive endpoint access",
				zap.String("user_id", userID),
				zap.String("client_ip", c.ClientIP()),
				zap.String("path", c.Request.URL.Path),
				zap.String("method", c.Request.Method),
				zap.Int("status_code", c.Writer.Status()),
			)
		}
	}
}

// responseBodyWriter captures response body for logging
type responseBodyWriter struct {
	gin.ResponseWriter
	body *bytes.Buffer
}

// Write captures the response body
func (r responseBodyWriter) Write(b []byte) (int, error) {
	r.body.Write(b)
	return r.ResponseWriter.Write(b)
}

// shouldLogRequestBody determines if request body should be logged
func shouldLogRequestBody(method, contentType string) bool {
	// Only log for POST, PUT, PATCH requests
	if method != "POST" && method != "PUT" && method != "PATCH" {
		return false
	}

	// Don't log binary data or large files
	if contentType == "application/octet-stream" ||
		contentType == "multipart/form-data" ||
		contentType == "application/pdf" {
		return false
	}

	return true
}

// isSensitiveEndpoint checks if an endpoint is sensitive and should be logged
func isSensitiveEndpoint(path string) bool {
	sensitiveEndpoints := []string{
		"/api/health",
		"/api/documents",
		"/api/chat",
		"/api/dashboard",
	}

	for _, endpoint := range sensitiveEndpoints {
		if len(path) >= len(endpoint) && path[:len(endpoint)] == endpoint {
			return true
		}
	}

	return false
}

// PerformanceLogger logs performance metrics
func PerformanceLogger(logger *zap.Logger, slowThreshold time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()

		c.Next()

		latency := time.Since(start)

		// Log slow requests
		if latency > slowThreshold {
			logger.Warn("Slow request detected",
				zap.String("method", c.Request.Method),
				zap.String("path", c.Request.URL.Path),
				zap.Duration("latency", latency),
				zap.Duration("threshold", slowThreshold),
				zap.String("client_ip", c.ClientIP()),
				zap.String("user_id", c.GetString("user_id")),
			)
		}
	}
}
