# Fallback Mechanisms Implementation

This document outlines all the fallback mechanisms implemented throughout the Health Dashboard to handle undefined, null, or missing data gracefully.

## Overview

The dashboard now includes comprehensive fallback mechanisms to prevent undefined key errors and ensure a smooth user experience even when API responses are incomplete or missing.

## API Layer Fallbacks (`src/lib/api.ts`)

### Generic API Request Handler
- **JSON Parsing**: Falls back to empty object if response is not valid JSON
- **Error Response**: Safely handles unparseable error responses
- **Network Errors**: Provides meaningful error messages for network failures
- **Response Validation**: Checks for wrapped API responses with fallbacks

```typescript
// Fallback for invalid JSON responses
try {
  data = await response.json();
} catch (parseError) {
  return {} as T; // Safe fallback
}

// Fallback for wrapped responses
return data?.data || {} as T;
```

## Dashboard Data Hook (`src/hooks/useDashboardData.ts`)

### Health Summary Transformation
- **Missing Summary**: Returns default metric structure with "No data" status
- **Missing Metrics**: Individual metrics default to "--" values
- **Invalid Values**: Filters out non-numeric values
- **Missing Trends**: Returns empty chart data structure

```typescript
// Fallback for missing summary
if (!summary || !summary.metrics) {
  return fallbackMetricsStructure;
}

// Fallback for individual metrics
const metric = summary.metrics[metricType];
if (!metric || typeof metric.value !== 'number') {
  return defaultMetricData;
}
```

### Chart Data Transformation
- **Missing Trends**: Returns empty labels and datasets arrays
- **Invalid Timestamps**: Handles date parsing errors gracefully
- **Missing Data Points**: Filters out invalid values
- **Empty Datasets**: Removes datasets with no valid data

## Metrics Hook (`src/hooks/useMetrics.ts`)

### Data Fetching Fallbacks
- **Latest Metrics**: Falls back to empty object
- **Health Summary**: Falls back to null
- **Trends**: Falls back to empty array
- **Supported Metrics**: Falls back to empty object

### Batch Operations
- **Promise.allSettled**: Handles partial failures gracefully
- **Individual Failures**: Logs warnings but doesn't fail entire operation
- **Input Validation**: Client-side validation before API calls

```typescript
// Graceful batch loading
const results = await Promise.allSettled([
  fetchLatestMetrics(),
  fetchHealthSummary(),
  fetchHealthTrends(),
  fetchSupportedMetrics()
]);

// Handle partial failures
const failures = results.filter(result => result.status === 'rejected');
if (failures.length > 0) {
  console.warn('Some metrics data failed to load:', failures);
}
```

## Recovery Chart Hook (`src/hooks/useRecoveryChart.ts`)

### Chart Data Processing
- **Missing Trends**: Returns empty chart structure
- **Invalid Dates**: Handles date parsing errors with fallback labels
- **Missing Values**: Filters out null/undefined values
- **Empty Datasets**: Removes datasets with no valid data points

```typescript
// Safe date parsing
try {
  const timestamp = point?.timestamp;
  if (!timestamp) return 'Unknown Date';
  return new Date(timestamp).toLocaleDateString();
} catch (error) {
  return 'Invalid Date';
}
```

## MetricCard Component (`src/components/MetricCard.tsx`)

### Props Fallbacks
- **Title**: Falls back to "Unknown Metric"
- **Value**: Falls back to "--"
- **Status**: Falls back to "normal"
- **Data Array**: Falls back to empty array
- **Color**: Falls back to default gray color

### Chart Data Safety
- **Data Validation**: Filters out invalid numeric values
- **Chart Series**: Provides fallback data for empty charts
- **Modal Charts**: Handles missing data gracefully

```typescript
// Safe props handling
const safeTitle = title || 'Unknown Metric';
const safeValue = value || '--';
const safeData = Array.isArray(data) ? data : [];

// Safe chart data
const hasData = safeData.length > 0 && safeData.some(val => 
  typeof val === 'number' && !isNaN(val)
);
```

## ChatBox Component (`src/components/ChatBox.tsx`)

### Message Handling
- **Messages Array**: Falls back to empty array if undefined
- **Message Properties**: Provides defaults for missing properties
- **Error Handling**: Graceful error handling for send failures

```typescript
// Safe message array
const safeMessages = Array.isArray(messages) ? messages : [];

// Safe message properties
<ChatMessage
  key={msg.id || Math.random().toString(36)}
  message={msg.message || ''}
  timestamp={msg.timestamp || new Date().toISOString()}
  isUser={msg.isUser || false}
  senderName={msg.senderName || (msg.isUser ? 'You' : 'Assistant')}
/>
```

## DocumentUpload Component (`src/components/DocumentUpload.tsx`)

### Document Data Safety
- **Documents Array**: Falls back to empty array
- **Document Properties**: Handles missing properties gracefully
- **File Size**: Handles undefined file sizes
- **Dates**: Safe date parsing with error handling

```typescript
// Safe documents array
const safeDocuments = Array.isArray(documents) ? documents : [];

// Safe property access
<p className="text-sm font-medium truncate">
  {doc?.title || 'Untitled Document'}
</p>

// Safe file size formatting
const formatFileSize = (bytes: number | undefined) => {
  if (!bytes || typeof bytes !== 'number') return "Unknown size";
  // ... rest of formatting
};
```

## Chat Messages Hook (`src/hooks/useChatMessages.ts`)

### WebSocket Safety
- **Connection Handling**: Graceful connection failure handling
- **Message Processing**: Safe message data extraction
- **Reconnection**: Automatic reconnection with fallbacks

### API Fallbacks
- **REST Fallback**: Falls back to REST API if WebSocket fails
- **Error Messages**: Provides user-friendly error messages
- **Session Management**: Handles missing session IDs

## Documents Hook (`src/hooks/useDocuments.ts`)

### Document Operations
- **Upload Responses**: Handles missing upload responses
- **Document Lists**: Safe array handling
- **Error States**: Graceful error handling for all operations

## General Patterns

### Type Safety
- **Optional Chaining**: Used throughout for safe property access
- **Type Guards**: Validates data types before processing
- **Array Checks**: Ensures arrays are valid before iteration

### Error Boundaries
- **Try-Catch Blocks**: Comprehensive error handling
- **Fallback UI**: Provides meaningful fallback content
- **User Feedback**: Clear error messages for users

### Performance
- **Lazy Loading**: Components handle loading states gracefully
- **Partial Failures**: System continues working with partial data
- **Caching**: Maintains cached data during failures

## Testing Scenarios

The fallback mechanisms handle these scenarios:

1. **API Unavailable**: Dashboard shows cached/fallback data
2. **Partial API Failures**: Some data loads, others show fallbacks
3. **Invalid JSON**: Safe parsing with empty object fallbacks
4. **Missing Properties**: Default values for all missing properties
5. **Network Errors**: User-friendly error messages
6. **Empty Responses**: Graceful handling of empty data sets
7. **Type Mismatches**: Validation and conversion where possible

## Benefits

- **No Undefined Errors**: Eliminates runtime undefined key errors
- **Better UX**: Users see meaningful content instead of errors
- **Resilient System**: Dashboard works even with partial API failures
- **Debugging**: Clear error logging for development
- **Graceful Degradation**: Features degrade gracefully when data is missing

This comprehensive fallback system ensures the Health Dashboard remains functional and user-friendly regardless of API response quality or network conditions. 