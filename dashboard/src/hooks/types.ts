/**
 * Types aligned with Health Dashboard Backend API
 */

// Health Metrics from Engine API
export interface HealthMetric {
  user_id: string;
  timestamp: string;
  type: string;
  value: number;
  unit: string;
  notes?: string;
  source?: string;
}

export interface LatestMetric {
  value: number;
  unit: string;
  timestamp: string;
  trend?: 'up' | 'down' | 'stable';
}

export interface HealthSummary {
  user_id: string;
  last_updated: string;
  metrics: Record<string, LatestMetric>;
}

export interface HealthTrend {
  metric_type: string;
  period: string;
  data_points: Array<{
    timestamp: string;
    value: number;
  }>;
  average: number;
  min: number;
  max: number;
  trend: string;
}

// Dashboard-specific transformed types
export interface MetricData {
  current: string;
  unit?: string;
  status: "normal" | "warning" | "alert";
  statusText: string;
  data: number[] | { systolic: number[]; diastolic: number[] };
  color: string;
  trend?: 'up' | 'down' | 'stable';
}

export interface MetricsData {
  heartRate: MetricData;
  bloodPressure: MetricData;
  bmi: MetricData;
  spo2: MetricData;
  temperature: MetricData;
  bloodSugar: MetricData;
}

// Recovery Chart
export interface ChartDataset {
  label: string;
  data: number[];
  borderColor: string;
  backgroundColor: string;
}

export interface RecoveryChartData {
  labels: string[];
  datasets: ChartDataset[];
}

// Documents from Engine API
export interface Document {
  id: string;
  user_id: string;
  title: string;
  category: string;
  description?: string;
  filename: string;
  file_size: number;
  content_type: string;
  upload_date: string;
  processed: boolean;
  processing_status?: string;
  s3_key: string;
}

export interface DocumentUploadRequest {
  title: string;
  category: string;
  description?: string;
}

export interface DocumentUploadResponse {
  document_id: string;
  upload_url?: string;
  message: string;
}

// Chat Messages from Engine API
export interface ChatMessage {
  id: string;
  session_id: string;
  user_id: string;
  message: string;
  response: string;
  timestamp: string;
  tokens_used: number;
  sources?: string[];
}

export interface ChatRequest {
  message: string;
  session_id?: string;
}

export interface ChatResponse {
  id: string;
  message: string;
  session_id: string;
  timestamp: string;
  tokens_used: number;
  processing_time_ms: number;
}

export interface ChatHistory {
  user_id: string;
  sessions: any[];
  total_count: number;
  has_more: boolean;
}

// Dashboard Overview from Engine API
export interface DashboardOverview {
  summary: HealthSummary;
  recent_trends: HealthTrend[];
  health_score: {
    score: number;
    category: string;
    description: string;
  };
  recommendations: Array<{
    type: string;
    title: string;
    description: string;
    priority: string;
  }>;
  alerts: Array<{
    type: string;
    message: string;
    severity: string;
  }>;
}

// User from Engine API
export interface User {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  created_at: string;
  updated_at: string;
}

// Supported metrics from Engine API
export interface MetricInfo {
  name: string;
  unit: string;
  category: string;
  normal_range?: {
    min: number;
    max: number;
  };
}

// API Error
export interface ApiError {
  message: string;
  status: number;
}

// Legacy types for backward compatibility (can be removed as components are updated)
export interface SendMessagePayload {
  message: string;
  isUser: boolean;
  senderName?: string;
}

// UI-specific types
export type MetricStatus = 'normal' | 'warning' | 'alert';
export type TrendDirection = 'up' | 'down' | 'stable';
export type Priority = 'low' | 'medium' | 'high';
export type Severity = 'info' | 'warning' | 'error';

// Metric type constants from engine
export const METRIC_TYPES = {
  BLOOD_PRESSURE: 'blood_pressure',
  BLOOD_PRESSURE_SYSTOLIC: 'blood_pressure_systolic',
  BLOOD_PRESSURE_DIASTOLIC: 'blood_pressure_diastolic',
  HEART_RATE: 'heart_rate',
  WEIGHT: 'weight',
  HEIGHT: 'height',
  BMI: 'bmi',
  BLOOD_GLUCOSE: 'blood_glucose',
  BLOOD_OXYGEN_SATURATION: 'blood_oxygen_saturation',
  BODY_TEMPERATURE: 'body_temperature',
  CHOLESTEROL_TOTAL: 'cholesterol_total',
  CHOLESTEROL_HDL: 'cholesterol_hdl',
  CHOLESTEROL_LDL: 'cholesterol_ldl',
  SLEEP_DURATION: 'sleep_duration',
  EXERCISE_DURATION: 'exercise_duration',
  WATER_INTAKE: 'water_intake',
  STEPS: 'steps',
} as const;

export type MetricType = typeof METRIC_TYPES[keyof typeof METRIC_TYPES];

// Metric unit mapping based on backend SupportedMetrics
export const METRIC_UNITS = {
  [METRIC_TYPES.BLOOD_PRESSURE]: 'mmHg',
  [METRIC_TYPES.HEART_RATE]: 'bpm',
  [METRIC_TYPES.BLOOD_PRESSURE_SYSTOLIC]: 'mmHg',
  [METRIC_TYPES.BLOOD_PRESSURE_DIASTOLIC]: 'mmHg',
  [METRIC_TYPES.BMI]: 'kg/m²',
  [METRIC_TYPES.BLOOD_GLUCOSE]: 'mg/dL',
  [METRIC_TYPES.BLOOD_OXYGEN_SATURATION]: '%',
  [METRIC_TYPES.BODY_TEMPERATURE]: '°C',
  [METRIC_TYPES.WEIGHT]: 'kg',
  [METRIC_TYPES.HEIGHT]: 'cm',
  [METRIC_TYPES.CHOLESTEROL_TOTAL]: 'mg/dL',
  [METRIC_TYPES.CHOLESTEROL_HDL]: 'mg/dL',
  [METRIC_TYPES.CHOLESTEROL_LDL]: 'mg/dL',
  [METRIC_TYPES.SLEEP_DURATION]: 'hours',
  [METRIC_TYPES.EXERCISE_DURATION]: 'minutes',
  [METRIC_TYPES.WATER_INTAKE]: 'liters',
  [METRIC_TYPES.STEPS]: 'count',
} as const;

// Helper function to get the correct unit for a metric type
export function getMetricUnit(metricType: string): string {
  return METRIC_UNITS[metricType as keyof typeof METRIC_UNITS] || '';
}

// Helper function to get metric display name
export function getMetricDisplayName(metricType: string): string {
  const displayNames: Record<string, string> = {
    [METRIC_TYPES.BLOOD_PRESSURE]: 'Blood Pressure',
    [METRIC_TYPES.HEART_RATE]: 'Heart Rate',
    [METRIC_TYPES.BLOOD_PRESSURE_SYSTOLIC]: 'Blood Pressure (Systolic)',
    [METRIC_TYPES.BLOOD_PRESSURE_DIASTOLIC]: 'Blood Pressure (Diastolic)',
    [METRIC_TYPES.BMI]: 'Body Mass Index',
    [METRIC_TYPES.BLOOD_GLUCOSE]: 'Blood Glucose',
    [METRIC_TYPES.BLOOD_OXYGEN_SATURATION]: 'Blood Oxygen Saturation (SpO2)',
    [METRIC_TYPES.BODY_TEMPERATURE]: 'Body Temperature',
    [METRIC_TYPES.WEIGHT]: 'Weight',
    [METRIC_TYPES.HEIGHT]: 'Height',
    [METRIC_TYPES.CHOLESTEROL_TOTAL]: 'Total Cholesterol',
    [METRIC_TYPES.CHOLESTEROL_HDL]: 'HDL Cholesterol',
    [METRIC_TYPES.CHOLESTEROL_LDL]: 'LDL Cholesterol',
    [METRIC_TYPES.SLEEP_DURATION]: 'Sleep Duration',
    [METRIC_TYPES.EXERCISE_DURATION]: 'Exercise Duration',
    [METRIC_TYPES.WATER_INTAKE]: 'Water Intake',
    [METRIC_TYPES.STEPS]: 'Steps',
  };
  return displayNames[metricType] || metricType;
} 