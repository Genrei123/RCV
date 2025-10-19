import type { User } from "@/typeorm/entities/user.entity";
import { apiClient } from "./axiosConfig";

// Backend returns a paginated payload: { success, data, pagination, links }
// Normalize to the frontend shape: { success, users }
export interface DashboardApiResponse {
  success: boolean;
  data: User[];
  pagination?: any;
  links?: any;
}

export interface DashboardServiceResponse {
  success: boolean;
  users: User[];
}

export class DashboardService {
  static async getAllUsers(): Promise<DashboardServiceResponse> {
    try {
      const response = await apiClient.get<DashboardApiResponse>("/user/users");
      return {
        success: response.data.success,
        users: response.data.data || [],
      };
    } catch (error) {
      console.error("Error fetching users:", error);
      throw error;
    }
  }

  // New: fetch a specific page from the server
  static async getUsersPage(
    page = 1,
    limit = 10
  ): Promise<DashboardApiResponse> {
    try {
      const response = await apiClient.get<DashboardApiResponse>(
        `/user/users?page=${page}&limit=${limit}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching users page:", error);
      throw error;
    }
  }

  static async approveUser(_user: User) {
    // TO DO
  }

  static async denyUser(_user: User) {
    // TO DO
  }
}
