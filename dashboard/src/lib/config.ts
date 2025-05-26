/**
 * Configuration for the Health Dashboard Frontend
 */

export const config = {
  // API Configuration
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
  testMode: process.env.NEXT_PUBLIC_TEST_MODE === 'true',
  
  // Environment
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  
  // Feature Flags
  features: {
    documentProcessing: true,
    healthTrends: true,
    aiInsights: true,
  },
  
  // UI Configuration
  ui: {
    defaultTheme: 'light',
    enableAnimations: true,
    autoRefreshInterval: 30000, // 30 seconds
  },
  
  // Health Metrics Configuration
  healthMetrics: {
    defaultPeriod: 'month',
    maxHistoryLimit: 100,
    supportedTypes: [
      'blood_pressure_systolic',
      'blood_pressure_diastolic',
      'heart_rate',
      'weight',
      'height',
      'bmi',
      'blood_glucose',
      'cholesterol_total',
      'cholesterol_hdl',
      'cholesterol_ldl',
      'sleep_duration',
      'exercise_duration',
      'water_intake',
      'steps',
    ],
  },
  
  // Document Configuration
  documents: {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: [
      'application/pdf',
      'text/plain',
      'text/markdown',
    ],
    categories: [
      'lab_results',
      'prescription',
      'medical_report',
      'insurance',
      'general',
    ],
  },
  
  // Chat Configuration
  chat: {
    maxMessageLength: 1000,
  },
} as const;

export default config; 