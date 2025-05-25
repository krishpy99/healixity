import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { MetricsData, RecoveryChartData, HealthSummary, HealthTrend, MetricData, METRIC_TYPES } from './types';

interface DashboardData {
  metrics: MetricsData | null;
  recoveryChartData: RecoveryChartData | null;
  loading: boolean;
  error: string | null;
  healthSummary?: HealthSummary;
  trends?: HealthTrend[];
  reload: () => Promise<void>;
  reloadSpecificMetric: (metricType: string) => Promise<void>;
}

// Transform engine API data to dashboard format with comprehensive fallbacks
function transformHealthSummaryToMetricsData(summary: HealthSummary | null | undefined): MetricsData {
  const getMetricStatus = (value: number, type: string): { status: 'normal' | 'warning' | 'alert'; statusText: string; color: string } => {
    switch (type) {
      case METRIC_TYPES.HEART_RATE:
        if (value > 100 || value < 60) return { status: 'alert', statusText: 'Abnormal', color: '#ef4444' };
        if (value > 90 || value < 70) return { status: 'warning', statusText: 'Monitor', color: '#f59e0b' };
        return { status: 'normal', statusText: 'Normal', color: '#10b981' };
      
      case METRIC_TYPES.BLOOD_PRESSURE_SYSTOLIC:
        if (value > 140) return { status: 'alert', statusText: 'High', color: '#ef4444' };
        if (value > 120) return { status: 'warning', statusText: 'Elevated', color: '#f59e0b' };
        return { status: 'normal', statusText: 'Normal', color: '#10b981' };
      
      case METRIC_TYPES.BLOOD_GLUCOSE:
        if (value > 126) return { status: 'alert', statusText: 'High', color: '#ef4444' };
        if (value > 100) return { status: 'warning', statusText: 'Elevated', color: '#f59e0b' };
        return { status: 'normal', statusText: 'Normal', color: '#10b981' };
      
      case METRIC_TYPES.BLOOD_OXYGEN_SATURATION:
        if (value < 90) return { status: 'alert', statusText: 'Critical', color: '#ef4444' };
        if (value < 95) return { status: 'warning', statusText: 'Low', color: '#f59e0b' };
        return { status: 'normal', statusText: 'Normal', color: '#10b981' };
      
      case METRIC_TYPES.BODY_TEMPERATURE:
        if (value > 38.0 || value < 35.0) return { status: 'alert', statusText: 'Abnormal', color: '#ef4444' };
        if (value > 37.5 || value < 36.0) return { status: 'warning', statusText: 'Monitor', color: '#f59e0b' };
        return { status: 'normal', statusText: 'Normal', color: '#10b981' };
      
      case METRIC_TYPES.BMI:
        if (value > 30 || value < 18.5) return { status: 'alert', statusText: 'Abnormal', color: '#ef4444' };
        if (value > 25 || value < 20) return { status: 'warning', statusText: 'Monitor', color: '#f59e0b' };
        return { status: 'normal', statusText: 'Normal', color: '#10b981' };
      
      default:
        return { status: 'normal', statusText: 'Normal', color: '#10b981' };
    }
  };

  const createMetricData = (metricType: string, defaultValue: string = '--'): MetricData => {
    // Fallback for missing summary or metrics
    if (!summary || !summary.metrics) {
      return {
        current: defaultValue,
        status: 'normal' as const,
        statusText: 'No data',
        data: [],
        color: '#6b7280'
      };
    }

    const metric = summary.metrics[metricType];
    if (!metric || typeof metric.value !== 'number' || !Number.isFinite(metric.value)) {
      return {
        current: defaultValue,
        status: 'normal' as const,
        statusText: 'No data',
        data: [],
        color: '#6b7280'
      };
    }

    const statusInfo = getMetricStatus(metric.value, metricType);
    
    return {
      current: metric.value.toString(),
      unit: metric.unit || '',
      status: statusInfo.status,
      statusText: statusInfo.statusText,
      data: [metric.value], // Single point for now
      color: statusInfo.color,
      trend: metric.trend || undefined
    };
  };

  // Fallback for missing summary
  if (!summary || !summary.metrics) {
    const fallbackMetric = {
      current: '--',
      status: 'normal' as const,
      statusText: 'No data',
      data: [],
      color: '#6b7280'
    };

    return {
      heartRate: fallbackMetric,
      bloodPressure: fallbackMetric,
      bmi: fallbackMetric,
      spo2: fallbackMetric,
      temperature: fallbackMetric,
      bloodSugar: fallbackMetric
    };
  }

  return {
    heartRate: createMetricData(METRIC_TYPES.HEART_RATE),
    bloodPressure: (() => {
      const systolic = summary.metrics?.[METRIC_TYPES.BLOOD_PRESSURE_SYSTOLIC];
      const diastolic = summary.metrics?.[METRIC_TYPES.BLOOD_PRESSURE_DIASTOLIC];
      
      if (systolic && diastolic && typeof systolic.value === 'number' && typeof diastolic.value === 'number') {
        const statusInfo = getMetricStatus(systolic.value, METRIC_TYPES.BLOOD_PRESSURE_SYSTOLIC);
        return {
          current: `${systolic.value}/${diastolic.value}`,
          unit: 'mmHg',
          status: statusInfo.status,
          statusText: statusInfo.statusText,
          data: { systolic: [systolic.value], diastolic: [diastolic.value] }, // Separate arrays for dual-line plotting
          color: statusInfo.color,
          trend: systolic.trend || undefined
        };
      }
      
      return createMetricData('', '--/--');
    })(),
    bmi: createMetricData(METRIC_TYPES.BMI),
    spo2: createMetricData(METRIC_TYPES.BLOOD_OXYGEN_SATURATION, '98'),
    temperature: createMetricData(METRIC_TYPES.BODY_TEMPERATURE, '98.6'),
    bloodSugar: createMetricData(METRIC_TYPES.BLOOD_GLUCOSE)
  };
}

// Transform trends to recovery chart data with fallbacks
function transformTrendsToChartData(trends: HealthTrend[] | null | undefined): RecoveryChartData {
  if (!trends || !Array.isArray(trends) || trends.length === 0) {
    return {
      labels: [],
      datasets: []
    };
  }

  // Use the first trend's data points for labels with fallback
  const firstTrend = trends[0];
  const labels = (firstTrend?.data_points && Array.isArray(firstTrend.data_points)) 
    ? firstTrend.data_points.map(point => {
        try {
          return new Date(point?.timestamp || new Date()).toLocaleDateString();
        } catch (error) {
          return 'Invalid Date';
        }
      })
    : [];

  const datasets = trends.map((trend, index) => {
    const colors = [
      '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'
    ];
    
    // Fallback for missing trend data
    const metricType = trend?.metric_type || `Metric ${index + 1}`;
    const dataPoints = (trend?.data_points && Array.isArray(trend.data_points)) 
      ? trend.data_points.map(point => typeof point?.value === 'number' ? point.value : 0)
      : [];
    
    return {
      label: metricType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      data: dataPoints,
      borderColor: colors[index % colors.length],
      backgroundColor: colors[index % colors.length] + '20'
    };
  }).filter(dataset => dataset.data.length > 0); // Remove datasets with no valid data

  return { labels, datasets };
}

export function useDashboardData(): DashboardData {
  const [data, setData] = useState<DashboardData>({
    metrics: null,
    recoveryChartData: null,
    loading: true,
    error: null,
    reload: async () => {},
    reloadSpecificMetric: async () => {}
  });

  const fetchDashboardData = async () => {
    try {
      console.log('🔄 useDashboardData: Fetching latest metrics...');
      setData(prev => ({ ...prev, loading: true, error: null }));

      // Fetch latest metrics for initial page load
      const latestMetrics = await api.health.getLatestMetrics();
      console.log('✅ useDashboardData: Latest metrics fetched successfully');
      
      // Create a health summary from latest metrics
      const healthSummary: HealthSummary = {
        user_id: 'current_user', // Will be replaced with actual user ID
        last_updated: new Date().toISOString(),
        metrics: latestMetrics.metrics
      };
      
      // Transform the data for dashboard components with fallbacks
      const transformedMetrics = transformHealthSummaryToMetricsData(healthSummary);
      
      // For now, use empty chart data since we're focusing on latest metrics
      const transformedChartData: RecoveryChartData = { labels: [], datasets: [] };

      setData(prev => ({
        ...prev,
        metrics: transformedMetrics,
        recoveryChartData: transformedChartData,
        healthSummary: healthSummary,
        trends: [],
        loading: false,
        error: null
      }));

    } catch (error) {
      console.error('❌ useDashboardData: Failed to fetch latest metrics:', error);
      
      // Provide fallback data instead of showing error for better UX
      const fallbackMetrics: MetricsData = {
        heartRate: { current: '--', status: 'normal', statusText: 'No data', data: [], color: '#6b7280' },
        bloodPressure: { current: '--/--', status: 'normal', statusText: 'No data', data: [], color: '#6b7280' },
        bmi: { current: '--', status: 'normal', statusText: 'No data', data: [], color: '#6b7280' },
        spo2: { current: '--', status: 'normal', statusText: 'No data', data: [], color: '#6b7280' },
        temperature: { current: '--', status: 'normal', statusText: 'No data', data: [], color: '#6b7280' },
        bloodSugar: { current: '--', status: 'normal', statusText: 'No data', data: [], color: '#6b7280' }
      };

      setData(prev => ({
        ...prev,
        metrics: fallbackMetrics,
        recoveryChartData: { labels: [], datasets: [] },
        loading: false,
        error: `Failed to load data: ${error instanceof Error ? error.message : 'Unknown error'}`
      }));
    }
  };

  // Set the reload function using useCallback
  const reload = useCallback(async () => {
    await fetchDashboardData();
  }, []);

  // Set the reload specific metric function using useCallback
  const reloadSpecificMetric = useCallback(async (metricType: string) => {
    try {
      console.log(`🔄 useDashboardData: Reloading specific metric: ${metricType}`);
      
      // Handle blood pressure specially - need to fetch both systolic and diastolic
      if (metricType === METRIC_TYPES.BLOOD_PRESSURE) {
        const [systolicHistory, diastolicHistory] = await Promise.all([
          api.health.getMetricHistory(METRIC_TYPES.BLOOD_PRESSURE_SYSTOLIC, { limit: 20 }),
          api.health.getMetricHistory(METRIC_TYPES.BLOOD_PRESSURE_DIASTOLIC, { limit: 20 })
        ]);
        
        console.log(`✅ useDashboardData: Blood pressure history fetched`);
        
        // Update the blood pressure data with historical values
        setData(prev => {
          if (!prev.metrics) return prev;
          
          const systolicData = systolicHistory.metrics?.map(m => m.value) || [];
          const diastolicData = diastolicHistory.metrics?.map(m => m.value) || [];
          
          // Get latest values for display
          const latestSystolic = systolicData[0] || 0;
          const latestDiastolic = diastolicData[0] || 0;
          
          const statusInfo = getMetricStatus(latestSystolic, METRIC_TYPES.BLOOD_PRESSURE_SYSTOLIC);
          
          return {
            ...prev,
            metrics: {
              ...prev.metrics,
              bloodPressure: {
                current: `${latestSystolic}/${latestDiastolic}`,
                unit: 'mmHg',
                status: statusInfo.status,
                statusText: statusInfo.statusText,
                data: { systolic: systolicData, diastolic: diastolicData }, // Historical data for plotting
                color: statusInfo.color,
                trend: prev.metrics.bloodPressure.trend
              }
            }
          };
        });
      } else {
        // Handle regular metrics
        const metricHistory = await api.health.getMetricHistory(metricType, { limit: 20 });
        console.log(`✅ useDashboardData: Metric history fetched for ${metricType}`);
        
        // Update the specific metric data with historical values
        setData(prev => {
          if (!prev.metrics) return prev;
          
          const historyData = metricHistory.metrics?.map(m => m.value) || [];
          const latestValue = historyData[0] || 0;
          
          // Determine which metric to update based on metricType
          const metricKey = getMetricKey(metricType);
          if (!metricKey) return prev;
          
          const statusInfo = getMetricStatus(latestValue, metricType);
          
          return {
            ...prev,
            metrics: {
              ...prev.metrics,
              [metricKey]: {
                ...prev.metrics[metricKey],
                current: latestValue.toString(),
                status: statusInfo.status,
                statusText: statusInfo.statusText,
                data: historyData,
                color: statusInfo.color
              }
            }
          };
        });
      }
      
    } catch (error) {
      console.error(`❌ useDashboardData: Failed to reload metric ${metricType}:`, error);
      // Don't update state on error, just log it
    }
  }, []);

  // Helper function to map metric types to metric keys
  const getMetricKey = (metricType: string): keyof MetricsData | null => {
    const mapping: Record<string, keyof MetricsData> = {
      [METRIC_TYPES.HEART_RATE]: 'heartRate',
      [METRIC_TYPES.BMI]: 'bmi',
      [METRIC_TYPES.BLOOD_OXYGEN_SATURATION]: 'spo2',
      [METRIC_TYPES.BODY_TEMPERATURE]: 'temperature',
      [METRIC_TYPES.BLOOD_GLUCOSE]: 'bloodSugar'
    };
    return mapping[metricType] || null;
  };

  // Helper function to get metric status (moved from transform function)
  const getMetricStatus = (value: number, type: string): { status: 'normal' | 'warning' | 'alert'; statusText: string; color: string } => {
    switch (type) {
      case METRIC_TYPES.HEART_RATE:
        if (value > 100 || value < 60) return { status: 'alert', statusText: 'Abnormal', color: '#ef4444' };
        if (value > 90 || value < 70) return { status: 'warning', statusText: 'Monitor', color: '#f59e0b' };
        return { status: 'normal', statusText: 'Normal', color: '#10b981' };
      
      case METRIC_TYPES.BLOOD_PRESSURE_SYSTOLIC:
        if (value > 140) return { status: 'alert', statusText: 'High', color: '#ef4444' };
        if (value > 120) return { status: 'warning', statusText: 'Elevated', color: '#f59e0b' };
        return { status: 'normal', statusText: 'Normal', color: '#10b981' };
      
      case METRIC_TYPES.BLOOD_GLUCOSE:
        if (value > 126) return { status: 'alert', statusText: 'High', color: '#ef4444' };
        if (value > 100) return { status: 'warning', statusText: 'Elevated', color: '#f59e0b' };
        return { status: 'normal', statusText: 'Normal', color: '#10b981' };
      
      case METRIC_TYPES.BLOOD_OXYGEN_SATURATION:
        if (value < 90) return { status: 'alert', statusText: 'Critical', color: '#ef4444' };
        if (value < 95) return { status: 'warning', statusText: 'Low', color: '#f59e0b' };
        return { status: 'normal', statusText: 'Normal', color: '#10b981' };
      
      case METRIC_TYPES.BODY_TEMPERATURE:
        if (value > 38.0 || value < 35.0) return { status: 'alert', statusText: 'Abnormal', color: '#ef4444' };
        if (value > 37.5 || value < 36.0) return { status: 'warning', statusText: 'Monitor', color: '#f59e0b' };
        return { status: 'normal', statusText: 'Normal', color: '#10b981' };
      
      case METRIC_TYPES.BMI:
        if (value > 30 || value < 18.5) return { status: 'alert', statusText: 'Abnormal', color: '#ef4444' };
        if (value > 25 || value < 20) return { status: 'warning', statusText: 'Monitor', color: '#f59e0b' };
        return { status: 'normal', statusText: 'Normal', color: '#10b981' };
      
      default:
        return { status: 'normal', statusText: 'Normal', color: '#10b981' };
    }
  };

  // Update the data with the reload functions
  useEffect(() => {
    setData(prev => ({ ...prev, reload, reloadSpecificMetric }));
  }, [reload, reloadSpecificMetric]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return data;
} 