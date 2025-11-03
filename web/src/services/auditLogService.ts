import { apiClient } from "./axiosConfig";

export interface AuditLog {
  _id: string;
  action: string;
  actionType: string;
  userId: string;
  targetUserId?: string;
  targetProductId?: string;
  ipAddress?: string;
  userAgent?: string;
  platform: 'WEB' | 'MOBILE';
  location?: {
    latitude?: number;
    longitude?: number;
    address?: string;
  };
  metadata?: Record<string, any>;
  createdAt: string;
  user?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  targetUser?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface AuditLogApiResponse {
  success: boolean;
  data: AuditLog[];
  pagination?: {
    current_page: number;
    per_page: number;
    total_pages: number;
    total_items: number;
  };
}

export class AuditLogService {
  /**
   * Get audit logs for the current user
   */
  static async getMyLogs(page: number = 1, limit: number = 20): Promise<AuditLogApiResponse> {
    try {
      const response = await apiClient.get<AuditLogApiResponse>(
        `/audit/my-logs?page=${page}&limit=${limit}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      throw error;
    }
  }

  /**
   * Get all audit logs (admin only)
   */
  static async getAllLogs(page: number = 1, limit: number = 20): Promise<AuditLogApiResponse> {
    try {
      const response = await apiClient.get<AuditLogApiResponse>(
        `/audit/logs?page=${page}&limit=${limit}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching all audit logs:", error);
      throw error;
    }
  }

  /**
   * Get audit logs by action type
   */
  static async getLogsByType(
    actionType: string,
    page: number = 1,
    limit: number = 20
  ): Promise<AuditLogApiResponse> {
    try {
      const response = await apiClient.get<AuditLogApiResponse>(
        `/audit/logs/type/${actionType}?page=${page}&limit=${limit}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching audit logs by type:", error);
      throw error;
    }
  }

  /**
   * Get a single audit log by ID
   */
  static async getLogById(id: string): Promise<{ success: boolean; data: AuditLog }> {
    try {
      const response = await apiClient.get<{ success: boolean; data: AuditLog }>(
        `/audit/logs/${id}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching audit log details:", error);
      throw error;
    }
  }

  /**
   * Format audit log action type for display
   */
  static formatActionType(actionType: string): string {
    const typeMap: { [key: string]: string } = {
      LOGIN: "Logged In",
      LOGOUT: "Logged Out",
      APPROVE_USER: "Approved User",
      REJECT_USER: "Rejected User",
      REVOKE_ACCESS: "Revoked Access",
      SCAN_PRODUCT: "Scanned Product",
      CREATE_USER: "Created User",
      UPDATE_USER: "Updated User",
      DELETE_USER: "Deleted User",
      CREATE_PRODUCT: "Created Product",
      UPDATE_PRODUCT: "Updated Product",
      DELETE_PRODUCT: "Deleted Product",
      UPDATE_PROFILE: "Updated Profile",
      ARCHIVE_ACCOUNT: "Archived Account",
      LOCATION_UPDATE: "Location Update",
      APP_CLOSED: "App Closed",
    };
    return typeMap[actionType] || actionType;
  }

  /**
   * Get badge variant for action type
   */
  static getActionTypeBadge(actionType: string): {
    label: string;
    className: string;
  } {
    const badgeMap: { [key: string]: { label: string; className: string } } = {
      LOGIN: {
        label: "Logged In",
        className: "bg-green-500 text-white hover:bg-green-600",
      },
      LOGOUT: {
        label: "Logged Out",
        className: "bg-red-500 text-white hover:bg-red-600",
      },
      APPROVE_USER: {
        label: "Approved",
        className: "bg-blue-500 text-white hover:bg-blue-600",
      },
      REJECT_USER: {
        label: "Rejected",
        className: "bg-orange-500 text-white hover:bg-orange-600",
      },
      REVOKE_ACCESS: {
        label: "Revoked",
        className: "bg-purple-500 text-white hover:bg-purple-600",
      },
      SCAN_PRODUCT: {
        label: "Scanned",
        className: "bg-teal-500 text-white hover:bg-teal-600",
      },
      UPDATE_PROFILE: {
        label: "Updated Profile",
        className: "bg-cyan-500 text-white hover:bg-cyan-600",
      },
      ARCHIVE_ACCOUNT: {
        label: "Archived",
        className: "bg-gray-500 text-white hover:bg-gray-600",
      },
      LOCATION_UPDATE: {
        label: "Location Update",
        className: "bg-indigo-500 text-white hover:bg-indigo-600",
      },
      APP_CLOSED: {
        label: "App Closed",
        className: "bg-slate-500 text-white hover:bg-slate-600",
      },
    };

    return (
      badgeMap[actionType] || {
        label: actionType,
        className: "bg-gray-500 text-white hover:bg-gray-600",
      }
    );
  }
}
