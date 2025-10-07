import type { User } from "@/typeorm/entities/user.entity";
import { apiClient } from "./axiosConfig";

export interface DashboardApiResponse {
    success: boolean;
    users: User[];
}

export class DashboardService {

    static async getAllUsers() {
        try {
            const response = await apiClient.get<DashboardApiResponse>('/user/users');
            return response.data;
        } catch (error) {
            console.error('Error fetching users:', error);
            throw error;
        }
    }

    static async approveUser(User: User) {
        // TO DO
    }

    static async denyUser(User: User) {
        // TO DO
    }
}