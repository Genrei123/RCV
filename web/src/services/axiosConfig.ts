import axios from 'axios';
import type { AxiosInstance } from 'axios';
import { CookieManager } from '@/utils/cookies';
import { loadingManager } from '@/utils/loadingManager';

// Base URL - change this to your actual API URL
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

// Create axios instance with default config
export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 10000, // 10 seconds timeout
  withCredentials: true, // This automatically sends httpOnly cookies
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Add request interceptor to include auth token from cookies for Authorization header
// Note: httpOnly cookies are sent automatically by the browser
// This is for reading the non-httpOnly tracking cookie
apiClient.interceptors.request.use(
  (config) => {
    // Start loading indicator
    loadingManager.startLoading();
    
    // Try to get token from non-httpOnly cookie (for client-side token checking)
    const token = CookieManager.getAuthToken();
    if (token) {
      // Add Authorization header as fallback/additional auth method
      config.headers.Authorization = `Bearer ${token}`;
    }
    // The httpOnly cookie will be sent automatically by the browser
    return config;
  },
  (error) => {
    // Stop loading on request error
    loadingManager.stopLoading();
    return Promise.reject(error);
  }
);

// Add response interceptor to stop loading
apiClient.interceptors.response.use(
  (response) => {
    // Stop loading on successful response
    loadingManager.stopLoading();
    return response;
  },
  (error) => {
    // Stop loading on error response
    loadingManager.stopLoading();
    return Promise.reject(error);
  }
);