import { useState, useEffect, useCallback } from 'react';
import { api, HealthTrend } from '@/lib/api';
import { RecoveryChartData } from './types';

interface RecoveryChartState {
  chartData: RecoveryChartData | null;
  loading: boolean;
  error: string | null;
}

// Transform health trends to chart data with comprehensive fallbacks
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
          const timestamp = point?.timestamp;
          if (!timestamp) return 'Unknown Date';
          return new Date(timestamp).toLocaleDateString();
        } catch (error) {
          console.warn('Invalid date in trend data:', point?.timestamp);
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
      ? trend.data_points
          .map(point => {
            const value = point?.value;
            return typeof value === 'number' && !isNaN(value) ? value : null;
          })
          .filter(value => value !== null) as number[]
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

export function useRecoveryChart(period = 'month') {
  const [state, setState] = useState<RecoveryChartState>({
    chartData: null,
    loading: true,
    error: null
  });

  const fetchChartData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Validate period parameter
      const safePeriod = period || 'month';
      
      // Fetch health trends for key metrics with fallbacks
      const response = await api.health.getHealthTrends({
        period: safePeriod,
        metric_types: 'heart_rate,blood_pressure_systolic,weight,blood_glucose'
      });

      // Handle undefined or null response
      if (!response) {
        throw new Error('No response received from trends API');
      }

      const trends = Array.isArray(response.trends) ? response.trends : [];
      const chartData = transformTrendsToChartData(trends);

      setState({
        chartData,
        loading: false,
        error: null
      });

    } catch (error) {
      console.error('Failed to fetch recovery chart data:', error);
      setState({
        chartData: { labels: [], datasets: [] }, // Fallback to empty chart
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load chart data'
      });
    }
  }, [period]);

  useEffect(() => {
    fetchChartData();
  }, [fetchChartData]);

  return {
    chartData: state.chartData || { labels: [], datasets: [] }, // Ensure we never return null
    loading: state.loading,
    error: state.error,
    refresh: fetchChartData
  };
} 