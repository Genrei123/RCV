import { apiClient } from "./axiosConfig";

export interface UserProfile {
    _id: string;
    firstName: string;
    lastName: string;
    middleName?: string;
    email: string;
    phoneNumber?: string;
    avatar?: string;
    role?: number;
    dateOfBirth?: string;
    location?: string;
    badgeId?: string;
    stationedAt?: string;
}

export interface UserPageApiResponse {
    profile?: UserProfile;
}

export class UserPageService {
    static async getProfile(): Promise<UserPageApiResponse> {
        try {
            const response = await apiClient.get<UserProfile>('/auth/me');
            return { profile: response.data };
        } catch (error) {
            console.error('Error fetching profile:', error);
            throw error;
        }
    }

    static async getUserById(UserId: string) {
        try {
            const response = await apiClient.get<UserProfile>(`/user/users/${UserId}`);
            return { profile: response.data }
        } catch (error) {
            console.error('Error fetching the user: ', error);
            throw error;
        }
    }

    static async approveUser(userId: string): Promise<void> {
        try {
            await apiClient.patch(`/user/users/${userId}/approve`);
        } catch (error) {
            console.error('Error approving user:', error);
            throw error;
        }
    }

    static async rejectUser(userId: string): Promise<void> {
        try {
            await apiClient.patch(`/user/users/${userId}/reject`);
        } catch (error) {
            console.error('Error rejecting user:', error);
            throw error;
        }
    }

    static async updateProfile(data: Partial<UserProfile>): Promise<UserProfile> {
        try {
            const response = await apiClient.patch<UserProfile>('/user/profile', data);
            return response.data;
        } catch (error) {
            console.error('Error updating profile:', error);
            throw error;
        }
    }

    static async archiveAccount(): Promise<void> {
        try {
            await apiClient.patch('/user/archive');
        } catch (error) {
            console.error('Error archiving account:', error);
            throw error;
        }
    }
}