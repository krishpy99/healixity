package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"health-dashboard-backend/internal/config"
	"health-dashboard-backend/internal/database"
	"health-dashboard-backend/internal/handlers"
	"health-dashboard-backend/internal/logger"
	"health-dashboard-backend/internal/middleware"
	"health-dashboard-backend/internal/services"
	"health-dashboard-backend/internal/storage"
	"health-dashboard-backend/internal/vectordb"
)

func main() {
	// Load configuration first
	cfg, err := config.Load()
	if err != nil {
		// Use basic fmt.Printf for config loading errors since logger isn't ready yet
		panic("Failed to load configuration: " + err.Error())
	}

	// Initialize configurable logger based on LOG_MODE
	customLogger, err := logger.NewLogger(logger.LogMode(cfg.LogMode))
	if err != nil {
		panic("Failed to initialize logger: " + err.Error())
	}
	defer customLogger.Close()

	// Get the underlying zap logger for compatibility with existing code
	zapLogger := customLogger.GetZapLogger()

	// Log the current logging mode for visibility
	switch logger.LogMode(cfg.LogMode) {
	case logger.ModePrint:
		customLogger.Print("🖨️  Logger initialized in PRINT mode - logs will be displayed in console")
	case logger.ModeWrite:
		customLogger.Print("📝 Logger initialized in WRITE mode - logs will be written to logs.json")
	case logger.ModeNone:
		customLogger.Print("🚫 Logger initialized in NONE mode - logging is disabled")
	}

	// Initialize Clerk
	middleware.InitClerk(cfg.ClerkSecretKey)

	// Initialize AWS services
	dynamoClient, err := database.NewDynamoDBClient(cfg)
	if err != nil {
		zapLogger.Fatal("Failed to initialize DynamoDB client", zap.Error(err))
	}

	s3Client, err := storage.NewS3Client(cfg)
	if err != nil {
		zapLogger.Fatal("Failed to initialize S3 client", zap.Error(err))
	}

	// Initialize Pinecone
	pineconeClient, err := vectordb.NewPineconeClient(cfg)
	if err != nil {
		zapLogger.Fatal("Failed to initialize Pinecone client", zap.Error(err))
	}

	// Initialize AI clients using factory
	aiFactory := services.NewAIClientFactory(cfg)

	llmClient, err := aiFactory.CreateLLMClient()
	if err != nil {
		zapLogger.Fatal("Failed to initialize LLM client", zap.Error(err))
	}

	embeddingClient, err := aiFactory.CreateEmbeddingClient()
	if err != nil {
		zapLogger.Fatal("Failed to initialize embedding client", zap.Error(err))
	}

	// Initialize services
	healthService := services.NewHealthService(dynamoClient, cfg)
	ragService := services.NewRAGService(pineconeClient, llmClient, embeddingClient, cfg)
	documentService := services.NewDocumentService(s3Client, dynamoClient, ragService, cfg)
	aiAgent := services.NewAIAgent(healthService, ragService, llmClient, cfg)
	authService := services.NewAuthService(zapLogger)

	// Initialize handlers
	healthHandler := handlers.NewHealthHandler(healthService, zapLogger)
	documentHandler := handlers.NewDocumentHandler(documentService, ragService, zapLogger)
	chatHandler := handlers.NewChatHandler(aiAgent, zapLogger)
	dashboardHandler := handlers.NewDashboardHandler(healthService, zapLogger)
	authHandler := handlers.NewAuthHandler(authService, zapLogger)

	// Setup Gin router
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()
	router.Use(middleware.RequestLogger(zapLogger))
	router.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowAllOrigins:  cfg.CORSAllowAllOrigins,
		AllowedOrigins:   cfg.CORSAllowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type", "Content-Length", "Accept-Encoding", "X-CSRF-Token", "Authorization", "accept", "origin", "Cache-Control", "X-Requested-With"},
		ExposedHeaders:   []string{"Content-Length", "Access-Control-Allow-Origin", "Access-Control-Allow-Headers", "Content-Type"},
		AllowCredentials: true,
		MaxAge:           "86400", // 24 hours
	}))
	router.Use(gin.Recovery())

	// Health check endpoint
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "healthy"})
	})

	// API routes
	api := router.Group("/api")
	{
		// Auth routes (with optional auth for checking status)
		auth := api.Group("/auth")
		auth.Use(middleware.ClerkAuthWithTestMode(cfg))
		{
			auth.GET("/check", authHandler.CheckAuth)
			auth.GET("/me", middleware.RequireAuthWithTestMode(cfg), authHandler.GetCurrentUser)
			auth.PUT("/profile", middleware.RequireAuthWithTestMode(cfg), authHandler.UpdateProfile)
			auth.GET("/roles", middleware.RequireAuthWithTestMode(cfg), authHandler.GetUserRoles)
			auth.PUT("/roles", middleware.RequireAuthWithTestMode(cfg), authHandler.UpdateUserRoles)
		}

		// Health data endpoints
		healthRoutes := api.Group("/health")
		healthRoutes.Use(middleware.RequireAuthWithTestMode(cfg))
		{
			healthRoutes.POST("/metrics", healthHandler.AddHealthData)
			healthRoutes.POST("/metrics/composite", healthHandler.AddCompositeHealthData)
			healthRoutes.GET("/metrics/:type", healthHandler.GetMetricHistory)
			healthRoutes.GET("/latest", healthHandler.GetLatestMetrics)
			healthRoutes.GET("/summary", healthHandler.GetHealthSummary)
			healthRoutes.GET("/trends", healthHandler.GetHealthTrends)
			healthRoutes.GET("/supported-metrics", healthHandler.GetSupportedMetrics)
			healthRoutes.POST("/validate", healthHandler.ValidateHealthInput)
			healthRoutes.DELETE("/metrics/:type/:timestamp", healthHandler.DeleteHealthData)
		}

		// Document endpoints
		documentRoutes := api.Group("/documents")
		documentRoutes.Use(middleware.RequireAuthWithTestMode(cfg))
		{
			documentRoutes.POST("/upload", documentHandler.UploadDocument)
			documentRoutes.GET("", documentHandler.ListDocuments)
			documentRoutes.GET("/:id", documentHandler.GetDocument)
			documentRoutes.GET("/:id/view", documentHandler.GetDocumentViewURL)
			documentRoutes.POST("/:id/process", documentHandler.ProcessDocument)
			documentRoutes.POST("/:id/retry", documentHandler.RetryProcessDocument)
			documentRoutes.POST("/query", documentHandler.QueryDocuments)
			documentRoutes.DELETE("/:id", documentHandler.DeleteDocument)
			documentRoutes.GET("/search", documentHandler.SearchDocuments)
		}

		// Chat endpoints
		chatRoutes := api.Group("/chat")
		chatRoutes.Use(middleware.RequireAuthWithTestMode(cfg))
		{
			chatRoutes.POST("", chatHandler.ProcessQuery)
			chatRoutes.GET("/history", chatHandler.GetChatHistory)
		}

		// Dashboard endpoints
		dashboardRoutes := api.Group("/dashboard")
		dashboardRoutes.Use(middleware.RequireAuthWithTestMode(cfg))
		{
			dashboardRoutes.GET("/summary", dashboardHandler.GetSummary)
			dashboardRoutes.GET("/trends", dashboardHandler.GetTrends)
			dashboardRoutes.GET("/overview", dashboardHandler.GetOverview)
		}
	}

	// WebSocket for real-time chat (updated to use Clerk auth with test mode support)
	if cfg.TestMode {
		// In test mode, use simplified auth for WebSocket
		router.GET("/ws/chat", middleware.TestAuth(cfg), chatHandler.HandleWebSocket)
	} else {
		// In normal mode, use Clerk auth for WebSocket
		router.GET("/ws/chat", middleware.AuthWebSocket(), chatHandler.HandleWebSocket)
	}

	// Create HTTP server
	srv := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: router,
	}

	// Start server in goroutine
	go func() {
		if cfg.TestMode {
			zapLogger.Warn("Starting server in TEST MODE - authentication bypassed, userID set to 'test'",
				zap.String("port", cfg.Port),
				zap.String("environment", cfg.Environment))
		} else {
			zapLogger.Info("Starting server with Clerk authentication",
				zap.String("port", cfg.Port),
				zap.String("environment", cfg.Environment))
		}
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			zapLogger.Fatal("Failed to start server", zap.Error(err))
		}
	}()

	// Wait for interrupt signal for graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	zapLogger.Info("Shutting down server...")

	// Give outstanding requests 30 seconds to complete
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		zapLogger.Fatal("Server forced to shutdown", zap.Error(err))
	}

	zapLogger.Info("Server exited")
}
