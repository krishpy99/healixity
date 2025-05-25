import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { MetricsData, RecoveryChartData, HealthSummary, HealthTrend, MetricData, METRIC_TYPES } from './types';

interface DashboardData {
  metrics: MetricsData | null;
  recoveryChartData: RecoveryChartData | null;
  loading: boolean;
  error: string | null;
  healthSummary?: HealthSummary;
  trends?: HealthTrend[];
}

// Transform engine API data to dashboard format with comprehensive fallbacks
function transformHealthSummaryToMetricsData(summary: HealthSummary | null | undefined): MetricsData {
  const getMetricStatus = (value: number, type: string): { status: 'normal' | 'warning' | 'alert'; statusText: string; color: string } => {
    // Basic health status logic - can be enhanced with proper ranges
    switch (type) {
      case METRIC_TYPES.HEART_RATE:
        if (value < 60 || value > 100) return { status: 'alert', statusText: 'Outside normal range', color: '#ef4444' };
        if (value < 70 || value > 90) return { status: 'warning', statusText: 'Borderline', color: '#f59e0b' };
        return { status: 'normal', statusText: 'Normal', color: '#10b981' };
      
      case METRIC_TYPES.BLOOD_PRESSURE_SYSTOLIC:
        if (value > 140) return { status: 'alert', statusText: 'High', color: '#ef4444' };
        if (value > 120) return { status: 'warning', statusText: 'Elevated', color: '#f59e0b' };
        return { status: 'normal', statusText: 'Normal', color: '#10b981' };
      
      case METRIC_TYPES.BLOOD_GLUCOSE:
        if (value > 126) return { status: 'alert', statusText: 'High', color: '#ef4444' };
        if (value > 100) return { status: 'warning', statusText: 'Elevated', color: '#f59e0b' };
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
          data: [systolic.value, diastolic.value],
          color: statusInfo.color,
          trend: systolic.trend || undefined
        };
      }
      
      return createMetricData('', '--/--');
    })(),
    bmi: createMetricData(METRIC_TYPES.BMI),
    spo2: createMetricData('blood_oxygen_saturation', '98'),
    temperature: createMetricData('body_temperature', '98.6'),
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
    error: null
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        console.log('🔄 useDashboardData: Fetching dashboard overview...');
        setData(prev => ({ ...prev, loading: true, error: null }));

        // Fetch dashboard overview which includes summary and trends
        const overview = await api.dashboard.getOverview();
        console.log('✅ useDashboardData: Dashboard overview fetched successfully');
        
        // Transform the data for dashboard components with fallbacks
        const transformedMetrics = transformHealthSummaryToMetricsData(overview?.summary);
        const transformedChartData = transformTrendsToChartData(overview?.recent_trends);

        setData({
          metrics: transformedMetrics,
          recoveryChartData: transformedChartData,
          healthSummary: overview?.summary || undefined,
          trends: Array.isArray(overview?.recent_trends) ? overview.recent_trends : [],
          loading: false,
          error: null
        });

      } catch (error) {
        console.error('❌ useDashboardData: Failed to fetch dashboard data:', error);
        
        // Provide fallback data instead of showing error for better UX
        const fallbackMetrics: MetricsData = {
          heartRate: { current: '--', status: 'normal', statusText: 'No data', data: [], color: '#6b7280' },
          bloodPressure: { current: '--/--', status: 'normal', statusText: 'No data', data: [], color: '#6b7280' },
          bmi: { current: '--', status: 'normal', statusText: 'No data', data: [], color: '#6b7280' },
          spo2: { current: '--', status: 'normal', statusText: 'No data', data: [], color: '#6b7280' },
          temperature: { current: '--', status: 'normal', statusText: 'No data', data: [], color: '#6b7280' },
          bloodSugar: { current: '--', status: 'normal', statusText: 'No data', data: [], color: '#6b7280' }
        };

        setData({
          metrics: fallbackMetrics,
          recoveryChartData: { labels: [], datasets: [] },
          loading: false,
          error: `Failed to load data: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    };

    fetchDashboardData();
  }, []);

  return data;
} 