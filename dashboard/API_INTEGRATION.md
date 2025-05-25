# Health Dashboard API Integration

This document outlines the complete API integration between the Health Dashboard frontend and the Health Engine backend.

## Overview

The dashboard frontend is now fully integrated with the Health Engine backend APIs, providing real-time health data management, document processing, AI-powered chat, and comprehensive analytics.

## Architecture

```
┌─────────────────┐    HTTP/WebSocket    ┌──────────────────┐
│   Dashboard     │ ◄─────────────────► │   Health Engine  │
│   (Next.js)     │                     │   (Go Backend)   │
└─────────────────┘                     └──────────────────┘
```

## API Endpoints Integrated

### Health Data Management

- **POST** `/api/health/metrics` - Add health metric
- **GET** `/api/health/metrics/:type` - Get metric history
- **GET** `/api/health/latest` - Get latest metrics
- **GET** `/api/health/summary` - Get health summary
- **GET** `/api/health/trends` - Get health trends
- **GET** `/api/health/supported-metrics` - Get supported metrics
- **POST** `/api/health/validate` - Validate health input
- **DELETE** `/api/health/metrics/:type/:timestamp` - Delete metric

### Dashboard Analytics

- **GET** `/api/dashboard/summary` - Get dashboard summary
- **GET** `/api/dashboard/trends` - Get dashboard trends
- **GET** `/api/dashboard/overview` - Get comprehensive overview

### Document Management

- **POST** `/api/documents/upload` - Upload document
- **GET** `/api/documents` - List documents
- **GET** `/api/documents/:id` - Get specific document
- **DELETE** `/api/documents/:id` - Delete document
- **POST** `/api/documents/:id/process` - Process document
- **GET** `/api/documents/search` - Search documents

### AI Chat

- **POST** `/api/chat` - Send message to AI
- **GET** `/api/chat/history` - Get chat history
- **WebSocket** `/ws/chat` - Real-time chat

### Authentication

- **GET** `/api/auth/check` - Check auth status
- **GET** `/api/auth/me` - Get current user
- **PUT** `/api/auth/profile` - Update profile
- **GET** `/api/auth/roles` - Get user roles

## Configuration

### Environment Variables

Create a `.env.local` file in the dashboard root:

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:8080

# Test mode (bypasses authentication)
NEXT_PUBLIC_TEST_MODE=true

# WebSocket URL
NEXT_PUBLIC_WS_URL=ws://localhost:8080
```

### Configuration File

The dashboard uses a centralized configuration in `src/lib/config.ts`:

```typescript
export const config = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
  testMode: process.env.NEXT_PUBLIC_TEST_MODE === 'true',
  // ... other config options
};
```

## API Service Layer

### Core API Client (`src/lib/api.ts`)

The API service layer provides:

- **Authentication handling** - Automatic token management
- **Error handling** - Standardized error responses
- **Type safety** - Full TypeScript support
- **Request/Response transformation** - Consistent data formats

```typescript
import { api } from '@/lib/api';

// Health data
const metrics = await api.health.getLatestMetrics();
const summary = await api.health.getHealthSummary();

// Documents
const documents = await api.documents.listDocuments();
const uploadResult = await api.documents.uploadDocument(file, metadata);

// Chat
const response = await api.chat.sendMessage({ message: 'Hello' });
```

## React Hooks

### Dashboard Data Hook (`useDashboardData`)

Fetches and transforms dashboard overview data:

```typescript
const { metrics, recoveryChartData, loading, error } = useDashboardData();
```

### Chat Hook (`useChatMessages`)

Manages real-time chat with WebSocket support:

```typescript
const { 
  messages, 
  loading, 
  connected, 
  sendMessage, 
  clearMessages 
} = useChatMessages();
```

### Documents Hook (`useDocuments`)

Handles document management:

```typescript
const { 
  documents, 
  uploading, 
  uploadDocument, 
  deleteDocument 
} = useDocuments();
```

### Metrics Hook (`useMetrics`)

Manages health metrics:

```typescript
const { 
  latestMetrics, 
  healthSummary, 
  addMetric, 
  getMetricHistory 
} = useMetrics();
```

## Data Flow

### 1. Dashboard Overview

```
useDashboardData → api.dashboard.getOverview() → Transform data → Display metrics
```

### 2. Health Metric Input

```
User input → useMetrics.addMetric() → api.health.addMetric() → Refresh dashboard
```

### 3. Document Upload

```
File selection → useDocuments.uploadDocument() → api.documents.uploadDocument() → Update list
```

### 4. AI Chat

```
User message → useChatMessages.sendMessage() → api.chat.sendMessage() → Display response
```

## Components Updated

### Core Components

1. **Dashboard Page** (`src/pages/index.tsx`)
   - Uses `useDashboardData` for real-time data
   - Displays health metrics, charts, chat, and documents

2. **ChatBox** (`src/components/ChatBox.tsx`)
   - Real-time WebSocket chat
   - Connection status indicators
   - Message history management

3. **DocumentUpload** (`src/components/DocumentUpload.tsx`)
   - File upload with metadata
   - Document categorization
   - Processing status tracking

4. **HealthMetricInput** (`src/components/HealthMetricInput.tsx`)
   - Add health metrics
   - Validation and type safety
   - Auto-unit detection

### UI Enhancements

- **Loading states** - Skeleton loaders and spinners
- **Error handling** - User-friendly error messages
- **Real-time updates** - WebSocket connections
- **Responsive design** - Mobile-friendly interface

## Type Safety

All API responses are fully typed using TypeScript interfaces:

```typescript
interface HealthMetric {
  user_id: string;
  timestamp: string;
  type: string;
  value: number;
  unit: string;
  notes?: string;
  source?: string;
}

interface DashboardOverview {
  summary: HealthSummary;
  recent_trends: HealthTrend[];
  health_score: {
    score: number;
    category: string;
    description: string;
  };
  // ... more fields
}
```

## Error Handling

### API Errors

```typescript
try {
  const data = await api.health.getLatestMetrics();
} catch (error) {
  if (error instanceof ApiError) {
    console.error(`API Error ${error.status}: ${error.message}`);
  }
}
```

### Component Error States

Components gracefully handle errors with fallback UI:

```typescript
if (error) {
  return <ErrorMessage message={error} onRetry={refetch} />;
}
```

## Testing

### Test Mode

Enable test mode to bypass authentication:

```env
NEXT_PUBLIC_TEST_MODE=true
```

In test mode:
- Authentication is bypassed
- User ID is set to "test"
- All API endpoints are accessible

### API Testing

Test individual API endpoints:

```typescript
// Test health metrics
const metrics = await api.health.getLatestMetrics();
console.log('Latest metrics:', metrics);

// Test document upload
const file = new File(['test'], 'test.txt', { type: 'text/plain' });
const result = await api.documents.uploadDocument(file, {
  title: 'Test Document',
  category: 'lab_results'
});
```

## Performance Optimizations

### Data Caching

- React hooks implement local state caching
- Automatic refresh on data mutations
- Optimistic updates for better UX

### WebSocket Management

- Automatic reconnection on disconnect
- Connection status indicators
- Graceful fallback to REST API

### Bundle Optimization

- Tree-shaking for unused API methods
- Lazy loading of components
- Code splitting by route

## Security

### Authentication

- JWT token management
- Automatic token refresh
- Secure token storage

### Data Validation

- Client-side input validation
- Server-side validation
- Type-safe API contracts

## Deployment

### Development

```bash
# Start the engine backend
cd engine
go run ./cmd/server/main.go

# Start the dashboard frontend
cd dashboard
npm run dev
```

### Production

```bash
# Build the dashboard
npm run build

# Set production environment variables
NEXT_PUBLIC_API_URL=https://your-api-domain.com
NEXT_PUBLIC_TEST_MODE=false
```

## Monitoring

### Health Checks

The dashboard includes health monitoring:

```typescript
const healthStatus = await api.healthCheck.checkHealth();
```

### Error Tracking

All API errors are logged and can be integrated with monitoring services:

```typescript
// Automatic error logging
console.error('API Error:', error);
// Can be extended to send to monitoring services
```

## Future Enhancements

### Planned Features

1. **Offline Support** - Service worker for offline functionality
2. **Push Notifications** - Real-time health alerts
3. **Data Export** - Export health data in various formats
4. **Advanced Analytics** - Machine learning insights
5. **Multi-user Support** - Family health tracking

### API Extensions

1. **Batch Operations** - Bulk data operations
2. **Real-time Subscriptions** - WebSocket data streams
3. **Advanced Search** - Full-text search across all data
4. **Data Sync** - Multi-device synchronization

## Troubleshooting

### Common Issues

1. **Connection Errors**
   - Check if backend is running on correct port
   - Verify API_URL configuration
   - Check CORS settings

2. **Authentication Issues**
   - Enable test mode for development
   - Check JWT token validity
   - Verify user permissions

3. **WebSocket Issues**
   - Check WebSocket URL configuration
   - Verify firewall settings
   - Test fallback to REST API

### Debug Mode

Enable debug logging:

```typescript
// Add to config
debug: process.env.NODE_ENV === 'development'
```

This comprehensive integration provides a robust, type-safe, and user-friendly interface to the Health Engine backend, enabling real-time health data management and AI-powered insights. 