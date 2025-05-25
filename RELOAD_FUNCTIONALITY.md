# Metric Card Reload Functionality

## Overview

Added reload buttons to each metric card modal that allow users to refresh individual metrics without reloading the entire dashboard. The reload button is positioned inside the modal when viewing metric details, providing targeted data refreshing for that specific metric using the metric history API. Additionally, graphs are now populated on page load with historical data, and automatically update when new metric values are added.

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
      {
        name: 'Systolic',
        data: data.systolic.filter(val => typeof val === 'number' && !isNaN(val)).reverse(),
      },
      {
        name: 'Diastolic', 
        data: data.diastolic.filter(val => typeof val === 'number' && !isNaN(val)).reverse(),
      }
    ];
  } else if (Array.isArray(data)) {
    return [
      {
        name: safeTitle,
        data: data.filter(val => typeof val === 'number' && !isNaN(val)).reverse(),
      }
    ];
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

### 4. Chronological Data Ordering

**Chart Data Reversal:**
- API returns data in reverse chronological order (newest first)
- Charts display data in chronological order (oldest to newest, left to right)
- Data arrays are reversed before plotting: `.reverse()`
- X-axis labels are also reversed to match chronological progression

### 1. Page Load Graph Population

**Initial Data Loading:**
- **Latest Values**: Fetches current values using `getLatestMetrics` API
- **Historical Data**: Fetches top 10 values for each metric using `getMetricHistory` API with `limit=10`
- **Parallel Loading**: All metric histories are fetched simultaneously for performance
- **Graph Population**: Charts display historical data immediately on page load

```typescript
// Fetch historical data for all metrics (top 10 for graphs)
const [
  heartRateHistory,
  systolicHistory,
  diastolicHistory,
  bmiHistory,
  spo2History,
  temperatureHistory,
  bloodSugarHistory
] = await Promise.all([
  api.health.getMetricHistory(METRIC_TYPES.HEART_RATE, { limit: 10 }),
  api.health.getMetricHistory(METRIC_TYPES.BLOOD_PRESSURE_SYSTOLIC, { limit: 10 }),
  api.health.getMetricHistory(METRIC_TYPES.BLOOD_PRESSURE_DIASTOLIC, { limit: 10 }),
  api.health.getMetricHistory(METRIC_TYPES.BMI, { limit: 10 }),
  api.health.getMetricHistory(METRIC_TYPES.BLOOD_OXYGEN_SATURATION, { limit: 10 }),
  api.health.getMetricHistory(METRIC_TYPES.BODY_TEMPERATURE, { limit: 10 }),
  api.health.getMetricHistory(METRIC_TYPES.BLOOD_GLUCOSE, { limit: 10 })
]);
```

### 2. Auto-Reload After Adding Metrics

**Automatic Graph Updates:**
- After successfully adding a new metric value, the specific metric automatically reloads
- Uses the same `onReloadMetric` function to fetch updated historical data
- Ensures graphs immediately reflect the newly added data point
- No manual reload required by the user

```typescript
// Auto-reload the metric to update the graph
if (onReloadMetric) {
  await onReloadMetric(metricType);
}
```

## User Experience

### Page Load Experience
- **Immediate Graph Display**: Charts are populated with historical data (top 10 values) on page load
- **No Empty Charts**: Users see meaningful trend data immediately without manual interaction
- **Fast Loading**: Parallel API calls ensure quick data retrieval for all metrics
- **Graceful Fallbacks**: Charts display available data even if some metrics have no history

### Blood Pressure Visualization
- **Dual-Line Chart**: Systolic (red) and diastolic (blue) values plotted as separate lines
- **Legend**: Shows both "Systolic" and "Diastolic" labels
- **Tooltip**: Displays both values when hovering over chart points
- **Historical Data**: Shows up to 10 recent readings on page load, 20 when manually reloaded
- **Chronological Order**: Data displayed from oldest to newest (left to right) for intuitive trend reading

### Reload Functionality
- **API Endpoint**: Uses `/api/health/metrics/{type}?limit=20` for targeted metric refresh
- **Blood Pressure**: Fetches both systolic and diastolic history in parallel
- **Regular Metrics**: Fetches single metric history with 20 data points
- **Chart Update**: Immediately reflects new data with proper dual-line plotting for blood pressure
- **Data Ordering**: Automatically reverses API data to display chronologically (oldest to newest)

### Auto-Update After Adding Data
- **Seamless Experience**: After adding a new metric value, the chart automatically updates
- **No Manual Reload**: Users don't need to click reload to see their new data
- **Immediate Feedback**: New data points appear in the chart instantly after successful submission
- **Consistent Behavior**: Works for both regular metrics and blood pressure (dual-line)

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
- **Initial Page Load**: 
  - `GET /api/health/latest` - Fetches latest values for all metrics (current values)
  - `GET /api/health/metrics/{type}?limit=10` - Fetches top 10 historical values for each metric (graph data)
  - Parallel execution of all API calls for optimal performance
- **Individual Metric Reload**: `GET /api/health/metrics/{type}?limit=20` - Fetches historical data for specific metric
- **Blood Pressure Reload**: Parallel calls to systolic and diastolic history endpoints
- **Auto-Reload After Add**: Automatically triggers individual metric reload after successful data submission
- **Response**: Latest values for current display, historical data with timestamps for charts
- **Limits**: 10 readings for page load graphs, 20 readings for manual reloads

### Benefits of Enhanced Hybrid API Approach
1. **Complete Page Load**: Latest values + historical data fetched together on initial load
2. **Immediate Visualization**: Charts populated with meaningful data from the start
3. **Targeted Refresh**: History API provides detailed trend data for specific metrics when needed
4. **Efficient Performance**: Parallel API calls minimize loading time
5. **Auto-Update**: Seamless chart updates after adding new data
6. **Optimal Data Volume**: 10 points for overview, 20 points for detailed analysis
7. **Graceful Degradation**: Charts work even with partial or missing data

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