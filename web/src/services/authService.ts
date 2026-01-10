import type { User, RegisterResponse } from "@/typeorm/entities/user.entity";
import { apiClient } from "./axiosConfig";
import axios from "axios";
import { CookieManager } from "@/utils/cookies";

export interface LoginRequest {
    email: string;
    password: string;
    rememberMe?: boolean;
}

export interface LoginResponse {
    status: string;
    token: string;
    user?: {
        approved?: boolean;
        email?: string;
        firstName?: string;
    };
}

export interface PasswordResetRequest {
    email: string;
}

export interface PasswordResetResponse {
    success: boolean;
    message: string;
}

export interface VerifyResetCodeRequest {
    email: string;
    code: string;
}

export interface ResetPasswordRequest {
    email: string;
    code: string;
    newPassword: string;
}

export class AuthService {
    
    static async initializeAuthenticaiton(): Promise<boolean> {
        try {
            const response = await apiClient.get('/auth/me');
            if (response.data && response.data._id) {
                return true;
            }
            return false;
        } catch (error: any) {
            console.log("Auth check failed:", error.response?.status || error.message);
            CookieManager.clearAuthCookies(); // Clear any client-side tracking cookies
            return false;
        }
    }

    static async getCurrentUser() {
        try {
            const response = await apiClient.get('/auth/me');
            return response.data;
        } catch (error) {
            console.error('Error fetching current user:', error);
            return null;
        }
    }

    static async logout(): Promise<void> {
        try {
            // Call backend to clear httpOnly cookie
            await apiClient.post('/auth/logout');
            
            // Clear any client-side cookies
            CookieManager.clearAuthCookies();
            
            // Redirect to login
            window.location.href = '/login';
        } catch (error) {
            console.error('Logout error:', error);
            // Still clear cookies and redirect even if there's an error
            CookieManager.clearAuthCookies();
            window.location.href = '/login';
        }
    }

    static async login(credentials: LoginRequest) {
        try {
            const response = await apiClient.post<LoginResponse>('/auth/login', credentials);
            
            // Backend sets httpOnly cookie automatically
            // We don't need to set any client-side cookies since we can't read httpOnly cookies anyway
            // The browser will automatically send the httpOnly cookie with future requests
            
            return response;
        } catch (error) {
            console.error('Login error in AuthService:', error);
            // Re-throw the error so it can be caught by the component
            throw error;
        }
    }

    static async register(Credentials: User) {
        try {
            const response = await apiClient.post<RegisterResponse>('/auth/register', Credentials);
            return response;
        } catch (error) {
            console.error('Registration error in AuthService:', error);
            // Re-throw the error so it can be caught by the component
            throw error;
        }
    }

    static async isTokenExpired(_token: string): Promise<boolean> {
        // TODO: Implement token expiration check
        return true; 
    }

    static async verifyToken(_token: string): Promise<boolean> {
        // TODO: Implement token verification
        return false;
    }

    static getTokenExpirationInfo() {
        return CookieManager.getTokenExpirationInfo();
    }

    static async requestPasswordReset(email: string): Promise<PasswordResetResponse> {
        try {
            const response = await axios.post(import.meta.env.BACKEND_URL + '/auth/forgot-password', { email })
            return response.data;
        } catch (error: any) {
            console.error('Request password reset error:', error);
            throw error;
        }
    }

    static async verifyResetCode(email: string, code: string): Promise<boolean> {
        try {
            const response = await axios.post<{ valid: boolean }>(import.meta.env.BACKEND_URL + '/auth/verify-reset-code', { 
                email, 
                code 
            });
            return response.data.valid;
        } catch (error: any) {
            console.error('Verify reset code error:', error);
            throw error;
        }
    }

    static async resetPassword(email: string, code: string, newPassword: string): Promise<PasswordResetResponse> {
        try {
            const response = await axios.post<PasswordResetResponse>(import.meta.env.BACKEND_URL + '/auth/reset-password', { 
                email, 
                code, 
                newPassword 
            });
            return response.data;
        } catch (error: any) {
            console.error('Reset password error:', error);
            throw error;
        }
    }
}
