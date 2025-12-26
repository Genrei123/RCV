import { apiClient } from './axiosConfig';

export interface CompanyOwnerRegistration {
  companyName: string;
  walletAddress: string;
  email: string;
  latitude: number;
  longitude: number;
  address?: string;
  businessPermitUrl: string;
}

export interface CompanyOwnerLogin {
  walletAddress: string;
}

export interface CompanyOwner {
  _id: string;
  companyName: string;
  walletAddress: string;
  email: string;
  latitude: number;
  longitude: number;
  address?: string;
  businessPermitUrl: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  approved: boolean;
  createdAt: string;
}

export class CompanyOwnerService {
  static async register(data: CompanyOwnerRegistration) {
    try {
      const response = await apiClient.post('/company-owner/register', data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  }

  static async login(data: CompanyOwnerLogin) {
    try {
      const response = await apiClient.post('/company-owner/login', data);
      return response.data;
    } catch (error: any) {
      if (error.response?.data?.status === 'Pending') {
        throw { status: 'Pending', message: error.response.data.message };
      }
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  }

  static async getByWallet(walletAddress: string) {
    try {
      const response = await apiClient.get(`/company-owner/wallet/${walletAddress}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch company owner');
    }
  }

  static async getAll() {
    try {
      const response = await apiClient.get('/company-owner/all');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch company owners');
    }
  }

  static setCompanyOwnerData(companyOwner: CompanyOwner) {
    localStorage.setItem('companyOwner', JSON.stringify(companyOwner));
    localStorage.setItem('userType', 'companyOwner');
  }

  static getCompanyOwnerData(): CompanyOwner | null {
    const data = localStorage.getItem('companyOwner');
    return data ? JSON.parse(data) : null;
  }

  static clearCompanyOwnerData() {
    localStorage.removeItem('companyOwner');
    localStorage.removeItem('userType');
  }

  static isCompanyOwnerLoggedIn(): boolean {
    return localStorage.getItem('userType') === 'companyOwner' && !!this.getCompanyOwnerData();
  }

  static logout() {
    this.clearCompanyOwnerData();
    window.location.href = '/';
  }

  static async sendVerificationEmail(email: string) {
    try {
      const response = await apiClient.post('/company-owner/send-verification-email', { email });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to send verification email');
    }
  }

  static async verifyEmail(token: string) {
    try {
      const response = await apiClient.post('/company-owner/verify-email', { token });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Email verification failed');
    }
  }

  static async generateInviteLink(companyOwnerId: string) {
    try {
      const response = await apiClient.post('/company-owner/generate-invite-link', { companyOwnerId });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to generate invite link');
    }
  }

  static async validateInviteToken(token: string) {
    try {
      const response = await apiClient.get(`/company-owner/validate-invite/${token}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Invalid invite token');
    }
  }

  static async markInviteTokenAsUsed(token: string) {
    try {
      const response = await apiClient.post('/company-owner/mark-invite-used', { token });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to mark invite as used');
    }
  }

  static async getEmployees(companyOwnerId: string) {
    try {
      const response = await apiClient.get(`/company-owner/${companyOwnerId}/employees`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch employees');
    }
  }

  static async updateEmployeeAccess(
    employeeId: string,
    companyOwnerId: string,
    access: {
      hasWebAccess?: boolean;
      hasAppAccess?: boolean;
      hasKioskAccess?: boolean;
    }
  ) {
    try {
      const response = await apiClient.patch(`/company-owner/employees/${employeeId}/access`, {
        ...access,
        companyOwnerId,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update employee access');
    }
  }

  static async approveEmployee(employeeId: string, companyOwnerId: string) {
    try {
      const response = await apiClient.patch(`/company-owner/employees/${employeeId}/approve`, {
        companyOwnerId,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to approve employee');
    }
  }

  static async rejectEmployee(employeeId: string, companyOwnerId: string) {
    try {
      const response = await apiClient.patch(`/company-owner/employees/${employeeId}/reject`, {
        companyOwnerId,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to reject employee');
    }
  }
}
