package main

import (
	"os"
	"time"

	"go.uber.org/zap"

	"health-dashboard-backend/internal/logger"
)

func mainLoggingDemo() {
	// Demo all three logging modes
	modes := []logger.LogMode{
		logger.ModePrint,
		logger.ModeWrite,
		logger.ModeNone,
	}

	for _, mode := range modes {
		println("\n" + string(mode) + " MODE DEMO:")
		println("=" + string(make([]rune, len(mode)+10)))

		// Create logger with current mode
		l, err := logger.NewLogger(mode)
		if err != nil {
			panic(err)
		}

		// Get zap logger for structured logging
		zapLogger := l.GetZapLogger()

		// Demo manual debug prints (these always show)
		logger.DebugPrint("This debug message always shows regardless of log mode")
		logger.DebugPrintf("Current mode: %s, timestamp: %s", mode, time.Now().Format("15:04:05"))

		// Demo structured logging (respects log mode)
		zapLogger.Info("This is an info message",
			zap.String("mode", string(mode)),
			zap.Time("timestamp", time.Now()),
		)

		zapLogger.Warn("This is a warning message",
			zap.String("mode", string(mode)),
			zap.String("level", "warning"),
		)

		zapLogger.Error("This is an error message",
			zap.String("mode", string(mode)),
			zap.String("level", "error"),
		)

		// Close the logger
		l.Close()

		// Wait a bit between demos
		time.Sleep(1 * time.Second)
	}

	// Show logs.json content if it exists
	if data, err := os.ReadFile("logs.json"); err == nil {
		println("\nCONTENTS OF logs.json:")
		println("=====================")
		println(string(data))
	}
}
