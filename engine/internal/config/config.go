package config

import (
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

// Config holds all configuration for the application
type Config struct {
	// Server configuration
	Port        string
	Environment string
	JWTSecret   string
	TestMode    bool // Add test mode flag

	// Logging configuration
	LogMode string // PRINT, WRITE, or NONE

	// Clerk configuration
	ClerkSecretKey      string
	ClerkPublishableKey string
	ClerkFrontendAPI    string

	// AWS configuration
	AWSRegion           string
	AWSAccessKeyID      string
	AWSSecretAccessKey  string
	DynamoDBTableHealth string
	DynamoDBTableDocs   string
	S3Bucket            string

	// Pinecone configuration
	PineconeAPIKey    string
	PineconeIndexName string
	PineconeNamespace string
	PineconeHost      string

	// LLM configuration
	SonarAPIKey    string
	OpenAIAPIKey   string
	LLMProvider    string
	EmbeddingModel string
	ChatModel      string
	MaxTokens      int
	Temperature    float32

	// Application settings
	MaxFileSize      int64
	SupportedFormats []string
	ChunkSize        int
	ChunkOverlap     int
}

// Load reads configuration from environment variables and .env file
func Load() (*Config, error) {
	// Load .env file if it exists (optional)
	_ = godotenv.Load()

	cfg := &Config{
		// Server defaults
		Port:        getEnv("PORT", "8080"),
		Environment: getEnv("ENVIRONMENT", "development"),
		JWTSecret:   getEnv("JWT_SECRET", "your-secret-key"),
		TestMode:    getEnvAsBool("TEST_MODE", false), // Add test mode configuration

		// Logging configuration
		LogMode: getEnv("LOG_MODE", "PRINT"),

		// Clerk configuration
		ClerkSecretKey:      getEnv("CLERK_SECRET_KEY", ""),
		ClerkPublishableKey: getEnv("CLERK_PUBLISHABLE_KEY", ""),
		ClerkFrontendAPI:    getEnv("CLERK_FRONTEND_API_URL", ""),

		// AWS configuration
		AWSRegion:           getEnv("AWS_REGION", "us-east-1"),
		AWSAccessKeyID:      getEnv("AWS_ACCESS_KEY_ID", ""),
		AWSSecretAccessKey:  getEnv("AWS_SECRET_ACCESS_KEY", ""),
		DynamoDBTableHealth: getEnv("DYNAMODB_TABLE_HEALTH", "health-metrics"),
		DynamoDBTableDocs:   getEnv("DYNAMODB_TABLE_DOCS", "health-documents"),
		S3Bucket:            getEnv("S3_BUCKET", "health-documents-bucket"),

		// Pinecone configuration
		PineconeAPIKey:    getEnv("PINECONE_API_KEY", ""),
		PineconeIndexName: getEnv("PINECONE_INDEX_NAME", "health-documents"),
		PineconeNamespace: getEnv("PINECONE_NAMESPACE", "default"),
		PineconeHost:      getEnv("PINECONE_HOST", ""),

		// LLM configuration
		SonarAPIKey:    getEnv("SONAR_API_KEY", ""),
		OpenAIAPIKey:   getEnv("OPENAI_API_KEY", ""),
		LLMProvider:    getEnv("LLM_PROVIDER", "sonar"),
		EmbeddingModel: getEnv("EMBEDDING_MODEL", "text-embedding-ada-002"),
		ChatModel:      getEnv("CHAT_MODEL", "sonar"),
		MaxTokens:      getEnvAsInt("MAX_TOKENS", 4096),
		Temperature:    getEnvAsFloat32("TEMPERATURE", 0.7),

		// Application settings
		MaxFileSize:      getEnvAsInt64("MAX_FILE_SIZE", 10*1024*1024), // 10MB
		SupportedFormats: []string{"pdf", "txt", "docx", "md"},
		ChunkSize:        getEnvAsInt("CHUNK_SIZE", 1000),
		ChunkOverlap:     getEnvAsInt("CHUNK_OVERLAP", 200),
	}

	return cfg, nil
}

// getEnv gets environment variable with fallback
func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

// getEnvAsInt gets environment variable as integer with fallback
func getEnvAsInt(key string, fallback int) int {
	if value := os.Getenv(key); value != "" {
		if intVal, err := strconv.Atoi(value); err == nil {
			return intVal
		}
	}
	return fallback
}

// getEnvAsInt64 gets environment variable as int64 with fallback
func getEnvAsInt64(key string, fallback int64) int64 {
	if value := os.Getenv(key); value != "" {
		if int64Val, err := strconv.ParseInt(value, 10, 64); err == nil {
			return int64Val
		}
	}
	return fallback
}

// getEnvAsFloat32 gets environment variable as float32 with fallback
func getEnvAsFloat32(key string, fallback float32) float32 {
	if value := os.Getenv(key); value != "" {
		if float32Val, err := strconv.ParseFloat(value, 32); err == nil {
			return float32(float32Val)
		}
	}
	return fallback
}

// getEnvAsBool gets environment variable as bool with fallback
func getEnvAsBool(key string, fallback bool) bool {
	if value := os.Getenv(key); value != "" {
		if boolVal, err := strconv.ParseBool(value); err == nil {
			return boolVal
		}
	}
	return fallback
}
