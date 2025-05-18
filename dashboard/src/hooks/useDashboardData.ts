import { useMetrics } from './useMetrics';
import { useRecoveryChart } from './useRecoveryChart';

/**
 * A composite hook that combines multiple data sources for the dashboard
 * This provides a single entry point for dashboard data
 */
export function useDashboardData() {
  const { metrics, loading: metricsLoading, error: metricsError } = useMetrics();
  const { chartData: recoveryChartData, loading: chartLoading, error: chartError } = useRecoveryChart();
  
  // Compute overall loading and error states
  const loading = metricsLoading || chartLoading;
  const error = metricsError || chartError;
  
  return {
    // Health metrics
    metrics,
    metricsLoading,
    metricsError,
    
    // Recovery chart data
    recoveryChartData,
    chartLoading,
    chartError,
    
    // Overall data states
    loading,
    error,
    
    // Combined data ready state
    isReady: !loading && !error && metrics !== null && recoveryChartData !== null
  };
} 