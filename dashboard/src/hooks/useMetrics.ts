import { useState, useEffect } from 'react';
import { get } from './api';
import { MetricsData } from './types';

/**
 * Custom hook for fetching health metrics data
 */
export function useMetrics() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const data = await get<MetricsData>('/api/metrics');
        setMetrics(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching metrics:', err);
        setError('Failed to load health metrics');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  return { metrics, loading, error };
} 