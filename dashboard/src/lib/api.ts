/**
 * API service layer for Health Dashboard Backend integration
 */

// Environment configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
const TEST_MODE = process.env.NEXT_PUBLIC_TEST_MODE === 'true';

// API response wrapper
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// Error handling for API responses
class ApiError extends Error {
  status: number;
  
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

// Generic fetch function with authentication and fallbacks
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Default headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // Add auth token if not in test mode
  if (!TEST_MODE) {
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      let errorText = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorBody = await response.text();
        if (errorBody) errorText = errorBody;
      } catch (parseError) {
        // If we can't parse the error body, use the status text
        console.warn('Failed to parse error response:', parseError);
      }
      throw new ApiError(errorText, response.status);
    }

    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      // If response is not JSON, return empty object
      console.warn('Failed to parse JSON response:', parseError);
      return {} as T;
    }
    
    // Handle wrapped API responses with fallbacks
    if (data && typeof data === 'object' && data.success !== undefined) {
      if (!data.success) {
        throw new ApiError(data.message || 'API request failed', response.status);
      }
      return data.data || {} as T;
    }
    
    return data || {} as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Network or other errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown network error';
    throw new ApiError(`Network error: ${errorMessage}`, 0);
  }
}

// Helper function to get auth token (implement based on your auth system)
function getAuthToken(): string | null {
  // In a real app, you'd get this from your auth provider (Clerk, Auth0, etc.)
  if (typeof window !== 'undefined') {
    return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  }
  return null;
}

// Health Data API
export interface HealthMetric {
  user_id: string;
  timestamp: string;
  type: string;
  value: number;
  unit: string;
  notes?: string;
  source?: string;
}

export interface HealthMetricInput {
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

export const healthApi = {
  // Add health metric
  addMetric: (metric: HealthMetricInput): Promise<HealthMetric> =>
    apiRequest('/api/health/metrics', {
      method: 'POST',
      body: JSON.stringify(metric),
    }),

  // Get metric history
  getMetricHistory: (
    type: string,
    params?: {
      start_time?: string;
      end_time?: string;
      limit?: number;
    }
  ): Promise<{ metric_type: string; count: number; metrics: HealthMetric[] }> => {
    const queryParams = new URLSearchParams();
    if (params?.start_time) queryParams.append('start_time', params.start_time);
    if (params?.end_time) queryParams.append('end_time', params.end_time);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const query = queryParams.toString();
    return apiRequest(`/api/health/metrics/${type}${query ? `?${query}` : ''}`);
  },

  // Get latest metrics
  getLatestMetrics: (): Promise<{ metrics: Record<string, LatestMetric>; count: number }> =>
    apiRequest('/api/health/latest'),

  // Get health summary
  getHealthSummary: (): Promise<HealthSummary> =>
    apiRequest('/api/health/summary'),

  // Get health trends
  getHealthTrends: (params?: {
    period?: string;
    metric_types?: string;
  }): Promise<{ period: string; trends: HealthTrend[]; count: number }> => {
    const queryParams = new URLSearchParams();
    if (params?.period) queryParams.append('period', params.period);
    if (params?.metric_types) queryParams.append('metric_types', params.metric_types);
    
    const query = queryParams.toString();
    return apiRequest(`/api/health/trends${query ? `?${query}` : ''}`);
  },

  // Get supported metrics
  getSupportedMetrics: (): Promise<{ metrics: any; count: number }> =>
    apiRequest('/api/health/supported-metrics'),

  // Validate health input
  validateHealthInput: (input: HealthMetricInput): Promise<{ valid: boolean; metric_type: string; value: number; unit: string }> =>
    apiRequest('/api/health/validate', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  // Delete health data (when implemented)
  deleteMetric: (type: string, timestamp: string): Promise<void> =>
    apiRequest(`/api/health/metrics/${type}/${timestamp}`, {
      method: 'DELETE',
    }),
};

// Dashboard API
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

export const dashboardApi = {
  // Get dashboard summary
  getSummary: (): Promise<any> =>
    apiRequest('/api/dashboard/summary'),

  // Get dashboard trends
  getTrends: (params?: {
    period?: string;
    metric_types?: string;
  }): Promise<{ period: string; trends: any; count: number }> => {
    const queryParams = new URLSearchParams();
    if (params?.period) queryParams.append('period', params.period);
    if (params?.metric_types) queryParams.append('metric_types', params.metric_types);
    
    const query = queryParams.toString();
    return apiRequest(`/api/dashboard/trends${query ? `?${query}` : ''}`);
  },

  // Get dashboard overview
  getOverview: (): Promise<DashboardOverview> =>
    apiRequest('/api/dashboard/overview'),
};

// Document API
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

export const documentApi = {
  // Upload document
  uploadDocument: (file: File, metadata: DocumentUploadRequest): Promise<DocumentUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', metadata.title);
    formData.append('category', metadata.category);
    if (metadata.description) {
      formData.append('description', metadata.description);
    }

    return apiRequest('/api/documents/upload', {
      method: 'POST',
      body: formData,
      headers: {}, // Don't set Content-Type for FormData
    });
  },

  // List documents
  listDocuments: (params?: {
    limit?: number;
    cursor?: string;
  }): Promise<{ documents: Document[]; next_cursor?: string; has_more: boolean }> => {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.cursor) queryParams.append('cursor', params.cursor);
    
    const query = queryParams.toString();
    return apiRequest(`/api/documents${query ? `?${query}` : ''}`);
  },

  // Get document
  getDocument: (id: string): Promise<Document> =>
    apiRequest(`/api/documents/${id}`),

  // Delete document
  deleteDocument: (id: string): Promise<{ document_id: string; deleted: boolean }> =>
    apiRequest(`/api/documents/${id}`, {
      method: 'DELETE',
    }),

  // Process document
  processDocument: (id: string): Promise<{ document_id: string; processing_status: string }> =>
    apiRequest(`/api/documents/${id}/process`, {
      method: 'POST',
    }),

  // Search documents
  searchDocuments: (params: {
    query: string;
    limit?: number;
  }): Promise<{ documents: Document[]; count: number }> => {
    const queryParams = new URLSearchParams();
    queryParams.append('query', params.query);
    if (params.limit) queryParams.append('limit', params.limit.toString());
    
    return apiRequest(`/api/documents/search?${queryParams.toString()}`);
  },
};

// Chat API
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
  session_id: string;
  message: string;
  timestamp: string;
  tokens_used: number;
  sources?: string[];
}

export interface ChatHistory {
  user_id: string;
  sessions: any[];
  total_count: number;
  has_more: boolean;
}

export const chatApi = {
  // Send message
  sendMessage: (request: ChatRequest): Promise<ChatResponse> =>
    apiRequest('/api/chat', {
      method: 'POST',
      body: JSON.stringify(request),
    }),

  // Get chat history
  getChatHistory: (params?: {
    session_id?: string;
    limit?: string;
  }): Promise<ChatHistory> => {
    const queryParams = new URLSearchParams();
    if (params?.session_id) queryParams.append('session_id', params.session_id);
    if (params?.limit) queryParams.append('limit', params.limit);
    
    const query = queryParams.toString();
    return apiRequest(`/api/chat/history${query ? `?${query}` : ''}`);
  },
};

// Auth API
export interface User {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  created_at: string;
  updated_at: string;
}

export const authApi = {
  // Check authentication status
  checkAuth: (): Promise<{ authenticated: boolean; user: User | null }> =>
    apiRequest('/api/auth/check'),

  // Get current user
  getCurrentUser: (): Promise<User> =>
    apiRequest('/api/auth/me'),

  // Update profile
  updateProfile: (metadata: Record<string, any>): Promise<User> =>
    apiRequest('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({ public_metadata: metadata }),
    }),

  // Get user roles
  getUserRoles: (): Promise<{ user_id: string; roles: string[] }> =>
    apiRequest('/api/auth/roles'),
};

// Health check
export const healthCheckApi = {
  // Check server health
  checkHealth: (): Promise<{ status: string }> =>
    apiRequest('/health'),
};

// Export all APIs
export const api = {
  health: healthApi,
  dashboard: dashboardApi,
  documents: documentApi,
  chat: chatApi,
  auth: authApi,
  healthCheck: healthCheckApi,
};

export default api; 