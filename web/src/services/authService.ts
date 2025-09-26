// Authentication Service - Handles login, logout, and token management
// This demonstrates authentication patterns your team should follow

import ApiService, { TokenManager } from './apiService';
import type {
  LoginRequest,
  LoginResponse,
  AuthData,
  RefreshTokenRequest,
  User,
  UserResponse,
} from '../types/Sample';

export class AuthService {
  private static readonly BASE_PATH = '/auth';

  // ================================
  // AUTHENTICATION METHODS
  // ================================

  /**
   * Login user with email and password
   * @param credentials - Email and password
   * @returns Promise<LoginResponse>
   */
  static async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await ApiService.post<AuthData>(`${this.BASE_PATH}/login`, credentials);
      
      // Store tokens if login successful
      if (response.success && response.data) {
        const { accessToken, refreshToken } = response.data;
        TokenManager.setTokens(accessToken, refreshToken);
        
        // Store user data in localStorage (optional - you might prefer state management)
        localStorage.setItem('currentUser', JSON.stringify(response.data.user));
      }
      
      return response;
    } catch (error) {
      // Clear any existing tokens on login failure
      TokenManager.clearTokens();
      localStorage.removeItem('currentUser');
      throw error;
    }
  }

  /**
   * Logout current user
   * @returns Promise<void>
   */
  static async logout(): Promise<void> {
    try {
      // Call logout endpoint to invalidate token on server
      await ApiService.post(`${this.BASE_PATH}/logout`);
    } catch (error) {
      // Even if server logout fails, clear local data
      console.warn('Server logout failed:', error);
    } finally {
      // Always clear local storage and tokens
      TokenManager.clearTokens();
      localStorage.removeItem('currentUser');
      
      // Redirect to login page
      window.location.href = '/login';
    }
  }

  /**
   * Refresh access token using refresh token
   * @returns Promise<LoginResponse>
   */
  static async refreshToken(): Promise<LoginResponse> {
    const refreshToken = TokenManager.getRefreshToken();
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const request: RefreshTokenRequest = { refreshToken };
      const response = await ApiService.post<AuthData>(`${this.BASE_PATH}/refresh`, request);
      
      if (response.success && response.data) {
        const { accessToken, refreshToken: newRefreshToken } = response.data;
        TokenManager.setTokens(accessToken, newRefreshToken);
        
        // Update stored user data
        localStorage.setItem('currentUser', JSON.stringify(response.data.user));
      }
      
      return response;
    } catch (error) {
      // Refresh failed, clear tokens and redirect to login
      TokenManager.clearTokens();
      localStorage.removeItem('currentUser');
      window.location.href = '/login';
      throw error;
    }
  }

  // ================================
  // USER REGISTRATION
  // ================================

  /**
   * Register new user
   * @param userData - Registration data
   * @returns Promise<LoginResponse>
   */
  static async register(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }): Promise<LoginResponse> {
    try {
      const response = await ApiService.post<AuthData>(`${this.BASE_PATH}/register`, userData);
      
      // Automatically login after successful registration
      if (response.success && response.data) {
        const { accessToken, refreshToken } = response.data;
        TokenManager.setTokens(accessToken, refreshToken);
        localStorage.setItem('currentUser', JSON.stringify(response.data.user));
      }
      
      return response;
    } catch (error) {
      TokenManager.clearTokens();
      localStorage.removeItem('currentUser');
      throw error;
    }
  }

  // ================================
  // PASSWORD MANAGEMENT
  // ================================

  /**
   * Request password reset
   * @param email - User's email address
   * @returns Promise<any>
   */
  static async requestPasswordReset(email: string): Promise<any> {
    return ApiService.post(`${this.BASE_PATH}/password-reset/request`, { email });
  }

  /**
   * Reset password with token
   * @param token - Reset token from email
   * @param newPassword - New password
   * @returns Promise<any>
   */
  static async resetPassword(token: string, newPassword: string): Promise<any> {
    return ApiService.post(`${this.BASE_PATH}/password-reset/confirm`, {
      token,
      password: newPassword,
    });
  }

  /**
   * Change password (authenticated user)
   * @param currentPassword - Current password
   * @param newPassword - New password
   * @returns Promise<any>
   */
  static async changePassword(currentPassword: string, newPassword: string): Promise<any> {
    return ApiService.post(`${this.BASE_PATH}/password-change`, {
      currentPassword,
      newPassword,
    });
  }

  // ================================
  // EMAIL VERIFICATION
  // ================================

  /**
   * Send email verification
   * @returns Promise<any>
   */
  static async sendEmailVerification(): Promise<any> {
    return ApiService.post(`${this.BASE_PATH}/email/send-verification`);
  }

  /**
   * Verify email with token
   * @param token - Verification token from email
   * @returns Promise<UserResponse>
   */
  static async verifyEmail(token: string): Promise<UserResponse> {
    return ApiService.post<User>(`${this.BASE_PATH}/email/verify`, { token });
  }

  // ================================
  // SESSION MANAGEMENT
  // ================================

  /**
   * Check if user is authenticated
   * @returns boolean
   */
  static isAuthenticated(): boolean {
    const token = TokenManager.getAccessToken();
    const user = AuthService.getCurrentUser();
    return !!(token && user);
  }

  /**
   * Get current user from localStorage
   * @returns User | null
   */
  static getCurrentUser(): User | null {
    try {
      const userJson = localStorage.getItem('currentUser');
      return userJson ? JSON.parse(userJson) : null;
    } catch (error) {
      console.error('Error parsing stored user data:', error);
      return null;
    }
  }

  /**
   * Get current user's role
   * @returns string | null
   */
  static getCurrentUserRole(): string | null {
    const user = AuthService.getCurrentUser();
    return user?.role || null;
  }

  /**
   * Check if current user has specific role
   * @param role - Role to check
   * @returns boolean
   */
  static hasRole(role: string): boolean {
    const userRole = AuthService.getCurrentUserRole();
    return userRole === role;
  }

  /**
   * Check if current user has any of the specified roles
   * @param roles - Array of roles to check
   * @returns boolean
   */
  static hasAnyRole(roles: string[]): boolean {
    const userRole = AuthService.getCurrentUserRole();
    return userRole ? roles.includes(userRole) : false;
  }

  /**
   * Get fresh user data from server
   * @returns Promise<UserResponse>
   */
  static async fetchCurrentUser(): Promise<UserResponse> {
    try {
      const response = await ApiService.get<User>(`${this.BASE_PATH}/me`);
      
      if (response.success && response.data) {
        // Update stored user data
        localStorage.setItem('currentUser', JSON.stringify(response.data));
      }
      
      return response;
    } catch (error) {
      // If fetching user fails, user might not be authenticated
      TokenManager.clearTokens();
      localStorage.removeItem('currentUser');
      throw error;
    }
  }

  // ================================
  // UTILITY METHODS
  // ================================

  /**
   * Initialize auth state on app startup
   * @returns Promise<User | null>
   */
  static async initializeAuth(): Promise<User | null> {
    const token = TokenManager.getAccessToken();
    
    if (!token) {
      return null;
    }

    try {
      // Verify token is still valid by fetching user data
      const response = await AuthService.fetchCurrentUser();
      return response.data;
    } catch (error) {
      // Token is invalid, clear auth state
      AuthService.clearAuthState();
      return null;
    }
  }

  /**
   * Clear all authentication state
   */
  static clearAuthState(): void {
    TokenManager.clearTokens();
    localStorage.removeItem('currentUser');
  }

  /**
   * Get authorization header for manual API calls
   * @returns string | null
   */
  static getAuthHeader(): string | null {
    const token = TokenManager.getAccessToken();
    return token ? `Bearer ${token}` : null;
  }
}

// Export default for easier importing
export default AuthService;