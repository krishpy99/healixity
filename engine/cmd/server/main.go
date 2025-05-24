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
	"health-dashboard-backend/internal/middleware"
	"health-dashboard-backend/internal/services"
	"health-dashboard-backend/internal/storage"
	"health-dashboard-backend/internal/vectordb"
	"health-dashboard-backend/pkg/ai"
)

func main() {
	// Initialize logger
	logger, _ := zap.NewProduction()
	defer logger.Sync()

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		logger.Fatal("Failed to load configuration", zap.Error(err))
	}

	// Initialize Clerk
	middleware.InitClerk(cfg.ClerkSecretKey)

	// Initialize AWS services
	dynamoClient, err := database.NewDynamoDBClient(cfg)
	if err != nil {
		logger.Fatal("Failed to initialize DynamoDB client", zap.Error(err))
	}

	s3Client, err := storage.NewS3Client(cfg)
	if err != nil {
		logger.Fatal("Failed to initialize S3 client", zap.Error(err))
	}

	// Initialize Pinecone
	pineconeClient, err := vectordb.NewPineconeClient(cfg)
	if err != nil {
		logger.Fatal("Failed to initialize Pinecone client", zap.Error(err))
	}

	// Initialize AI client
	llmClient, err := ai.NewLLMClient(cfg)
	if err != nil {
		logger.Fatal("Failed to initialize LLM client", zap.Error(err))
	}

	// Initialize services
	healthService := services.NewHealthService(dynamoClient, cfg)
	documentService := services.NewDocumentService(s3Client, dynamoClient, cfg)
	ragService := services.NewRAGService(pineconeClient, llmClient, cfg)
	aiAgent := services.NewAIAgent(healthService, ragService, llmClient, cfg)
	authService := services.NewAuthService(logger)

	// Initialize handlers
	healthHandler := handlers.NewHealthHandler(healthService, logger)
	documentHandler := handlers.NewDocumentHandler(documentService, ragService, logger)
	chatHandler := handlers.NewChatHandler(aiAgent, logger)
	dashboardHandler := handlers.NewDashboardHandler(healthService, logger)
	authHandler := handlers.NewAuthHandler(authService, logger)

	// Setup Gin router
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()
	router.Use(middleware.RequestLogger(logger))
	router.Use(middleware.CORS())
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
			documentRoutes.DELETE("/:id", documentHandler.DeleteDocument)
			documentRoutes.POST("/:id/process", documentHandler.ProcessDocument)
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
			logger.Warn("Starting server in TEST MODE - authentication bypassed, userID set to 'test'",
				zap.String("port", cfg.Port),
				zap.String("environment", cfg.Environment))
		} else {
			logger.Info("Starting server with Clerk authentication",
				zap.String("port", cfg.Port),
				zap.String("environment", cfg.Environment))
		}
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("Failed to start server", zap.Error(err))
		}
	}()

	// Wait for interrupt signal for graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down server...")

	// Give outstanding requests 30 seconds to complete
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		logger.Fatal("Server forced to shutdown", zap.Error(err))
	}

	logger.Info("Server exited")
}
