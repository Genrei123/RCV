import type { User } from "@/typeorm/entities/user.entity";
import { apiClient } from "./axiosConfig";

export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    status: string;
    token: string;
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
        const token = localStorage.getItem('token');
        if (!token) {
            console.log("No token!");
            return false;
        }

        if (await this.isTokenExpired(token)) {
            localStorage.removeItem('token');
            return false;
        }

        try {
            if (await !this.verifyToken(token)) {
                return false;
            };
            return true;
        } catch (error) {
            console.error(error);
        }
        return false;
    }

    static async login(Credentials: LoginRequest) {
        try {
            const response = await apiClient.post<LoginResponse>('/auth/login', Credentials);
            localStorage.setItem('token', response.data.token);
            return response;
        } catch (error) {
            console.error(error);
        }
    }

    static async register(Credentials: User) {
        try {
            const response = await apiClient.post<User>('/auth/register', Credentials);
            return response;
        } catch (error) {
            console.error(error);
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

    static async requestPasswordReset(email: string): Promise<PasswordResetResponse> {
        try {
            const response = await apiClient.post<PasswordResetResponse>('/auth/forgot-password', { email });
            return response.data;
        } catch (error: any) {
            console.error('Request password reset error:', error);
            throw error;
        }
    }

    static async verifyResetCode(email: string, code: string): Promise<boolean> {
        try {
            const response = await apiClient.post<{ valid: boolean }>('/auth/verify-reset-code', { 
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
            const response = await apiClient.post<PasswordResetResponse>('/auth/reset-password', { 
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
