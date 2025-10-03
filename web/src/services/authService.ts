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

    static async isTokenExpired(token: string): Promise<boolean> {
        // TO DO
        return true; 
    }

    static async verifyToken(token: string): Promise<boolean> {
        // TO DO
        return false;
    }
}
