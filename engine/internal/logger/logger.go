package logger

import (
	"encoding/json"
	"fmt"
	"os"
	"time"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

// LogMode represents the different logging modes
type LogMode string

const (
	ModePrint LogMode = "PRINT" // Print to console
	ModeWrite LogMode = "WRITE" // Write to logs.json file
	ModeNone  LogMode = "NONE"  // Skip logging
)

// Logger wraps zap.Logger with configurable output modes
type Logger struct {
	zapLogger *zap.Logger
	mode      LogMode
	logFile   *os.File
}

// LogEntry represents a structured log entry for JSON file output
type LogEntry struct {
	Timestamp string                 `json:"timestamp"`
	Level     string                 `json:"level"`
	Message   string                 `json:"message"`
	Fields    map[string]interface{} `json:"fields,omitempty"`
}

// NewLogger creates a new logger with the specified mode
func NewLogger(mode LogMode) (*Logger, error) {
	var zapLogger *zap.Logger
	var logFile *os.File
	var err error

	switch mode {
	case ModePrint:
		// Create a console logger with human-readable output
		config := zap.NewDevelopmentConfig()
		config.EncoderConfig.TimeKey = "time"
		config.EncoderConfig.LevelKey = "level"
		config.EncoderConfig.MessageKey = "msg"
		config.EncoderConfig.EncodeTime = zapcore.TimeEncoderOfLayout("2006-01-02 15:04:05")
		config.EncoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder
		zapLogger, err = config.Build()
		if err != nil {
			return nil, fmt.Errorf("failed to create console logger: %w", err)
		}

	case ModeWrite:
		// Create a file logger that writes to logs.json
		logFile, err = os.OpenFile("logs.json", os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
		if err != nil {
			return nil, fmt.Errorf("failed to open log file: %w", err)
		}

		// Create a production logger that writes to the file
		config := zap.NewProductionConfig()
		config.OutputPaths = []string{"logs.json"}
		zapLogger, err = config.Build()
		if err != nil {
			logFile.Close()
			return nil, fmt.Errorf("failed to create file logger: %w", err)
		}

	case ModeNone:
		// Create a no-op logger
		zapLogger = zap.NewNop()

	default:
		return nil, fmt.Errorf("invalid log mode: %s", mode)
	}

	return &Logger{
		zapLogger: zapLogger,
		mode:      mode,
		logFile:   logFile,
	}, nil
}

// Close closes the logger and any open files
func (l *Logger) Close() error {
	if l.zapLogger != nil {
		l.zapLogger.Sync()
	}
	if l.logFile != nil {
		return l.logFile.Close()
	}
	return nil
}

// GetZapLogger returns the underlying zap logger for compatibility
func (l *Logger) GetZapLogger() *zap.Logger {
	return l.zapLogger
}

// Print writes a message directly to stdout (bypasses log mode for manual prints)
func (l *Logger) Print(args ...interface{}) {
	fmt.Println(args...)
}

// Printf writes a formatted message directly to stdout (bypasses log mode for manual prints)
func (l *Logger) Printf(format string, args ...interface{}) {
	fmt.Printf(format+"\n", args...)
}

// Debug logs a debug message
func (l *Logger) Debug(msg string, fields ...zap.Field) {
	if l.mode == ModeNone {
		return
	}
	l.zapLogger.Debug(msg, fields...)
}

// Info logs an info message
func (l *Logger) Info(msg string, fields ...zap.Field) {
	if l.mode == ModeNone {
		return
	}
	l.zapLogger.Info(msg, fields...)
}

// Warn logs a warning message
func (l *Logger) Warn(msg string, fields ...zap.Field) {
	if l.mode == ModeNone {
		return
	}
	l.zapLogger.Warn(msg, fields...)
}

// Error logs an error message
func (l *Logger) Error(msg string, fields ...zap.Field) {
	if l.mode == ModeNone {
		return
	}
	l.zapLogger.Error(msg, fields...)
}

// Fatal logs a fatal message and exits
func (l *Logger) Fatal(msg string, fields ...zap.Field) {
	if l.mode == ModeNone {
		os.Exit(1)
	}
	l.zapLogger.Fatal(msg, fields...)
}

// Sync flushes any buffered log entries
func (l *Logger) Sync() error {
	if l.zapLogger != nil {
		return l.zapLogger.Sync()
	}
	return nil
}

// writeJSONLog writes a log entry to the JSON file (for WRITE mode)
func (l *Logger) writeJSONLog(level, message string, fields map[string]interface{}) {
	if l.mode != ModeWrite || l.logFile == nil {
		return
	}

	entry := LogEntry{
		Timestamp: time.Now().Format(time.RFC3339),
		Level:     level,
		Message:   message,
		Fields:    fields,
	}

	data, err := json.Marshal(entry)
	if err != nil {
		return
	}

	l.logFile.Write(data)
	l.logFile.Write([]byte("\n"))
}

// GetMode returns the current logging mode
func (l *Logger) GetMode() LogMode {
	return l.mode
}

// Global debug print functions that always output to console regardless of log mode
// These are useful for manual debugging and development

// DebugPrint prints debug information directly to stdout, bypassing log mode
func DebugPrint(args ...interface{}) {
	fmt.Print("🐛 DEBUG: ")
	fmt.Println(args...)
}

// DebugPrintf prints formatted debug information directly to stdout, bypassing log mode
func DebugPrintf(format string, args ...interface{}) {
	fmt.Printf("🐛 DEBUG: "+format+"\n", args...)
}
