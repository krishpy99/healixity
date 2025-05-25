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

// Transform engine API data to dashboard format with historical data for graphs
function transformHealthSummaryToMetricsDataWithHistory(
  summary: HealthSummary | null | undefined,
  historicalData: {
    heartRate: number[];
    systolic: number[];
    diastolic: number[];
    bmi: number[];
    spo2: number[];
    temperature: number[];
    bloodSugar: {
      fasting: number[];
      postprandial: number[];
    };
    weight: number[];
    height: number[];
    cholesterolTotal: number[];
    cholesterolHDL: number[];
    cholesterolLDL: number[];
    sleepDuration: number[];
    exerciseDuration: number[];
    waterIntake: number[];
    steps: number[];
  }
): MetricsData {
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
      
      case METRIC_TYPES.BLOOD_GLUCOSE_FASTING:
        if (value > 126) return { status: 'alert', statusText: 'High', color: '#ef4444' };
        if (value > 100) return { status: 'warning', statusText: 'Elevated', color: '#f59e0b' };
        return { status: 'normal', statusText: 'Normal', color: '#10b981' };
      
      case METRIC_TYPES.BLOOD_GLUCOSE_POSTPRANDIAL:
        if (value > 200) return { status: 'alert', statusText: 'High', color: '#ef4444' };
        if (value > 140) return { status: 'warning', statusText: 'Elevated', color: '#f59e0b' };
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
      
      case METRIC_TYPES.WEIGHT:
        // Basic weight status (could be more sophisticated with height consideration)
        if (value > 150 || value < 40) return { status: 'warning', statusText: 'Monitor', color: '#f59e0b' };
        return { status: 'normal', statusText: 'Normal', color: '#10b981' };
      
      case METRIC_TYPES.HEIGHT:
        // Basic height validation
        if (value > 250 || value < 100) return { status: 'warning', statusText: 'Check', color: '#f59e0b' };
        return { status: 'normal', statusText: 'Normal', color: '#10b981' };
      
      case METRIC_TYPES.CHOLESTEROL_TOTAL:
        if (value > 240) return { status: 'alert', statusText: 'High', color: '#ef4444' };
        if (value > 200) return { status: 'warning', statusText: 'Borderline', color: '#f59e0b' };
        return { status: 'normal', statusText: 'Normal', color: '#10b981' };
      
      case METRIC_TYPES.CHOLESTEROL_HDL:
        if (value < 40) return { status: 'alert', statusText: 'Low', color: '#ef4444' };
        if (value < 50) return { status: 'warning', statusText: 'Borderline', color: '#f59e0b' };
        return { status: 'normal', statusText: 'Good', color: '#10b981' };
      
      case METRIC_TYPES.CHOLESTEROL_LDL:
        if (value > 160) return { status: 'alert', statusText: 'High', color: '#ef4444' };
        if (value > 130) return { status: 'warning', statusText: 'Borderline', color: '#f59e0b' };
        return { status: 'normal', statusText: 'Normal', color: '#10b981' };
      
      case METRIC_TYPES.SLEEP_DURATION:
        if (value < 6 || value > 10) return { status: 'warning', statusText: 'Monitor', color: '#f59e0b' };
        if (value < 7 || value > 9) return { status: 'warning', statusText: 'Suboptimal', color: '#f59e0b' };
        return { status: 'normal', statusText: 'Good', color: '#10b981' };
      
      case METRIC_TYPES.EXERCISE_DURATION:
        if (value < 30) return { status: 'warning', statusText: 'Low', color: '#f59e0b' };
        return { status: 'normal', statusText: 'Good', color: '#10b981' };
      
      case METRIC_TYPES.WATER_INTAKE:
        if (value < 2) return { status: 'warning', statusText: 'Low', color: '#f59e0b' };
        return { status: 'normal', statusText: 'Good', color: '#10b981' };
      
      case METRIC_TYPES.STEPS:
        if (value < 5000) return { status: 'warning', statusText: 'Low', color: '#f59e0b' };
        if (value > 10000) return { status: 'normal', statusText: 'Excellent', color: '#10b981' };
        return { status: 'normal', statusText: 'Good', color: '#10b981' };
      
      default:
        return { status: 'normal', statusText: 'Normal', color: '#10b981' };
    }
  };

  const createMetricDataWithHistory = (metricType: string, historyData: number[], defaultValue: string = '--'): MetricData => {
    // Fallback for missing summary or metrics
    if (!summary || !summary.metrics) {
      return {
        current: defaultValue,
        status: 'normal' as const,
        statusText: 'No data',
        data: historyData.length > 0 ? historyData : [],
        color: '#6b7280'
      };
    }

    const metric = summary.metrics[metricType];
    if (!metric || typeof metric.value !== 'number' || !Number.isFinite(metric.value)) {
      return {
        current: defaultValue,
        status: 'normal' as const,
        statusText: 'No data',
        data: historyData.length > 0 ? historyData : [],
        color: '#6b7280'
      };
    }

    const statusInfo = getMetricStatus(metric.value, metricType);
    
    return {
      current: metric.value.toString(),
      unit: metric.unit || '',
      status: statusInfo.status,
      statusText: statusInfo.statusText,
      data: historyData.length > 0 ? historyData : [metric.value], // Use historical data if available
      color: statusInfo.color,
      trend: metric.trend || undefined
    };
  };

  // Fallback for missing summary
  if (!summary || !summary.metrics) {
    return {
      heartRate: { current: '--', status: 'normal', statusText: 'No data', data: historicalData.heartRate, color: '#6b7280' },
      bloodPressure: { current: '--/--', status: 'normal', statusText: 'No data', data: { systolic: historicalData.systolic, diastolic: historicalData.diastolic }, color: '#6b7280' },
      bmi: { current: '--', status: 'normal', statusText: 'No data', data: historicalData.bmi, color: '#6b7280' },
      spo2: { current: '--', status: 'normal', statusText: 'No data', data: historicalData.spo2, color: '#6b7280' },
      temperature: { current: '--', status: 'normal', statusText: 'No data', data: historicalData.temperature, color: '#6b7280' },
      bloodSugar: { current: '--/--', status: 'normal', statusText: 'No data', data: { fasting: historicalData.bloodSugar.fasting, postprandial: historicalData.bloodSugar.postprandial }, color: '#6b7280' },
      weight: { current: '--', status: 'normal', statusText: 'No data', data: historicalData.weight, color: '#6b7280' },
      height: { current: '--', status: 'normal', statusText: 'No data', data: historicalData.height, color: '#6b7280' },
      cholesterolTotal: { current: '--', status: 'normal', statusText: 'No data', data: historicalData.cholesterolTotal, color: '#6b7280' },
      cholesterolHDL: { current: '--', status: 'normal', statusText: 'No data', data: historicalData.cholesterolHDL, color: '#6b7280' },
      cholesterolLDL: { current: '--', status: 'normal', statusText: 'No data', data: historicalData.cholesterolLDL, color: '#6b7280' },
      sleepDuration: { current: '--', status: 'normal', statusText: 'No data', data: historicalData.sleepDuration, color: '#6b7280' },
      exerciseDuration: { current: '--', status: 'normal', statusText: 'No data', data: historicalData.exerciseDuration, color: '#6b7280' },
      waterIntake: { current: '--', status: 'normal', statusText: 'No data', data: historicalData.waterIntake, color: '#6b7280' },
      steps: { current: '--', status: 'normal', statusText: 'No data', data: historicalData.steps, color: '#6b7280' }
    };
  }

  return {
    heartRate: createMetricDataWithHistory(METRIC_TYPES.HEART_RATE, historicalData.heartRate),
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
          data: { 
            systolic: historicalData.systolic.length > 0 ? historicalData.systolic : [systolic.value], 
            diastolic: historicalData.diastolic.length > 0 ? historicalData.diastolic : [diastolic.value] 
          },
          color: statusInfo.color,
          trend: systolic.trend || undefined
        };
      }
      
      return { 
        current: '--/--', 
        status: 'normal' as const, 
        statusText: 'No data', 
        data: { systolic: historicalData.systolic, diastolic: historicalData.diastolic }, 
        color: '#6b7280' 
      };
    })(),
    bmi: createMetricDataWithHistory(METRIC_TYPES.BMI, historicalData.bmi),
    spo2: createMetricDataWithHistory(METRIC_TYPES.BLOOD_OXYGEN_SATURATION, historicalData.spo2, '98'),
    temperature: createMetricDataWithHistory(METRIC_TYPES.BODY_TEMPERATURE, historicalData.temperature, '98.6'),
    bloodSugar: (() => {
      const fasting = summary.metrics?.[METRIC_TYPES.BLOOD_GLUCOSE_FASTING];
      const postprandial = summary.metrics?.[METRIC_TYPES.BLOOD_GLUCOSE_POSTPRANDIAL];
      
      if (fasting && postprandial && typeof fasting.value === 'number' && typeof postprandial.value === 'number') {
        const statusInfo = getMetricStatus(fasting.value, METRIC_TYPES.BLOOD_GLUCOSE_FASTING);
        return {
          current: `${fasting.value}/${postprandial.value}`,
          unit: 'mg/dL',
          status: statusInfo.status,
          statusText: statusInfo.statusText,
          data: { 
            fasting: historicalData.bloodSugar.fasting.length > 0 ? historicalData.bloodSugar.fasting : [fasting.value], 
            postprandial: historicalData.bloodSugar.postprandial.length > 0 ? historicalData.bloodSugar.postprandial : [postprandial.value] 
          },
          color: statusInfo.color,
          trend: fasting.trend || undefined
        };
      }
      
      return { 
        current: '--/--', 
        status: 'normal' as const, 
        statusText: 'No data', 
        data: { fasting: historicalData.bloodSugar.fasting, postprandial: historicalData.bloodSugar.postprandial }, 
        color: '#6b7280' 
      };
    })(),
    weight: createMetricDataWithHistory(METRIC_TYPES.WEIGHT, historicalData.weight),
    height: createMetricDataWithHistory(METRIC_TYPES.HEIGHT, historicalData.height),
    cholesterolTotal: createMetricDataWithHistory(METRIC_TYPES.CHOLESTEROL_TOTAL, historicalData.cholesterolTotal),
    cholesterolHDL: createMetricDataWithHistory(METRIC_TYPES.CHOLESTEROL_HDL, historicalData.cholesterolHDL),
    cholesterolLDL: createMetricDataWithHistory(METRIC_TYPES.CHOLESTEROL_LDL, historicalData.cholesterolLDL),
    sleepDuration: createMetricDataWithHistory(METRIC_TYPES.SLEEP_DURATION, historicalData.sleepDuration),
    exerciseDuration: createMetricDataWithHistory(METRIC_TYPES.EXERCISE_DURATION, historicalData.exerciseDuration),
    waterIntake: createMetricDataWithHistory(METRIC_TYPES.WATER_INTAKE, historicalData.waterIntake),
    steps: createMetricDataWithHistory(METRIC_TYPES.STEPS, historicalData.steps)
  };
}

// Transform engine API data to dashboard format with comprehensive fallbacks (for reload functionality)
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
      
      case METRIC_TYPES.BLOOD_GLUCOSE_FASTING:
        if (value > 126) return { status: 'alert', statusText: 'High', color: '#ef4444' };
        if (value > 100) return { status: 'warning', statusText: 'Elevated', color: '#f59e0b' };
        return { status: 'normal', statusText: 'Normal', color: '#10b981' };
      
      case METRIC_TYPES.BLOOD_GLUCOSE_POSTPRANDIAL:
        if (value > 200) return { status: 'alert', statusText: 'High', color: '#ef4444' };
        if (value > 140) return { status: 'warning', statusText: 'Elevated', color: '#f59e0b' };
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
      data: [metric.value], // Single point for reload functionality
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
      bloodSugar: fallbackMetric,
      weight: fallbackMetric,
      height: fallbackMetric,
      cholesterolTotal: fallbackMetric,
      cholesterolHDL: fallbackMetric,
      cholesterolLDL: fallbackMetric,
      sleepDuration: fallbackMetric,
      exerciseDuration: fallbackMetric,
      waterIntake: fallbackMetric,
      steps: fallbackMetric
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
    bloodSugar: (() => {
      const fasting = summary.metrics?.[METRIC_TYPES.BLOOD_GLUCOSE_FASTING];
      const postprandial = summary.metrics?.[METRIC_TYPES.BLOOD_GLUCOSE_POSTPRANDIAL];
      
      if (fasting && postprandial && typeof fasting.value === 'number' && typeof postprandial.value === 'number') {
        const statusInfo = getMetricStatus(fasting.value, METRIC_TYPES.BLOOD_GLUCOSE_FASTING);
        return {
          current: `${fasting.value}/${postprandial.value}`,
          unit: 'mg/dL',
          status: statusInfo.status,
          statusText: statusInfo.statusText,
          data: { fasting: [fasting.value], postprandial: [postprandial.value] }, // Separate arrays for dual-line plotting
          color: statusInfo.color,
          trend: fasting.trend || undefined
        };
      }
      
      return createMetricData('', '--/--');
    })(),
    weight: createMetricData(METRIC_TYPES.WEIGHT),
    height: createMetricData(METRIC_TYPES.HEIGHT),
    cholesterolTotal: createMetricData(METRIC_TYPES.CHOLESTEROL_TOTAL),
    cholesterolHDL: createMetricData(METRIC_TYPES.CHOLESTEROL_HDL),
    cholesterolLDL: createMetricData(METRIC_TYPES.CHOLESTEROL_LDL),
    sleepDuration: createMetricData(METRIC_TYPES.SLEEP_DURATION),
    exerciseDuration: createMetricData(METRIC_TYPES.EXERCISE_DURATION),
    waterIntake: createMetricData(METRIC_TYPES.WATER_INTAKE),
    steps: createMetricData(METRIC_TYPES.STEPS)
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
      console.log('🔄 useDashboardData: Fetching latest metrics and historical data...');
      setData(prev => ({ ...prev, loading: true, error: null }));

      // Fetch latest metrics for current values
      const latestMetrics = await api.health.getLatestMetrics();
      console.log('✅ useDashboardData: Latest metrics fetched successfully');
      
      // Fetch historical data for all metrics (top 20 for graphs to ensure we have enough data)
      const [
        heartRateHistory,
        systolicHistory,
        diastolicHistory,
        bmiHistory,
        spo2History,
        temperatureHistory,
        bloodSugarHistory,
        fastingHistory,
        postprandialHistory,
        weightHistory,
        heightHistory,
        cholesterolTotalHistory,
        cholesterolHDLHistory,
        cholesterolLDLHistory,
        sleepDurationHistory,
        exerciseDurationHistory,
        waterIntakeHistory,
        stepsHistory
      ] = await Promise.all([
        api.health.getMetricHistory(METRIC_TYPES.HEART_RATE, { limit: 20 }).catch(() => ({ metrics: [] })),
        api.health.getMetricHistory(METRIC_TYPES.BLOOD_PRESSURE_SYSTOLIC, { limit: 20 }).catch(() => ({ metrics: [] })),
        api.health.getMetricHistory(METRIC_TYPES.BLOOD_PRESSURE_DIASTOLIC, { limit: 20 }).catch(() => ({ metrics: [] })),
        api.health.getMetricHistory(METRIC_TYPES.BMI, { limit: 20 }).catch(() => ({ metrics: [] })),
        api.health.getMetricHistory(METRIC_TYPES.BLOOD_OXYGEN_SATURATION, { limit: 20 }).catch(() => ({ metrics: [] })),
        api.health.getMetricHistory(METRIC_TYPES.BODY_TEMPERATURE, { limit: 20 }).catch(() => ({ metrics: [] })),
        api.health.getMetricHistory(METRIC_TYPES.BLOOD_GLUCOSE, { limit: 20 }).catch(() => ({ metrics: [] })),
        api.health.getMetricHistory(METRIC_TYPES.BLOOD_GLUCOSE_FASTING, { limit: 20 }).catch(() => ({ metrics: [] })),
        api.health.getMetricHistory(METRIC_TYPES.BLOOD_GLUCOSE_POSTPRANDIAL, { limit: 20 }).catch(() => ({ metrics: [] })),
        api.health.getMetricHistory(METRIC_TYPES.WEIGHT, { limit: 20 }).catch(() => ({ metrics: [] })),
        api.health.getMetricHistory(METRIC_TYPES.HEIGHT, { limit: 20 }).catch(() => ({ metrics: [] })),
        api.health.getMetricHistory(METRIC_TYPES.CHOLESTEROL_TOTAL, { limit: 20 }).catch(() => ({ metrics: [] })),
        api.health.getMetricHistory(METRIC_TYPES.CHOLESTEROL_HDL, { limit: 20 }).catch(() => ({ metrics: [] })),
        api.health.getMetricHistory(METRIC_TYPES.CHOLESTEROL_LDL, { limit: 20 }).catch(() => ({ metrics: [] })),
        api.health.getMetricHistory(METRIC_TYPES.SLEEP_DURATION, { limit: 20 }).catch(() => ({ metrics: [] })),
        api.health.getMetricHistory(METRIC_TYPES.EXERCISE_DURATION, { limit: 20 }).catch(() => ({ metrics: [] })),
        api.health.getMetricHistory(METRIC_TYPES.WATER_INTAKE, { limit: 20 }).catch(() => ({ metrics: [] })),
        api.health.getMetricHistory(METRIC_TYPES.STEPS, { limit: 20 }).catch(() => ({ metrics: [] }))
      ]);
      
      console.log('✅ useDashboardData: Historical data fetched for all metrics');
      
      // Synchronize blood pressure data by timestamp
      const synchronizeBloodPressureData = () => {
        const systolicData = systolicHistory.metrics || [];
        const diastolicData = diastolicHistory.metrics || [];
        
        // Create a map of timestamps to values for both systolic and diastolic
        const systolicMap = new Map(systolicData.map(m => [m.timestamp, m.value]));
        const diastolicMap = new Map(diastolicData.map(m => [m.timestamp, m.value]));
        
        // Get all unique timestamps and sort them (newest first)
        const allTimestamps = Array.from(new Set([
          ...systolicData.map(m => m.timestamp),
          ...diastolicData.map(m => m.timestamp)
        ])).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
        
        // Create synchronized arrays - only include timestamps where we have both values
        const syncedSystolic: number[] = [];
        const syncedDiastolic: number[] = [];
        
        for (const timestamp of allTimestamps) {
          const systolicValue = systolicMap.get(timestamp);
          const diastolicValue = diastolicMap.get(timestamp);
          
          // Only include if we have both values for this timestamp
          if (systolicValue !== undefined && diastolicValue !== undefined) {
            syncedSystolic.push(systolicValue);
            syncedDiastolic.push(diastolicValue);
          }
        }
        
        console.log(`🔄 Blood pressure sync: ${syncedSystolic.length} synchronized data points`);
        return { syncedSystolic, syncedDiastolic };
      };
      
      const { syncedSystolic, syncedDiastolic } = synchronizeBloodPressureData();
      
      // Synchronize blood glucose data by timestamp
      const synchronizeBloodGlucoseData = () => {
        const fastingData = fastingHistory.metrics || [];
        const postprandialData = postprandialHistory.metrics || [];
        
        // Create a map of timestamps to values for both fasting and postprandial
        const fastingMap = new Map(fastingData.map(m => [m.timestamp, m.value]));
        const postprandialMap = new Map(postprandialData.map(m => [m.timestamp, m.value]));
        
        // Get all unique timestamps and sort them (newest first)
        const allTimestamps = Array.from(new Set([
          ...fastingData.map(m => m.timestamp),
          ...postprandialData.map(m => m.timestamp)
        ])).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
        
        // Create synchronized arrays - only include timestamps where we have both values
        const syncedFasting: number[] = [];
        const syncedPostprandial: number[] = [];
        
        for (const timestamp of allTimestamps) {
          const fastingValue = fastingMap.get(timestamp);
          const postprandialValue = postprandialMap.get(timestamp);
          
          // Only include if we have both values for this timestamp
          if (fastingValue !== undefined && postprandialValue !== undefined) {
            syncedFasting.push(fastingValue);
            syncedPostprandial.push(postprandialValue);
          }
        }
        
        console.log(`🔄 Blood glucose sync: ${syncedFasting.length} synchronized data points`);
        return { syncedFasting, syncedPostprandial };
      };
      
      const { syncedFasting, syncedPostprandial } = synchronizeBloodGlucoseData();
      
      // Create a health summary from latest metrics
      const healthSummary: HealthSummary = {
        user_id: 'current_user', // Will be replaced with actual user ID
        last_updated: new Date().toISOString(),
        metrics: latestMetrics.metrics
      };
      
      // Transform the data with historical values for graphs
      const transformedMetrics = transformHealthSummaryToMetricsDataWithHistory(healthSummary, {
        heartRate: heartRateHistory.metrics?.map(m => m.value) || [],
        systolic: syncedSystolic,
        diastolic: syncedDiastolic,
        bmi: bmiHistory.metrics?.map(m => m.value) || [],
        spo2: spo2History.metrics?.map(m => m.value) || [],
        temperature: temperatureHistory.metrics?.map(m => m.value) || [],
        bloodSugar: {
          fasting: syncedFasting,
          postprandial: syncedPostprandial
        },
        weight: weightHistory.metrics?.map(m => m.value) || [],
        height: heightHistory.metrics?.map(m => m.value) || [],
        cholesterolTotal: cholesterolTotalHistory.metrics?.map(m => m.value) || [],
        cholesterolHDL: cholesterolHDLHistory.metrics?.map(m => m.value) || [],
        cholesterolLDL: cholesterolLDLHistory.metrics?.map(m => m.value) || [],
        sleepDuration: sleepDurationHistory.metrics?.map(m => m.value) || [],
        exerciseDuration: exerciseDurationHistory.metrics?.map(m => m.value) || [],
        waterIntake: waterIntakeHistory.metrics?.map(m => m.value) || [],
        steps: stepsHistory.metrics?.map(m => m.value) || []
      });
      
      // For now, use empty chart data since we're focusing on metric cards
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
      console.error('❌ useDashboardData: Failed to fetch metrics data:', error);
      
      // Provide fallback data instead of showing error for better UX
      const fallbackMetrics: MetricsData = {
        heartRate: { current: '--', status: 'normal', statusText: 'No data', data: [], color: '#6b7280' },
        bloodPressure: { current: '--/--', status: 'normal', statusText: 'No data', data: { systolic: [], diastolic: [] }, color: '#6b7280' },
        bmi: { current: '--', status: 'normal', statusText: 'No data', data: [], color: '#6b7280' },
        spo2: { current: '--', status: 'normal', statusText: 'No data', data: [], color: '#6b7280' },
        temperature: { current: '--', status: 'normal', statusText: 'No data', data: [], color: '#6b7280' },
        bloodSugar: { current: '--/--', status: 'normal', statusText: 'No data', data: { fasting: [], postprandial: [] }, color: '#6b7280' },
        weight: { current: '--', status: 'normal', statusText: 'No data', data: [], color: '#6b7280' },
        height: { current: '--', status: 'normal', statusText: 'No data', data: [], color: '#6b7280' },
        cholesterolTotal: { current: '--', status: 'normal', statusText: 'No data', data: [], color: '#6b7280' },
        cholesterolHDL: { current: '--', status: 'normal', statusText: 'No data', data: [], color: '#6b7280' },
        cholesterolLDL: { current: '--', status: 'normal', statusText: 'No data', data: [], color: '#6b7280' },
        sleepDuration: { current: '--', status: 'normal', statusText: 'No data', data: [], color: '#6b7280' },
        exerciseDuration: { current: '--', status: 'normal', statusText: 'No data', data: [], color: '#6b7280' },
        waterIntake: { current: '--', status: 'normal', statusText: 'No data', data: [], color: '#6b7280' },
        steps: { current: '--', status: 'normal', statusText: 'No data', data: [], color: '#6b7280' }
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
        
        // Synchronize blood pressure data by timestamp
        const synchronizeBloodPressureData = () => {
          const systolicData = systolicHistory.metrics || [];
          const diastolicData = diastolicHistory.metrics || [];
          
          // Create a map of timestamps to values for both systolic and diastolic
          const systolicMap = new Map(systolicData.map(m => [m.timestamp, m.value]));
          const diastolicMap = new Map(diastolicData.map(m => [m.timestamp, m.value]));
          
          // Get all unique timestamps and sort them (newest first)
          const allTimestamps = Array.from(new Set([
            ...systolicData.map(m => m.timestamp),
            ...diastolicData.map(m => m.timestamp)
          ])).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
          
          // Create synchronized arrays - only include timestamps where we have both values
          const syncedSystolic: number[] = [];
          const syncedDiastolic: number[] = [];
          
          for (const timestamp of allTimestamps) {
            const systolicValue = systolicMap.get(timestamp);
            const diastolicValue = diastolicMap.get(timestamp);
            
            // Only include if we have both values for this timestamp
            if (systolicValue !== undefined && diastolicValue !== undefined) {
              syncedSystolic.push(systolicValue);
              syncedDiastolic.push(diastolicValue);
            }
          }
          
          console.log(`🔄 Blood pressure reload sync: ${syncedSystolic.length} synchronized data points`);
          return { syncedSystolic, syncedDiastolic };
        };
        
        const { syncedSystolic, syncedDiastolic } = synchronizeBloodPressureData();
        
        // Update the blood pressure data with historical values
        setData(prev => {
          if (!prev.metrics) return prev;
          
          // Get latest values for display
          const latestSystolic = syncedSystolic[0] || 0;
          const latestDiastolic = syncedDiastolic[0] || 0;
          
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
                data: { systolic: syncedSystolic, diastolic: syncedDiastolic }, // Synchronized historical data for plotting
                color: statusInfo.color,
                trend: prev.metrics.bloodPressure.trend
              }
            }
          };
        });
      } else if (metricType === METRIC_TYPES.BLOOD_GLUCOSE) {
        // Handle blood glucose specially - need to fetch both fasting and postprandial
        const [fastingHistory, postprandialHistory] = await Promise.all([
          api.health.getMetricHistory(METRIC_TYPES.BLOOD_GLUCOSE_FASTING, { limit: 20 }),
          api.health.getMetricHistory(METRIC_TYPES.BLOOD_GLUCOSE_POSTPRANDIAL, { limit: 20 })
        ]);
        
        console.log(`✅ useDashboardData: Blood glucose history fetched`);
        
        // Synchronize blood glucose data by timestamp
        const synchronizeBloodGlucoseData = () => {
          const fastingData = fastingHistory.metrics || [];
          const postprandialData = postprandialHistory.metrics || [];
          
          // Create a map of timestamps to values for both fasting and postprandial
          const fastingMap = new Map(fastingData.map(m => [m.timestamp, m.value]));
          const postprandialMap = new Map(postprandialData.map(m => [m.timestamp, m.value]));
          
          // Get all unique timestamps and sort them (newest first)
          const allTimestamps = Array.from(new Set([
            ...fastingData.map(m => m.timestamp),
            ...postprandialData.map(m => m.timestamp)
          ])).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
          
          // Create synchronized arrays - only include timestamps where we have both values
          const syncedFasting: number[] = [];
          const syncedPostprandial: number[] = [];
          
          for (const timestamp of allTimestamps) {
            const fastingValue = fastingMap.get(timestamp);
            const postprandialValue = postprandialMap.get(timestamp);
            
            // Only include if we have both values for this timestamp
            if (fastingValue !== undefined && postprandialValue !== undefined) {
              syncedFasting.push(fastingValue);
              syncedPostprandial.push(postprandialValue);
            }
          }
          
          console.log(`🔄 Blood glucose reload sync: ${syncedFasting.length} synchronized data points`);
          return { syncedFasting, syncedPostprandial };
        };
        
        const { syncedFasting, syncedPostprandial } = synchronizeBloodGlucoseData();
        
        // Update the blood glucose data with historical values
        setData(prev => {
          if (!prev.metrics) return prev;
          
          // Get latest values for display
          const latestFasting = syncedFasting[0] || 0;
          const latestPostprandial = syncedPostprandial[0] || 0;
          
          const statusInfo = getMetricStatus(latestFasting, METRIC_TYPES.BLOOD_GLUCOSE_FASTING);
          
          return {
            ...prev,
            metrics: {
              ...prev.metrics,
              bloodSugar: {
                current: `${latestFasting}/${latestPostprandial}`,
                unit: 'mg/dL',
                status: statusInfo.status,
                statusText: statusInfo.statusText,
                data: { fasting: syncedFasting, postprandial: syncedPostprandial }, // Synchronized historical data for plotting
                color: statusInfo.color,
                trend: prev.metrics.bloodSugar.trend
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
      [METRIC_TYPES.BLOOD_GLUCOSE]: 'bloodSugar',
      [METRIC_TYPES.WEIGHT]: 'weight',
      [METRIC_TYPES.HEIGHT]: 'height',
      [METRIC_TYPES.CHOLESTEROL_TOTAL]: 'cholesterolTotal',
      [METRIC_TYPES.CHOLESTEROL_HDL]: 'cholesterolHDL',
      [METRIC_TYPES.CHOLESTEROL_LDL]: 'cholesterolLDL',
      [METRIC_TYPES.SLEEP_DURATION]: 'sleepDuration',
      [METRIC_TYPES.EXERCISE_DURATION]: 'exerciseDuration',
      [METRIC_TYPES.WATER_INTAKE]: 'waterIntake',
      [METRIC_TYPES.STEPS]: 'steps'
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
      
      case METRIC_TYPES.BLOOD_GLUCOSE_FASTING:
        if (value > 126) return { status: 'alert', statusText: 'High', color: '#ef4444' };
        if (value > 100) return { status: 'warning', statusText: 'Elevated', color: '#f59e0b' };
        return { status: 'normal', statusText: 'Normal', color: '#10b981' };
      
      case METRIC_TYPES.BLOOD_GLUCOSE_POSTPRANDIAL:
        if (value > 200) return { status: 'alert', statusText: 'High', color: '#ef4444' };
        if (value > 140) return { status: 'warning', statusText: 'Elevated', color: '#f59e0b' };
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
      
      case METRIC_TYPES.WEIGHT:
        // Basic weight status (could be more sophisticated with height consideration)
        if (value > 150 || value < 40) return { status: 'warning', statusText: 'Monitor', color: '#f59e0b' };
        return { status: 'normal', statusText: 'Normal', color: '#10b981' };
      
      case METRIC_TYPES.HEIGHT:
        // Basic height validation
        if (value > 250 || value < 100) return { status: 'warning', statusText: 'Check', color: '#f59e0b' };
        return { status: 'normal', statusText: 'Normal', color: '#10b981' };
      
      case METRIC_TYPES.CHOLESTEROL_TOTAL:
        if (value > 240) return { status: 'alert', statusText: 'High', color: '#ef4444' };
        if (value > 200) return { status: 'warning', statusText: 'Borderline', color: '#f59e0b' };
        return { status: 'normal', statusText: 'Normal', color: '#10b981' };
      
      case METRIC_TYPES.CHOLESTEROL_HDL:
        if (value < 40) return { status: 'alert', statusText: 'Low', color: '#ef4444' };
        if (value < 50) return { status: 'warning', statusText: 'Borderline', color: '#f59e0b' };
        return { status: 'normal', statusText: 'Good', color: '#10b981' };
      
      case METRIC_TYPES.CHOLESTEROL_LDL:
        if (value > 160) return { status: 'alert', statusText: 'High', color: '#ef4444' };
        if (value > 130) return { status: 'warning', statusText: 'Borderline', color: '#f59e0b' };
        return { status: 'normal', statusText: 'Normal', color: '#10b981' };
      
      case METRIC_TYPES.SLEEP_DURATION:
        if (value < 6 || value > 10) return { status: 'warning', statusText: 'Monitor', color: '#f59e0b' };
        if (value < 7 || value > 9) return { status: 'warning', statusText: 'Suboptimal', color: '#f59e0b' };
        return { status: 'normal', statusText: 'Good', color: '#10b981' };
      
      case METRIC_TYPES.EXERCISE_DURATION:
        if (value < 30) return { status: 'warning', statusText: 'Low', color: '#f59e0b' };
        return { status: 'normal', statusText: 'Good', color: '#10b981' };
      
      case METRIC_TYPES.WATER_INTAKE:
        if (value < 2) return { status: 'warning', statusText: 'Low', color: '#f59e0b' };
        return { status: 'normal', statusText: 'Good', color: '#10b981' };
      
      case METRIC_TYPES.STEPS:
        if (value < 5000) return { status: 'warning', statusText: 'Low', color: '#f59e0b' };
        if (value > 10000) return { status: 'normal', statusText: 'Excellent', color: '#10b981' };
        return { status: 'normal', statusText: 'Good', color: '#10b981' };
      
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