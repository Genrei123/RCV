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

export interface DashboardStats {
  totalUsers: number;
  totalProducts: number;
  totalCompanies: number;
  // kioskStatus: {
  //   isOnline: boolean;
  //   lastPoll: string | null;
  //   pollCount: number;
  // };
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

  static async getDashboardStats(): Promise<DashboardStats> {
    try {
      // Fetch all data in parallel
      // Note: kiosk/health is not under /api/v1, so we need a different approach
      // const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';
      // const kioskURL = baseURL.replace('/api/v1', '');
      
      const [usersResponse, productsResponse, companiesResponse] = await Promise.all([
        apiClient.get<DashboardApiResponse>("/user/users?limit=1"),
        apiClient.get<{ success: boolean; data: any[]; pagination?: any }>("/product/products?limit=1"),
        apiClient.get<{ success: boolean; data: any[]; pagination?: any }>("/company/companies?limit=1"),
        // fetch(`${kioskURL}/kiosk/health`).then(res => res.json()).catch(() => ({ isOnline: false, lastPoll: null, pollCount: 0 })),
      ]);


      // All endpoints now return { success, data, pagination }
      return {
        totalUsers: usersResponse.data.pagination?.total_items || 0,
        totalProducts: productsResponse.data.pagination?.total_items || 0,
        totalCompanies: companiesResponse.data.pagination?.total_items || 0,
        // kioskStatus: {
        //   isOnline: kioskResponse?.isOnline || false,
        //   lastPoll: kioskResponse?.lastPoll || null,
        //   pollCount: kioskResponse?.pollCount || 0,
        // },
      };
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      throw error;
    }
  }
}
