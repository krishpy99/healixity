package middleware

import (
	"net/http"
	"strings"

	"github.com/clerk/clerk-sdk-go/v2"
	clerkhttp "github.com/clerk/clerk-sdk-go/v2/http"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"

	"health-dashboard-backend/internal/config"
)

// InitClerk initializes the Clerk client with the secret key
func InitClerk(secretKey string) {
	clerk.SetKey(secretKey)
}

// ClerkAuth middleware that checks for authentication but doesn't require it
func ClerkAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Create a wrapper to convert Gin context to standard HTTP
		handler := clerkhttp.WithHeaderAuthorization()(
			http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				// Check if user is authenticated
				if claims, ok := clerk.SessionClaimsFromContext(r.Context()); ok {
					// Add user info to Gin context
					c.Set("user_id", claims.Subject)
					c.Set("session_claims", claims)
					c.Set("authenticated", true)
				} else {
					c.Set("authenticated", false)
				}
			}),
		)

		// Create a new request with the Gin context
		newReq := c.Request.WithContext(c.Request.Context())
		handler.ServeHTTP(c.Writer, newReq)

		// Continue to next middleware/handler
		c.Next()
	}
}

// RequireAuth middleware that requires valid Clerk authentication
func RequireAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Create a wrapper to convert Gin context to standard HTTP
		handler := clerkhttp.RequireHeaderAuthorization()(
			http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if claims, ok := clerk.SessionClaimsFromContext(r.Context()); ok {
					c.Set("user_id", claims.Subject)
					c.Set("session_claims", claims)
					c.Set("authenticated", true)
				} else {
					c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
					c.Abort()
					return
				}
			}),
		)

		// Create a new request with the Gin context
		newReq := c.Request.WithContext(c.Request.Context())
		handler.ServeHTTP(c.Writer, newReq)

		// Only continue if authentication was successful
		if authenticated, exists := c.Get("authenticated"); !exists || !authenticated.(bool) {
			return
		}

		c.Next()
	}
}

// GetUserID extracts user ID from gin context (compatible with existing code)
func GetUserID(c *gin.Context) string {
	userID, exists := c.Get("user_id")
	if !exists {
		return ""
	}

	if uid, ok := userID.(string); ok {
		return uid
	}

	return ""
}

// GetSessionClaims extracts Clerk session claims from gin context
func GetSessionClaims(c *gin.Context) (*clerk.SessionClaims, bool) {
	claims, exists := c.Get("session_claims")
	if !exists {
		return nil, false
	}

	if sessionClaims, ok := claims.(*clerk.SessionClaims); ok {
		return sessionClaims, true
	}

	return nil, false
}

// IsAuthenticated checks if the current request is authenticated
func IsAuthenticated(c *gin.Context) bool {
	authenticated, exists := c.Get("authenticated")
	if !exists {
		return false
	}

	if auth, ok := authenticated.(bool); ok {
		return auth
	}

	return false
}

// AuthWebSocket validates JWT tokens for WebSocket connections
// Note: For WebSocket with Clerk, you'll need to pass the session token as a query parameter
func AuthWebSocket() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get token from query parameter for WebSocket
		tokenString := c.Query("token")
		if tokenString == "" {
			// Try to get from header as fallback
			authHeader := c.GetHeader("Authorization")
			if strings.HasPrefix(authHeader, "Bearer ") {
				tokenString = authHeader[7:]
			}
		}

		if tokenString == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Token required for WebSocket connection"})
			c.Abort()
			return
		}

		// Verify the session token with Clerk
		// Note: You may need to implement custom token verification for WebSocket
		// For now, we'll create a dummy request to validate the token
		req, _ := http.NewRequest("GET", "/", nil)
		req.Header.Set("Authorization", "Bearer "+tokenString)

		// Use Clerk's verification
		handler := clerkhttp.RequireHeaderAuthorization()(
			http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if claims, ok := clerk.SessionClaimsFromContext(r.Context()); ok {
					c.Set("user_id", claims.Subject)
					c.Set("session_claims", claims)
					c.Set("authenticated", true)
				} else {
					c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
					c.Abort()
					return
				}
			}),
		)

		// Create a response writer that doesn't actually write
		nopWriter := &nopResponseWriter{}
		handler.ServeHTTP(nopWriter, req)

		// Check if authentication was successful
		if !IsAuthenticated(c) {
			return
		}

		c.Next()
	}
}

// nopResponseWriter is a response writer that doesn't actually write anything
type nopResponseWriter struct {
	header http.Header
}

func (w *nopResponseWriter) Header() http.Header {
	if w.header == nil {
		w.header = make(http.Header)
	}
	return w.header
}

func (w *nopResponseWriter) Write([]byte) (int, error) {
	return 0, nil
}

func (w *nopResponseWriter) WriteHeader(statusCode int) {}

// OptionalAuth middleware that doesn't require authentication but sets user if present
func OptionalAuth() gin.HandlerFunc {
	return ClerkAuth() // ClerkAuth already handles optional authentication
}

// RequireRole middleware that requires specific roles (placeholder for future implementation)
func RequireRole(allowedRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// This would check if user has required roles
		// Implementation depends on your role system in Clerk
		// You can use public metadata or private metadata for roles
		c.Next()
	}
}

// Legacy function compatibility - kept for backward compatibility with existing handlers
func GetUserEmail(c *gin.Context) string {
	// Note: Email is not directly available in SessionClaims
	// To get user details like email, you would need to call the Clerk User API
	// using the user ID from the session claims
	return ""
}

// Legacy function compatibility - kept for backward compatibility with existing handlers
func GetUserUsername(c *gin.Context) string {
	// Note: Username is not directly available in SessionClaims
	// To get user details like username, you would need to call the Clerk User API
	// using the user ID from the session claims
	return ""
}

// AuthenticateWebSocket authenticates WebSocket connections
func AuthenticateWebSocket(conn *websocket.Conn, secretKey string) error {
	// This would be called during WebSocket handshake
	// The token should be passed as a query parameter or in the handshake
	// Implementation depends on how you want to handle WebSocket authentication with Clerk
	return nil // Placeholder implementation
}

// TestAuth middleware that bypasses authentication in test mode
func TestAuth(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		if cfg.TestMode {
			// In test mode, automatically set user_id to "test"
			c.Set("user_id", "test")
			c.Set("authenticated", true)
			c.Set("test_mode", true)
			c.Next()
			return
		}
		// If not in test mode, continue to next middleware (should be normal auth)
		c.Next()
	}
}

// RequireAuthWithTestMode wraps RequireAuth but allows test mode bypass
func RequireAuthWithTestMode(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		if cfg.TestMode {
			// In test mode, automatically set user_id to "test"
			c.Set("user_id", "test")
			c.Set("authenticated", true)
			c.Set("test_mode", true)
			c.Next()
			return
		}

		// If not in test mode, use normal Clerk authentication
		RequireAuth()(c)
	}
}

// ClerkAuthWithTestMode wraps ClerkAuth but allows test mode bypass
func ClerkAuthWithTestMode(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		if cfg.TestMode {
			// In test mode, automatically set user_id to "test"
			c.Set("user_id", "test")
			c.Set("authenticated", true)
			c.Set("test_mode", true)
			c.Next()
			return
		}

		// If not in test mode, use normal Clerk authentication
		ClerkAuth()(c)
	}
}
