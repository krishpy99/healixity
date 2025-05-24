# Test Mode Configuration

This document explains how to use the test mode feature for bypassing authentication during development and testing.

## Overview

Test mode allows you to automatically bypass Clerk authentication and set a fixed user ID of "test" for all authenticated endpoints. This is useful for:

- Local development without setting up Clerk
- Automated testing
- Demo environments
- API testing with tools like Postman

## Configuration

To enable test mode, set the `TEST_MODE` environment variable to `true`:

### Environment Variable

```bash
TEST_MODE=true
```

### In .env file

```bash
# Test Mode Configuration
TEST_MODE=true

# Other configuration...
PORT=8080
ENVIRONMENT=development
```

## How It Works

When `TEST_MODE=true`:

1. **All authentication middleware is bypassed**
2. **User ID is automatically set to "test"** for all requests
3. **All protected endpoints become accessible** without authentication headers
4. **WebSocket connections work without authentication**
5. **Server logs will show a warning** that test mode is active

## Affected Endpoints

All protected endpoints will work without authentication:

### Health Endpoints
- `POST /api/health/metrics`
- `GET /api/health/metrics/:type`
- `GET /api/health/latest`
- `GET /api/health/summary`
- `GET /api/health/trends`
- `GET /api/health/supported-metrics`
- `POST /api/health/validate`
- `DELETE /api/health/metrics/:type/:timestamp`

### Document Endpoints
- `POST /api/documents/upload`
- `GET /api/documents`
- `GET /api/documents/:id`
- `DELETE /api/documents/:id`
- `POST /api/documents/:id/process`
- `GET /api/documents/search`

### Chat Endpoints
- `POST /api/chat`
- `GET /api/chat/history`
- `GET /ws/chat` (WebSocket)

### Dashboard Endpoints
- `GET /api/dashboard/summary`
- `GET /api/dashboard/trends`
- `GET /api/dashboard/overview`

### Auth Endpoints
- `GET /api/auth/me`
- `PUT /api/auth/profile`
- `GET /api/auth/roles`
- `PUT /api/auth/roles`

## Example Usage

### Testing with cURL

```bash
# Add health data (no auth headers needed in test mode)
curl -X POST http://localhost:8080/api/health/metrics \
  -H "Content-Type: application/json" \
  -d '{
    "type": "blood_pressure_systolic",
    "value": 120,
    "unit": "mmHg",
    "notes": "Morning reading"
  }'

# Get latest metrics
curl http://localhost:8080/api/health/latest
```

### Testing with JavaScript/Fetch

```javascript
// Add health data
const response = await fetch('http://localhost:8080/api/health/metrics', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    type: 'heart_rate',
    value: 72,
    unit: 'bpm',
    notes: 'Resting heart rate'
  })
});

const result = await response.json();
console.log(result);
```

## Data Storage

When using test mode:
- All data is stored with `user_id = "test"`
- Data persists in your configured DynamoDB tables
- You can query this data normally using the test user ID

## Security Warning

⚠️ **NEVER enable test mode in production environments!**

Test mode completely bypasses authentication and should only be used for:
- Local development
- Automated testing
- Demo environments

## Disabling Test Mode

To disable test mode:

1. Remove the `TEST_MODE` environment variable, or
2. Set `TEST_MODE=false`

The server will then require proper Clerk authentication for all protected endpoints.

## Server Logs

When test mode is active, you'll see this warning in the server logs:

```
WARN	Starting server in TEST MODE - authentication bypassed, userID set to 'test'
```

When test mode is disabled, you'll see:

```
INFO	Starting server with Clerk authentication
``` 