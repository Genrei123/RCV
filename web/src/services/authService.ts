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
        _id?: string;
        approved?: boolean;
        email?: string;
        firstName?: string;
        lastName?: string;
        role?: string;
        isSuperAdmin?: boolean;
        companyOwnerId?: string;
        hasWebAccess?: boolean;
        hasAppAccess?: boolean;
        hasKioskAccess?: boolean;
        walletAddress?: string;
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
            
            // Store user info in localStorage for quick access
            if (response.data.user) {
                localStorage.setItem('userRole', response.data.user.role || 'USER');
                localStorage.setItem('isSuperAdmin', String(response.data.user.isSuperAdmin || false));
                if (response.data.user.companyOwnerId) {
                    localStorage.setItem('companyOwnerId', response.data.user.companyOwnerId);
                }
                // Store access flags for quick access checks
                localStorage.setItem('hasWebAccess', String(response.data.user.hasWebAccess || false));
                localStorage.setItem('hasAppAccess', String(response.data.user.hasAppAccess || false));
                localStorage.setItem('hasKioskAccess', String(response.data.user.hasKioskAccess || false));
            }
            
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

    static isSuperAdmin(): boolean {
        return localStorage.getItem('isSuperAdmin') === 'true';
    }

    static getCompanyOwnerId(): string | null {
        return localStorage.getItem('companyOwnerId');
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
            const response = await axios.post(import.meta.env.VITE_NGROK_BASE_URL + '/auth/forgot-password', { email })
            return response.data;
        } catch (error: any) {
            console.error('Request password reset error:', error);
            throw error;
        }
    }

    static async verifyResetCode(email: string, code: string): Promise<boolean> {
        try {
            const response = await axios.post<{ valid: boolean }>(import.meta.env.VITE_NGROK_BASE_URL + '/auth/verify-reset-code', { 
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
            const response = await axios.post<PasswordResetResponse>(import.meta.env.VITE_NGROK_BASE_URL + '/auth/reset-password', { 
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
