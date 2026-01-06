import { apiClient } from "./axiosConfig";
import type { BrandName } from "@/typeorm/entities/brandName.entity";
import type { Product } from "@/typeorm/entities/product.entity";

export interface CreateBrandNameRequest {
  name: string;
  description?: string;
}

export interface DeleteBrandNameRequest {
  newBrandNameId?: string;
  confirm?: boolean;
}

export interface BrandNameStats {
  _id: string;
  name: string;
  description?: string;
  productCount: number;
}

export interface PaginatedBrandNames {
  success: boolean;
  data: BrandName[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
  links: {
    first: string;
    prev: string | null;
    next: string | null;
    last: string;
  };
}

export interface PaginatedProducts {
  success: boolean;
  data: Product[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
  links: {
    first: string;
    prev: string | null;
    next: string | null;
    last: string;
  };
}

export const BrandNameService = {
  // Get all brand names with pagination
  async getAllBrandNames(
    page: number = 1,
    limit: number = 50,
    search?: string
  ): Promise<PaginatedBrandNames> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (search) params.append("search", search);

    const response = await apiClient.get<PaginatedBrandNames>(
      `/brand-name/brand-names?${params.toString()}`
    );
    return response.data;
  },

  // Get brand name by ID
  async getBrandNameById(id: string): Promise<{ success: boolean; data: BrandName }> {
    const response = await apiClient.get(`/brand-name/brand-names/${id}`);
    return response.data;
  },

  // Get products by brand name ID
  async getProductsByBrandName(
    id: string,
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedProducts> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    const response = await apiClient.get<PaginatedProducts>(
      `/brand-name/brand-names/${id}/products?${params.toString()}`
    );
    return response.data;
  },

  // Get brand name statistics
  async getBrandNameStats(): Promise<{ success: boolean; data: BrandNameStats[]; total: number }> {
    const response = await apiClient.get("/brand-name/brand-names/stats");
    return response.data;
  },

  // Create a new brand name
  async createBrandName(
    data: CreateBrandNameRequest
  ): Promise<{ success: boolean; message: string; data: BrandName }> {
    const response = await apiClient.post("/brand-name/brand-names", data);
    return response.data;
  },

  // Update a brand name
  async updateBrandName(
    id: string,
    data: Partial<CreateBrandNameRequest>
  ): Promise<{ success: boolean; message: string; data: BrandName }> {
    const response = await apiClient.put(`/brand-name/brand-names/${id}`, data);
    return response.data;
  },

  // Delete a brand name (with optional re-routing)
  async deleteBrandName(
    id: string,
    data?: DeleteBrandNameRequest
  ): Promise<{
    success: boolean;
    message?: string;
    requiresRerouting?: boolean;
    requiresConfirmation?: boolean;
    productCount?: number;
    products?: Array<{ _id: string; productName: string; brandName: string }>;
    targetBrandName?: string;
  }> {
    const response = await apiClient.delete(`/brand-name/brand-names/${id}`, { data });
    return response.data;
  },
};
