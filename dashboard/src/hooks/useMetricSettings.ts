import { useState, useEffect } from 'react';
import { METRIC_TYPES } from './types';

const STORAGE_KEY = 'pfhealth-metric-settings';

// Default metrics to show (the current 6 metrics)
const DEFAULT_SELECTED_METRICS = [
  METRIC_TYPES.HEART_RATE,
  METRIC_TYPES.BLOOD_PRESSURE,
  METRIC_TYPES.BMI,
  METRIC_TYPES.BLOOD_OXYGEN_SATURATION,
  METRIC_TYPES.BODY_TEMPERATURE,
  METRIC_TYPES.BLOOD_GLUCOSE,
  METRIC_TYPES.WEIGHT,
];

export interface MetricSettings {
  selectedMetrics: string[];
}

export function useMetricSettings() {
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(DEFAULT_SELECTED_METRICS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem(STORAGE_KEY);
      if (savedSettings) {
        const parsed: MetricSettings = JSON.parse(savedSettings);
        if (parsed.selectedMetrics && Array.isArray(parsed.selectedMetrics)) {
          // Validate that all saved metrics are still valid
          const validMetrics = parsed.selectedMetrics.filter(metric => 
            Object.values(METRIC_TYPES).includes(metric as any)
          );
          
          // Migration: Add weight metric if it's missing from saved settings
          if (validMetrics.length > 0 && !validMetrics.includes(METRIC_TYPES.WEIGHT)) {
            validMetrics.push(METRIC_TYPES.WEIGHT);
            // Save the updated settings
            const updatedSettings: MetricSettings = { selectedMetrics: validMetrics };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSettings));
          }
          
          // If we have valid metrics, use them; otherwise use defaults
          if (validMetrics.length > 0) {
            setSelectedMetrics(validMetrics);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load metric settings from localStorage:', error);
      // Use defaults if loading fails
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save settings to localStorage whenever they change
  const saveSettings = (newSelectedMetrics: string[]) => {
    try {
      const settings: MetricSettings = {
        selectedMetrics: newSelectedMetrics,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      setSelectedMetrics(newSelectedMetrics);
    } catch (error) {
      console.error('Failed to save metric settings to localStorage:', error);
    }
  };

  // Reset to defaults
  const resetToDefaults = () => {
    saveSettings(DEFAULT_SELECTED_METRICS);
  };

  // Check if a metric is selected
  const isMetricSelected = (metricType: string) => {
    return selectedMetrics.includes(metricType);
  };

  // Get all available metrics
  const getAllMetrics = () => {
    return Object.values(METRIC_TYPES);
  };

  return {
    selectedMetrics,
    isLoaded,
    saveSettings,
    resetToDefaults,
    isMetricSelected,
    getAllMetrics,
  };
} 