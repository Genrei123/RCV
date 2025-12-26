import { apiClient } from './axiosConfig';

export interface CompanyOwnerForAdmin {
  _id: string;
  companyName: string;
  email: string;
  walletAddress: string;
  latitude: number;
  longitude: number;
  address?: string;
  businessPermitUrl: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  approved: boolean;
  emailVerified: boolean;
  createdAt: string;
}

export class CompanyOwnerAdminService {
  static async getAllCompanyOwners() {
    try {
      const response = await apiClient.get('/company-owner/all');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch company owners');
    }
  }

  static async approveCompanyOwner(id: string) {
    try {
      const response = await apiClient.patch(`/company-owner/${id}/approve`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to approve company owner');
    }
  }

  static async rejectCompanyOwner(id: string) {
    try {
      const response = await apiClient.patch(`/company-owner/${id}/reject`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to reject company owner');
    }
  }
}
