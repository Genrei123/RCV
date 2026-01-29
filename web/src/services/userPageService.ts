import { apiClient } from "./axiosConfig";

export interface UserProfile {
  _id: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  email: string;
  phoneNumber?: string;
  avatar?: string;
  role?: number | string;
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
      const response = await apiClient.get<UserProfile>("/auth/me");
      return { profile: response.data };
    } catch (error) {
      console.error("Error fetching profile:", error);
      throw error;
    }
  }

  static async getUserById(userId: string): Promise<UserPageApiResponse> {
    try {
      const response = await apiClient.get<any>(`/user/users/${userId}`);
      const raw = response.data;
      // Prefer common API shapes: { user }, { data }, { profile }
      let profile: UserProfile | undefined =
        raw?.profile || raw?.data || raw?.user || raw;
      // If the API wrapped the payload under `user`, unwrap it explicitly
      if (!profile && raw && typeof raw === "object" && "user" in raw) {
        profile = (raw as any).user as UserProfile;
      }
      if (profile) {
        // Normalize alternative naming conventions
        const src: any = profile;
        if (!profile.firstName && (src?.first_name || src?.first))
          profile.firstName = src.first_name || src.first;
        if (!profile.lastName && (src?.last_name || src?.last))
          profile.lastName = src.last_name || src.last;
        if (!profile.middleName && (src?.middle_name || src?.middle))
          profile.middleName = src.middle_name || src.middle;
        if (!profile.email && (src?.email_address || src?.emailAddress))
          profile.email = src.email_address || src.emailAddress;
        if (!profile.phoneNumber && (src?.phone || src?.phone_number))
          profile.phoneNumber = src.phone || src.phone_number;
        if (!profile.location && (src?.location || src?.address))
          profile.location = src.location || src.address;
        if (!profile.badgeId && (src?.badge_id || src?.badgeID))
          profile.badgeId = src.badge_id || src.badgeID;
        // Map backend avatarUrl to frontend avatar field
        if (!(profile as any).avatar && (src?.avatarUrl || src?.avatarURL)) {
          (profile as any).avatar = src.avatarUrl || src.avatarURL;
        }
        // Some APIs may return a combined fullName
        if (!profile.firstName && (src?.fullName || src?.name)) {
          const parts = String(src.fullName || src.name)
            .trim()
            .split(/\s+/);
          profile.firstName = parts[0];
          if (parts.length > 2)
            profile.middleName = parts.slice(1, -1).join(" ");
          profile.lastName = parts[parts.length - 1];
        }
      }
      return { profile };
    } catch (error) {
      console.error("Error fetching the user: ", error);
      throw error;
    }
  }

  static async approveUser(userId: string): Promise<void> {
    try {
      await apiClient.patch(`/user/users/${userId}/approve`);
    } catch (error) {
      console.error("Error approving user:", error);
      throw error;
    }
  }

  static async rejectUser(userId: string, reason?: string): Promise<void> {
    try {
      await apiClient.patch(`/user/users/${userId}/reject`, { reason });
    } catch (error) {
      console.error("Error rejecting user:", error);
      throw error;
    }
  }

  static async updateUserAccess(userId: string, webAccess: boolean, appAccess: boolean): Promise<void> {
    try {
      await apiClient.patch(`/user/users/${userId}/access`, { webAccess, appAccess });
    } catch (error) {
      console.error("Error updating user access:", error);
      throw error;
    }
  }

  static async updateProfile(data: Partial<UserProfile>): Promise<UserProfile> {
    try {
      // Map avatar to avatarUrl for backend
      const backendData: any = { ...data };
      if (backendData.avatar) {
        backendData.avatarUrl = backendData.avatar;
        delete backendData.avatar;
      }
      const response = await apiClient.patch<UserProfile>(
        "/user/profile",
        backendData
      );
      return response.data;
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  }

  static async archiveAccount(): Promise<void> {
    try {
      await apiClient.patch("/user/archive");
    } catch (error) {
      console.error("Error archiving account:", error);
      throw error;
    }
  }

  static async syncUserFromFirebase(firebaseUid: string): Promise<UserProfile> {
    try {
      const response = await apiClient.post<any>(`/public/users/sync/${firebaseUid}`);
      return response.data.user;
    } catch (error: any) {
      console.error(`[UserPageService] Sync error:`, error?.response?.data);
      throw error;
    }
  }
}
