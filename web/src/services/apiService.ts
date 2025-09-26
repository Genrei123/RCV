// API Service Base Configuration
// This file sets up Axios with interceptors and common configurations

import axios from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import type { ApiResponse, ApiError } from '../types/Sample';

// ================================
// BASE API CONFIGURATION
// ================================

// Base URL - change this to your actual API URL
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

// Create axios instance with default config
const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 10000, // 10 seconds timeout
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// ================================
// TOKEN MANAGEMENT
// ================================

// Token storage utilities
export const TokenManager = {
  getAccessToken: (): string | null => {
    return localStorage.getItem('accessToken');
  },
  
  setAccessToken: (token: string): void => {
    localStorage.setItem('accessToken', token);
  },
  
  getRefreshToken: (): string | null => {
    return localStorage.getItem('refreshToken');
  },
  
  setRefreshToken: (token: string): void => {
    localStorage.setItem('refreshToken', token);
  },
  
  clearTokens: (): void => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },
  
  setTokens: (accessToken: string, refreshToken: string): void => {
    TokenManager.setAccessToken(accessToken);
    TokenManager.setRefreshToken(refreshToken);
  }
};

// ================================
// REQUEST INTERCEPTOR
// ================================

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    // Add auth token to requests
    const token = TokenManager.getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log requests in development
    if (import.meta.env.DEV) {
      console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`, {
        data: config.data,
        params: config.params,
      });
    }
    
    return config;
  },
  (error: AxiosError): Promise<AxiosError> => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// ================================
// RESPONSE INTERCEPTOR
// ================================

apiClient.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => {
    // Log responses in development
    if (import.meta.env.DEV) {
      console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data);
    }
    
    return response;
  },
  async (error: AxiosError): Promise<AxiosError> => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    
    // Handle 401 errors (token expired)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = TokenManager.getRefreshToken();
        if (refreshToken) {
          // Try to refresh the token
          const response = await axios.post(`${BASE_URL}/auth/refresh`, {
            refreshToken: refreshToken
          });
          
          const { accessToken, refreshToken: newRefreshToken } = response.data.data;
          TokenManager.setTokens(accessToken, newRefreshToken);
          
          // Retry the original request with new token
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          }
          
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        TokenManager.clearTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    // Log errors in development
    if (import.meta.env.DEV) {
      console.error('❌ API Error:', {
        status: error.response?.status,
        message: error.message,
        data: error.response?.data,
        url: error.config?.url,
      });
    }
    
    return Promise.reject(error);
  }
);

// ================================
// ERROR HANDLING UTILITIES
// ================================

export const handleApiError = (error: AxiosError): ApiError => {
  if (error.response?.data) {
    // Server responded with error
    const serverError = error.response.data as ApiError;
    return {
      message: serverError.message || 'An error occurred',
      code: serverError.code || `HTTP_${error.response.status}`,
      details: serverError.details,
    };
  } else if (error.request) {
    // Network error
    return {
      message: 'Network error. Please check your connection.',
      code: 'NETWORK_ERROR',
    };
  } else {
    // Other error
    return {
      message: error.message || 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR',
    };
  }
};

// ================================
// GENERIC API METHODS
// ================================

export class ApiService {
  // GET request
  static async get<T>(url: string, params?: Record<string, unknown>): Promise<ApiResponse<T>> {
    try {
      const response = await apiClient.get<ApiResponse<T>>(url, { params });
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  }
  
  // POST request
  static async post<T>(url: string, data?: unknown): Promise<ApiResponse<T>> {
    try {
      const response = await apiClient.post<ApiResponse<T>>(url, data);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  }
  
  // PUT request
  static async put<T>(url: string, data?: unknown): Promise<ApiResponse<T>> {
    try {
      const response = await apiClient.put<ApiResponse<T>>(url, data);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  }
  
  // PATCH request
  static async patch<T>(url: string, data?: unknown): Promise<ApiResponse<T>> {
    try {
      const response = await apiClient.patch<ApiResponse<T>>(url, data);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  }
  
  // DELETE request
  static async delete<T>(url: string): Promise<ApiResponse<T>> {
    try {
      const response = await apiClient.delete<ApiResponse<T>>(url);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  }
  
  // Upload file
  static async uploadFile<T>(url: string, file: File, onProgress?: (progress: number) => void): Promise<ApiResponse<T>> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await apiClient.post<ApiResponse<T>>(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(progress);
          }
        },
      });
      
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  }
}

// Export the configured axios instance for direct use if needed
export { apiClient };
export default ApiService;