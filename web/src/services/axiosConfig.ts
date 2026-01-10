import axios from 'axios';
import type { AxiosInstance } from 'axios';
import { CookieManager } from '@/utils/cookies';
import { loadingManager } from '@/utils/loadingManager';
import { toast } from 'sonner';

// Base URL - change this to your actual API URL
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

// Debug: Log the base URL being used
console.log('[API] Base URL configured:', BASE_URL);

// Create axios instance with default config
export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 60000, // 60 seconds timeout
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

// Handle wallet mismatch logout
const handleWalletMismatchLogout = () => {
  // Clear cookies
  CookieManager.clearAuthCookies();
  
  // Show error toast
  toast.error('Wallet Mismatch Detected', {
    description: 'Your connected wallet does not match your account. Please reconnect with the correct wallet.',
    duration: 5000,
  });
  
  // Small delay to let user see the message before redirect
  setTimeout(() => {
    window.location.href = '/login';
  }, 1500);
};

// Add response interceptor to handle errors and stop loading
apiClient.interceptors.response.use(
  (response) => {
    // Stop loading on successful response
    loadingManager.stopLoading();
    return response;
  },
  (error) => {
    // Stop loading on error response
    loadingManager.stopLoading();
    
    // Check for wallet mismatch response (logout required)
    const responseData = error.response?.data;
    if (responseData?.logout === true && responseData?.code === 'WALLET_MISMATCH') {
      handleWalletMismatchLogout();
      // Return a rejected promise with a specific error to prevent further handling
      return Promise.reject(new Error('WALLET_MISMATCH_LOGOUT'));
    }
    
    return Promise.reject(error);
  }
);