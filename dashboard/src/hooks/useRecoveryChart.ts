import { useState, useEffect } from 'react';
import { get } from './api';
import { RecoveryChartData } from './types';

/**
 * Custom hook for fetching recovery chart data
 */
export function useRecoveryChart() {
  const [chartData, setChartData] = useState<RecoveryChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchChartData = async () => {
      try {
        setLoading(true);
        const data = await get<RecoveryChartData>('/api/recovery-chart');
        setChartData(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching recovery chart data:', err);
        setError('Failed to load recovery progress data');
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
  }, []);

  return { chartData, loading, error };
} 