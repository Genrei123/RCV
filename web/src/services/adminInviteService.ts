import { apiClient } from "./axiosConfig";
import axios from "axios";

const API_BASE = import.meta.env.BACKEND_URL;

export interface AdminInvite {
  _id: string;
  badgeId: string;
  email: string;
  personalMessage?: string;
  token: string;
  invitedBy: string;
  invitedByName?: string;
  status: 'pending' | 'badge_verified' | 'registered' | 'approved' | 'rejected' | 'revoked' | 'archived';
  userId?: string;
  idDocumentUrl?: string;
  selfieWithIdUrl?: string;
  rejectionReason?: string;
  expiresAt?: string;
  emailSent: boolean;
  webAccess: boolean;
  appAccess: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInviteRequest {
  badgeId: string;
  email: string;
  personalMessage?: string;
  webAccess?: boolean;
  appAccess?: boolean;
}

export interface VerifyBadgeRequest {
  token: string;
  badgeId: string;
}

export interface CompleteRegistrationRequest {
  token: string;
  badgeId: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  extName?: string;
  password: string;
  phoneNumber: string;
  location: string;
  dateOfBirth: string;
  idDocumentUrl: string;
  selfieWithIdUrl: string;
}

export interface InviteVerificationResponse {
  success: boolean;
  invite: {
    _id: string;
    email: string;
    status: string;
    invitedByName?: string;
    personalMessage?: string;
    requiresBadgeVerification: boolean;
    badgeId?: string;
  };
}

export class AdminInviteService {
  /**
   * Create a new agent invitation (Admin only)
   */
  static async createInvite(data: CreateInviteRequest) {
    const response = await apiClient.post('/admin-invite/create', data);
    return response.data;
  }

  /**
   * Verify an invite token (public)
   */
  static async verifyInviteToken(token: string): Promise<InviteVerificationResponse> {
    const response = await axios.get(`${API_BASE}/admin-invite/verify/${token}`);
    return response.data;
  }

  /**
   * Verify badge number for invitation (public)
   */
  static async verifyBadgeNumber(data: VerifyBadgeRequest) {
    const response = await axios.post(`${API_BASE}/admin-invite/verify-badge`, data);
    return response.data;
  }

  /**
   * Complete agent registration with documents (public)
   */
  static async completeRegistration(data: CompleteRegistrationRequest) {
    const response = await axios.post(`${API_BASE}/admin-invite/complete-registration`, data);
    return response.data;
  }

  /**
   * Get all pending invitations (Admin only)
   */
  static async getPendingInvites(): Promise<{ success: boolean; invites: AdminInvite[] }> {
    const response = await apiClient.get('/admin-invite/pending');
    return response.data;
  }

  /**
   * Get all invitations (Admin only)
   */
  static async getAllInvites(): Promise<{ success: boolean; invites: AdminInvite[] }> {
    const response = await apiClient.get('/admin-invite/all');
    return response.data;
  }

  /**
   * Approve an agent registration (Admin only)
   */
  static async approveAgent(inviteId: string) {
    const response = await apiClient.post(`/admin-invite/approve/${inviteId}`);
    return response.data;
  }

  /**
   * Reject an agent registration (Admin only)
   */
  static async rejectAgent(inviteId: string, rejectionReason: string) {
    const response = await apiClient.post(`/admin-invite/reject/${inviteId}`, { rejectionReason });
    return response.data;
  }

  /**
   * Resend invitation email (Admin only)
   */
  static async resendInvite(inviteId: string) {
    const response = await apiClient.post(`/admin-invite/resend/${inviteId}`);
    return response.data;
  }

  /**
   * Delete/Cancel an invitation (Admin only)
   */
  static async deleteInvite(inviteId: string) {
    const response = await apiClient.delete(`/admin-invite/${inviteId}`);
    return response.data;
  }

  /**
   * Revoke an invitation (Admin only)
   */
  static async revokeInvite(inviteId: string) {
    const response = await apiClient.post(`/admin-invite/revoke/${inviteId}`);
    return response.data;
  }

  /**
   * Archive an invitation (Admin only)
   */
  static async archiveInvite(inviteId: string) {
    const response = await apiClient.post(`/admin-invite/archive/${inviteId}`);
    return response.data;
  }

  /**
   * Update invitation details (Admin only)
   */
  static async updateInvite(inviteId: string, data: { badgeId?: string; email?: string; personalMessage?: string }) {
    const response = await apiClient.put(`/admin-invite/${inviteId}`, data);
    return response.data;
  }
}
