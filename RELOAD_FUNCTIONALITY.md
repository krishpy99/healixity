# Metric Card Reload Functionality

## Overview

Added reload buttons to each metric card modal that allow users to refresh individual metrics without reloading the entire dashboard. The reload button is positioned inside the modal when viewing metric details, providing targeted data refreshing for that specific metric using the metric history API.

## Implementation Details

### 1. MetricCard Component Updates

**Updated props interface:**
```typescript
interface MetricCardProps {
  // ... existing props
  data: number[] | { systolic: number[]; diastolic: number[] }; // Support both formats for blood pressure
  onReloadMetric?: (metricType: string) => Promise<void>;
}
```

**Blood Pressure Dual-Line Plotting:**
- Blood pressure now displays two separate colored lines for systolic and diastolic values
- Systolic: Red line (#ef4444)
- Diastolic: Blue line (#3b82f6)
- Data format: `{ systolic: number[], diastolic: number[] }`
- Chart automatically handles both single-line (regular metrics) and dual-line (blood pressure) plotting

**Chart Series Logic:**
```typescript
const getChartSeries = () => {
  if (isBloodPressure && typeof data === 'object' && 'systolic' in data && 'diastolic' in data) {
    return [
      { name: 'Systolic', data: data.systolic.filter(val => typeof val === 'number' && !isNaN(val)) },
      { name: 'Diastolic', data: data.diastolic.filter(val => typeof val === 'number' && !isNaN(val)) }
    ];
  } else if (Array.isArray(data)) {
    return [{ name: safeTitle, data: data.filter(val => typeof val === 'number' && !isNaN(val)) }];
  }
  return [{ name: safeTitle, data: [0] }];
};
```

### 2. Dashboard Hook Updates

**Updated useDashboardData hook:**
- **Initial Load**: Uses `getLatestMetrics` API to fetch current values for all metrics
- **Individual Reload**: Uses `getMetricHistory` API with `limit=20` for specific metrics
- Added special handling for blood pressure to fetch both systolic and diastolic history
- Updated data transformation to support dual-line blood pressure plotting

```typescript
// Initial page load - fetch all latest metrics
const fetchDashboardData = async () => {
  const latestMetrics = await api.health.getLatestMetrics();
  const healthSummary: HealthSummary = {
    user_id: 'current_user',
    last_updated: new Date().toISOString(),
    metrics: latestMetrics.metrics
  };
  const transformedMetrics = transformHealthSummaryToMetricsData(healthSummary);
  // Update state with latest values
};

// Individual metric reload - fetch historical data for specific metric
const reloadSpecificMetric = useCallback(async (metricType: string) => {
  // Handle blood pressure specially - need to fetch both systolic and diastolic
  if (metricType === METRIC_TYPES.BLOOD_PRESSURE) {
    const [systolicHistory, diastolicHistory] = await Promise.all([
      api.health.getMetricHistory(METRIC_TYPES.BLOOD_PRESSURE_SYSTOLIC, { limit: 20 }),
      api.health.getMetricHistory(METRIC_TYPES.BLOOD_PRESSURE_DIASTOLIC, { limit: 20 })
    ]);
    
    // Update with historical data arrays for proper chart plotting
    setData(prev => ({
      ...prev,
      metrics: {
        ...prev.metrics,
        bloodPressure: {
          current: `${latestSystolic}/${latestDiastolic}`,
          data: { systolic: systolicData, diastolic: diastolicData },
          // ... other properties
        }
      }
    }));
  } else {
    // Handle regular metrics with single history call
    const metricHistory = await api.health.getMetricHistory(metricType, { limit: 20 });
    // Update specific metric with historical data
  }
}, []);
```

### 3. Type System Updates

**Updated MetricData interface:**
```typescript
export interface MetricData {
  current: string;
  unit?: string;
  status: "normal" | "warning" | "alert";
  statusText: string;
  data: number[] | { systolic: number[]; diastolic: number[] }; // Support both formats
  color: string;
  trend?: 'up' | 'down' | 'stable';
}
```

## User Experience

### Blood Pressure Visualization
- **Dual-Line Chart**: Systolic (red) and diastolic (blue) values plotted as separate lines
- **Legend**: Shows both "Systolic" and "Diastolic" labels
- **Tooltip**: Displays both values when hovering over chart points
- **Historical Data**: Shows up to 20 recent readings for trend analysis

### Reload Functionality
- **API Endpoint**: Uses `/api/health/metrics/{type}?limit=20` for targeted metric refresh
- **Blood Pressure**: Fetches both systolic and diastolic history in parallel
- **Regular Metrics**: Fetches single metric history with 20 data points
- **Chart Update**: Immediately reflects new data with proper dual-line plotting for blood pressure

## Technical Benefits

### 1. **Targeted Data Fetching**
- Uses specific metric history endpoints instead of full dashboard refresh
- Fetches 20 historical data points for meaningful trend visualization
- Parallel fetching for blood pressure (systolic + diastolic) for efficiency

### 2. **Enhanced Blood Pressure Visualization**
- Separate lines for systolic and diastolic provide clearer medical insights
- Color coding (red/blue) follows medical conventions
- Historical trend analysis with up to 20 data points

### 3. **API Efficiency**
- **Endpoint**: `GET /api/health/metrics/{type}?limit=20`
- **Blood Pressure**: Two parallel calls for systolic and diastolic
- **Regular Metrics**: Single targeted call
- **Data Volume**: Limited to 20 recent readings for performance

### 4. **Type Safety**
- Union type for data supports both single arrays and blood pressure objects
- Compile-time validation ensures correct data structure usage
- Backward compatibility with existing single-line charts

## Code Quality

### 1. **Chart Flexibility**
- Single chart component handles both single-line and dual-line plotting
- Automatic color assignment based on metric type
- Responsive legend and tooltip behavior

### 2. **Data Transformation**
- Clean separation between API data and chart data
- Proper filtering of invalid values (NaN, non-numeric)
- Consistent data structure across all metrics

### 3. **Error Handling**
- Graceful fallbacks for missing or invalid data
- Console logging for debugging without user-facing errors
- State preservation on reload failures

## API Usage

### Current Implementation
- **Initial Page Load**: `GET /api/health/latest` - Fetches latest values for all metrics
- **Individual Metric Reload**: `GET /api/health/metrics/{type}?limit=20` - Fetches historical data for specific metric
- **Blood Pressure Reload**: Parallel calls to systolic and diastolic history endpoints
- **Response**: Latest values for page load, historical data with timestamps for reloads
- **Limit**: 20 recent readings for trend analysis on individual reloads

### Benefits of Hybrid API Approach
1. **Fast Initial Load**: Latest API provides immediate current values for all metrics
2. **Targeted Refresh**: History API provides detailed trend data for specific metrics
3. **Efficient**: Latest API for overview, history API only when user requests details
4. **Accurate**: Uses appropriate endpoints for each use case
5. **Performance**: Minimal data transfer - latest values initially, historical data on demand

## Blood Pressure Plotting

### Dual-Line Implementation
```typescript
// Data structure for blood pressure
data: { 
  systolic: [120, 118, 122, 119, 121], 
  diastolic: [80, 78, 82, 79, 81] 
}

// Chart series generation
[
  { name: 'Systolic', data: [120, 118, 122, 119, 121] },
  { name: 'Diastolic', data: [80, 78, 82, 79, 81] }
]

// Colors
colors: ['#ef4444', '#3b82f6'] // Red for systolic, blue for diastolic
```

### Medical Benefits
- **Clear Separation**: Systolic and diastolic trends are visually distinct
- **Trend Analysis**: Can identify patterns in both pressure types
- **Medical Standards**: Color coding follows healthcare conventions
- **Comprehensive View**: Both values plotted together for correlation analysis

## Testing

### Manual Testing Steps
1. Load dashboard and click on blood pressure card
2. Verify dual-line chart with red (systolic) and blue (diastolic) lines
3. Click reload button and verify both lines update with historical data
4. Test other metric cards to ensure single-line charts still work
5. Verify reload uses metric history API (check network tab)
6. Test error scenarios (network issues, invalid data)

### Build Verification
- ✅ TypeScript compilation passes with updated union types
- ✅ React hooks warnings resolved
- ✅ ESLint warnings minimized (only unused variables remain)
- ✅ Next.js build successful with optimized bundle

## Key Improvements from Previous Implementation

### ✅ **Correct API Usage**
- Now uses metric history API (`/api/health/metrics/{type}?limit=20`) instead of latest API
- Provides historical data for meaningful trend visualization
- Targeted refresh for specific metrics as intended

### ✅ **Blood Pressure Dual-Line Plotting**
- Separate colored lines for systolic (red) and diastolic (blue) values
- Proper medical visualization following healthcare standards
- Historical trend analysis for both pressure types

### ✅ **Enhanced Data Structure**
- Union type supports both single arrays and blood pressure objects
- Type-safe implementation with compile-time validation
- Backward compatibility with existing single-line charts

### ✅ **Performance Optimization**
- Parallel API calls for blood pressure (systolic + diastolic)
- Limited to 20 data points for optimal chart performance
- Targeted metric refresh instead of full dashboard reload 