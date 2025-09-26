// User Service - Sample implementation
// This demonstrates how to create specific service classes for different entities

import ApiService from './apiService';
import type {
  User,
  UserFilters,
  UserListResponse,
  UserResponse,
  CreateUserRequest,
  UpdateUserRequest,
} from '../types/Sample';

export class UserService {
  private static readonly BASE_PATH = '/users';

  // ================================
  // GET METHODS
  // ================================

  /**
   * Get paginated list of users with optional filters
   * @param filters - Pagination and filter parameters
   * @returns Promise<UserListResponse>
   */
  static async getUsers(filters: UserFilters = {}): Promise<UserListResponse> {
    const params = {
      page: filters.page || 1,
      limit: filters.limit || 10,
      ...(filters.role && { role: filters.role }),
      ...(filters.status && { status: filters.status }),
      ...(filters.search && { search: filters.search }),
      ...(filters.sortBy && { sortBy: filters.sortBy }),
      ...(filters.sortOrder && { sortOrder: filters.sortOrder }),
    };

    return ApiService.get<User[]>(`${this.BASE_PATH}`, params);
  }

  /**
   * Get a single user by ID
   * @param id - User ID
   * @returns Promise<UserResponse>
   */
  static async getUserById(id: string): Promise<UserResponse> {
    return ApiService.get<User>(`${this.BASE_PATH}/${id}`);
  }

  /**
   * Get current user profile
   * @returns Promise<UserResponse>
   */
  static async getCurrentUser(): Promise<UserResponse> {
    return ApiService.get<User>(`${this.BASE_PATH}/profile`);
  }

  // ================================
  // POST METHODS
  // ================================

  /**
   * Create a new user
   * @param userData - User creation data
   * @returns Promise<UserResponse>
   */
  static async createUser(userData: CreateUserRequest): Promise<UserResponse> {
    return ApiService.post<User>(`${this.BASE_PATH}`, userData);
  }

  // ================================
  // PUT/PATCH METHODS
  // ================================

  /**
   * Update a user by ID
   * @param id - User ID
   * @param userData - Partial user data to update
   * @returns Promise<UserResponse>
   */
  static async updateUser(id: string, userData: UpdateUserRequest): Promise<UserResponse> {
    return ApiService.patch<User>(`${this.BASE_PATH}/${id}`, userData);
  }

  /**
   * Update current user profile
   * @param userData - Partial user data to update
   * @returns Promise<UserResponse>
   */
  static async updateCurrentUser(userData: UpdateUserRequest): Promise<UserResponse> {
    return ApiService.patch<User>(`${this.BASE_PATH}/profile`, userData);
  }

  // ================================
  // DELETE METHODS
  // ================================

  /**
   * Delete a user by ID
   * @param id - User ID
   * @returns Promise<void>
   */
  static async deleteUser(id: string): Promise<void> {
    await ApiService.delete(`${this.BASE_PATH}/${id}`);
  }

  /**
   * Soft delete (deactivate) a user
   * @param id - User ID
   * @returns Promise<UserResponse>
   */
  static async deactivateUser(id: string): Promise<UserResponse> {
    return ApiService.patch<User>(`${this.BASE_PATH}/${id}/deactivate`);
  }

  /**
   * Reactivate a deactivated user
   * @param id - User ID
   * @returns Promise<UserResponse>
   */
  static async activateUser(id: string): Promise<UserResponse> {
    return ApiService.patch<User>(`${this.BASE_PATH}/${id}/activate`);
  }

  // ================================
  // UTILITY METHODS
  // ================================

  /**
   * Upload user avatar
   * @param userId - User ID
   * @param file - Avatar image file
   * @param onProgress - Progress callback
   * @returns Promise<UserResponse>
   */
  static async uploadAvatar(
    userId: string, 
    file: File, 
    onProgress?: (progress: number) => void
  ): Promise<UserResponse> {
    return ApiService.uploadFile<User>(`${this.BASE_PATH}/${userId}/avatar`, file, onProgress);
  }

  /**
   * Search users by email or name
   * @param query - Search query
   * @param limit - Maximum number of results
   * @returns Promise<UserListResponse>
   */
  static async searchUsers(query: string, limit: number = 10): Promise<UserListResponse> {
    return ApiService.get<User[]>(`${this.BASE_PATH}/search`, { q: query, limit });
  }

  /**
   * Get user activity/audit log
   * @param userId - User ID
   * @param page - Page number
   * @param limit - Items per page
   * @returns Promise<any> - Replace 'any' with proper ActivityLog type
   */
  static async getUserActivity(userId: string, page: number = 1, limit: number = 10): Promise<any> {
    return ApiService.get(`${this.BASE_PATH}/${userId}/activity`, { page, limit });
  }
}

// Export default for easier importing
export default UserService;