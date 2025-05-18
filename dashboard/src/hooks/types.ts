/**
 * Common types used throughout the application
 */

// Health Metrics
export interface MetricData {
  current: string;
  unit?: string;
  status: "normal" | "warning" | "alert";
  statusText: string;
  data: number[];
  color: string;
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

// Documents
export interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
}

export interface DocumentUploadPayload {
  name: string;
  type: string;
  size: number;
}

// Chat Messages
export interface ChatMessage {
  id: string;
  message: string;
  timestamp: string;
  isUser: boolean;
  senderName?: string;
}

export interface SendMessagePayload {
  message: string;
  isUser: boolean;
  senderName?: string;
} 