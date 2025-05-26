package main

import (
	"os"

	"go.uber.org/zap"

	"health-dashboard-backend/internal/config"
	"health-dashboard-backend/internal/logger"
)

func main() {
	// Test with different LOG_MODE values
	testModes := []string{"PRINT", "WRITE", "NONE"}

	for _, mode := range testModes {
		println("\n=== Testing LOG_MODE=" + mode + " ===")

		// Set environment variable
		os.Setenv("LOG_MODE", mode)

		// Load config
		cfg, err := config.Load()
		if err != nil {
			panic(err)
		}

		// Create logger
		customLogger, err := logger.NewLogger(logger.LogMode(cfg.LogMode))
		if err != nil {
			panic(err)
		}

		// Get zap logger
		zapLogger := customLogger.GetZapLogger()

		// Test manual debug prints (should always show)
		logger.DebugPrint("Manual debug print - this should always show")

		// Test structured logging (should respect log mode)
		zapLogger.Info("Structured log message",
			zap.String("mode", mode),
			zap.String("test", "value"),
		)

		// Close logger
		customLogger.Close()

		println("Mode " + mode + " test completed")
	}

	// Show logs.json if it exists
	if data, err := os.ReadFile("logs.json"); err == nil {
		println("\n=== Contents of logs.json ===")
		println(string(data))
	} else {
		println("\n=== No logs.json file found ===")
	}
}
