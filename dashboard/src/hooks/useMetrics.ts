import { useState, useCallback } from 'react';
import { api, HealthMetric, HealthMetricInput, LatestMetric, HealthSummary, HealthTrend } from '@/lib/api';

interface MetricsState {
  loading: boolean;
  error: string | null;
}

export function useMetrics() {
  const [state, setState] = useState<MetricsState>({
    loading: false,
    error: null
  });

  // Add health metric with validation and fallbacks
  const addMetric = useCallback(async (metric: HealthMetricInput): Promise<HealthMetric | null> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      // Validate input before sending - check for required fields properly
      if (!metric || 
          typeof metric.value !== 'number' || 
          isNaN(metric.value) ||
          !isFinite(metric.value) ||
          !metric.type || 
          metric.unit === undefined || metric.unit === null) {
        throw new Error('Invalid metric data provided');
      }

      const newMetric = await api.health.addMetric(metric);
      
      setState(prev => ({ ...prev, loading: false }));
      return newMetric || null;
    } catch (error) {
      console.error('Failed to add metric:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to add metric'
      }));
      return null;
    }
  }, []);

  // Get metric history with fallbacks (on-demand only)
  const getMetricHistory = useCallback(async (
    type: string,
    params?: {
      start_time?: string;
      end_time?: string;
      limit?: number;
    }
  ): Promise<HealthMetric[]> => {
    try {
      if (!type) {
        throw new Error('Metric type is required');
      }

      setState(prev => ({ ...prev, loading: true, error: null }));
      const response = await api.health.getMetricHistory(type, params);
      setState(prev => ({ ...prev, loading: false }));
      
      return Array.isArray(response?.metrics) ? response.metrics : [];
    } catch (error) {
      console.error('Failed to fetch metric history:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load metric history'
      }));
      return []; // Fallback to empty array
    }
  }, []);

  // Validate health input with fallbacks
  const validateHealthInput = useCallback(async (input: HealthMetricInput): Promise<boolean> => {
    try {
      // Use the same validation logic as addMetric for consistency
      if (!input || 
          typeof input.value !== 'number' || 
          isNaN(input.value) ||
          !isFinite(input.value) ||
          !input.type || 
          input.unit === undefined || input.unit === null) {
        return false; // Basic client-side validation
      }

      const response = await api.health.validateHealthInput(input);
      return response?.valid === true;
    } catch (error) {
      console.error('Failed to validate health input:', error);
      return false; // Fallback to false for safety
    }
  }, []);

  // Delete metric with fallbacks
  const deleteMetric = useCallback(async (type: string, timestamp: string): Promise<boolean> => {
    try {
      if (!type || !timestamp) {
        throw new Error('Type and timestamp are required');
      }

      setState(prev => ({ ...prev, loading: true, error: null }));
      await api.health.deleteMetric(type, timestamp);
      setState(prev => ({ ...prev, loading: false }));
      
      return true;
    } catch (error) {
      console.error('Failed to delete metric:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to delete metric'
      }));
      return false;
    }
  }, []);

  return {
    loading: state.loading,
    error: state.error,
    addMetric,
    getMetricHistory,
    validateHealthInput,
    deleteMetric
  };
} 