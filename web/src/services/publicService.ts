import { apiClient } from './axiosConfig';

export interface PublicProduct {
  id: string;
  productName: string;
  brandName: string;
  lotNumber: string;
  classification: string;
  subClassification: string;
  expirationDate: string;
  registrationDate: string;
  companyName: string;
  blockchainTxHash: string;
  etherscanUrl: string;
}

export interface PublicCompany {
  id: string;
  name: string;
  address: string;
  licenseNumber: string;
  businessType: string;
  registrationDate: string;
  productCount: number;
  blockchainTxHash: string;
  etherscanUrl: string;
}

export interface PublicStats {
  verifiedProducts: number;
  verifiedCompanies: number;
  totalProducts: number;
  totalCompanies: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    current_page: number;
    total_items: number;
    total_pages: number;
    items_per_page: number;
  };
}

/**
 * Service for public API endpoints (no authentication required)
 * Used for transparency/landing page features
 */
export class PublicService {
  /**
   * Get verified products (those registered on blockchain)
   */
  static async getVerifiedProducts(page = 1, limit = 10): Promise<PaginatedResponse<PublicProduct>> {
    const response = await apiClient.get('/public/verified-products', {
      params: { page, limit },
    });
    return response.data;
  }

  /**
   * Get verified companies (those registered on blockchain)
   */
  static async getVerifiedCompanies(page = 1, limit = 10): Promise<PaginatedResponse<PublicCompany>> {
    const response = await apiClient.get('/public/verified-companies', {
      params: { page, limit },
    });
    return response.data;
  }

  /**
   * Get public statistics
   */
  static async getStats(): Promise<PublicStats> {
    const response = await apiClient.get('/public/stats');
    return response.data.data;
  }
}
