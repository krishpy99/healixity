# Configurable Logging System

This application now supports three different logging modes that can be controlled via the `LOG_MODE` environment variable.

## Logging Modes

### 1. PRINT Mode (Default)
- **Environment Variable**: `LOG_MODE=PRINT`
- **Behavior**: Logs are displayed in the console with human-readable formatting
- **Use Case**: Development and debugging when you want to see logs in real-time
- **Output**: Colored, formatted console output

### 2. WRITE Mode
- **Environment Variable**: `LOG_MODE=WRITE`
- **Behavior**: Logs are written to a `logs.json` file in JSON format
- **Use Case**: Production environments or when you need persistent log storage
- **Output**: Structured JSON logs appended to `logs.json`

### 3. NONE Mode
- **Environment Variable**: `LOG_MODE=NONE`
- **Behavior**: All logging is disabled (except manual debug prints)
- **Use Case**: When you want to suppress all automatic logging but still see manual debug statements
- **Output**: No logs, only manual debug prints

## Usage

### Setting the Log Mode

Set the environment variable before starting the application:

```bash
# Print mode (default)
export LOG_MODE=PRINT
go run cmd/server/main.go

# Write mode
export LOG_MODE=WRITE
go run cmd/server/main.go

# None mode
export LOG_MODE=NONE
go run cmd/server/main.go
```

Or use a `.env` file:
```env
LOG_MODE=PRINT
```

### Manual Debug Prints

For debugging purposes, you can use the global debug print functions that always output to console regardless of the log mode:

```go
import "health-dashboard-backend/internal/logger"

// These always print to console
logger.DebugPrint("Variable value:", someVariable)
logger.DebugPrintf("User %s has %d items", userID, count)
```

### Structured Logging

For application logs, continue using the zap logger as before:

```go
zapLogger.Info("User logged in", 
    zap.String("user_id", userID),
    zap.Time("timestamp", time.Now()),
)
```

## Examples

### PRINT Mode Output
```
2024-01-15 14:30:25	INFO	User logged in	{"user_id": "123", "timestamp": "2024-01-15T14:30:25Z"}
🐛 DEBUG: Variable value: some_value
```

### WRITE Mode Output (logs.json)
```json
{"timestamp":"2024-01-15T14:30:25Z","level":"info","message":"User logged in","fields":{"user_id":"123","timestamp":"2024-01-15T14:30:25Z"}}
```

### NONE Mode Output
```
🐛 DEBUG: Variable value: some_value
```
(Only manual debug prints are shown)

## Benefits

1. **Development Flexibility**: Use PRINT mode during development to see logs in real-time
2. **Production Ready**: Use WRITE mode in production for persistent, structured logging
3. **Clean Debugging**: Use NONE mode when you only want to see your manual debug statements
4. **No Code Changes**: Switch between modes without changing any application code
5. **Backward Compatibility**: Existing zap logger usage continues to work

## File Locations

- **Configuration**: `internal/config/config.go`
- **Logger Implementation**: `internal/logger/logger.go`
- **Main Application**: `cmd/server/main.go`
- **Log Output**: `logs.json` (when using WRITE mode)

## Notes

- The `logs.json` file is automatically created when using WRITE mode
- The `logs.json` file is excluded from version control (added to `.gitignore`)
- Manual debug prints (`logger.DebugPrint`) always output to console regardless of mode
- The logger automatically handles file creation, rotation, and cleanup
- In NONE mode, the application still functions normally but without logging overhead 