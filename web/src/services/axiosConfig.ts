import axios from 'axios';
import type { AxiosInstance } from 'axios';
import { CookieManager } from '@/utils/cookies';
import { loadingManager } from '@/utils/loadingManager';
import { toast } from 'sonner';

// Base URL - change this to your actual API URL
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

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

// Handle security-related logout
const handleSecurityLogout = (title: string, description: string, delay: number = 1500) => {
  // Clear cookies
  CookieManager.clearAuthCookies();
  
  // Show error toast
  toast.error(title, {
    description,
    duration: 5000,
  });
  
  // Small delay to let user see the message before redirect
  setTimeout(() => {
    window.location.href = '/login';
  }, delay);
};

// Handle wallet mismatch logout
const handleWalletMismatchLogout = () => {
  handleSecurityLogout(
    'Wallet Mismatch Detected',
    'Your connected wallet does not match your account. Please reconnect with the correct wallet.'
  );
};

// Handle expired session logout
const handleExpiredSessionLogout = () => {
  handleSecurityLogout(
    'Session Expired',
    'Your session has expired. Please log in again to continue.',
    1000
  );
};

// Handle unauthorized access
const handleUnauthorizedAccess = () => {
  handleSecurityLogout(
    'Unauthorized Access',
    'Your session is invalid or has been revoked. Please log in again.',
    1000
  );
};

// Handle rate limiting
const handleRateLimitError = (retryAfter?: string) => {
  const retryMessage = retryAfter 
    ? `Please try again in ${retryAfter} seconds.` 
    : 'Please try again later.';
  
  toast.error('Too Many Requests', {
    description: `You're making too many requests. ${retryMessage}`,
    duration: 8000,
  });
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
    
    const responseData = error.response?.data;
    const statusCode = error.response?.status;
    
    // Check for wallet mismatch response (logout required)
    if (responseData?.logout === true && responseData?.code === 'WALLET_MISMATCH') {
      handleWalletMismatchLogout();
      return Promise.reject(new Error('WALLET_MISMATCH_LOGOUT'));
    }
    
    // Handle 401 Unauthorized - expired token, invalid session, or revoked access
    if (statusCode === 401) {
      // Check if this is an expired token specifically
      const isExpiredToken = responseData?.message?.toLowerCase().includes('expired') ||
                             responseData?.error?.toLowerCase().includes('expired') ||
                             responseData?.message?.toLowerCase().includes('token') && responseData?.message?.toLowerCase().includes('invalid');
      
      if (isExpiredToken) {
        handleExpiredSessionLogout();
      } else {
        handleUnauthorizedAccess();
      }
      return Promise.reject(new Error('UNAUTHORIZED_LOGOUT'));
    }
    
    // Handle 403 Forbidden - suspicious activity, insufficient permissions, or security threat
    if (statusCode === 403) {
      // Check for specific security threats
      const isSuspiciousActivity = responseData?.message?.toLowerCase().includes('suspicious') ||
                                   responseData?.message?.toLowerCase().includes('blocked') ||
                                   responseData?.message?.toLowerCase().includes('security');
      
      if (isSuspiciousActivity) {
        handleSecurityLogout(
          'Access Denied',
          'Suspicious activity detected. Your access has been temporarily blocked. Please contact support if this persists.',
          2000
        );
        return Promise.reject(new Error('FORBIDDEN_LOGOUT'));
      }
      
      // For other 403 errors, show a warning but don't logout
      toast.error('Access Denied', {
        description: responseData?.message || 'You do not have permission to perform this action.',
        duration: 5000,
      });
    }
    
    // Handle 429 Too Many Requests - rate limiting / DDoS protection
    if (statusCode === 429) {
      const retryAfter = error.response?.headers['retry-after'];
      handleRateLimitError(retryAfter);
      return Promise.reject(new Error('RATE_LIMIT_EXCEEDED'));
    }
    
    // Handle network errors (no response from server)
    if (!error.response) {
      toast.error('Network Error', {
        description: 'Unable to connect to the server. Please check your internet connection.',
        duration: 5000,
      });
    }
    
    // Handle 500+ server errors (optional - show generic error message)
    if (statusCode && statusCode >= 500) {
      toast.error('Server Error', {
        description: 'An unexpected error occurred. Please try again later.',
        duration: 5000,
      });
    }
    
    return Promise.reject(error);
  }
);