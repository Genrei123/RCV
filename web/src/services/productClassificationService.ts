import { apiClient } from "./axiosConfig";
import type { ProductClassification } from "@/typeorm/entities/productClassification.entity";
import type { Product } from "@/typeorm/entities/product.entity";

export interface CreateClassificationRequest {
  name: string;
  description?: string;
  parentId?: string;
}

export interface DeleteClassificationRequest {
  newClassificationId?: string;
  confirm?: boolean;
  type?: "classification" | "subClassification";
}

export interface ClassificationStats {
  _id: string;
  name: string;
  description?: string;
  productCount: number;
  subClassifications: Array<{
    _id: string;
    name: string;
    productCount: number;
  }>;
  totalSubClassificationProducts: number;
}

export interface PaginatedClassifications {
  success: boolean;
  data: ProductClassification[];
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

export const ProductClassificationService = {
  // Get all classifications with pagination
  async getAllClassifications(
    page: number = 1,
    limit: number = 50,
    search?: string,
    includeSubClassifications: boolean = false
  ): Promise<PaginatedClassifications> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      includeSubClassifications: includeSubClassifications.toString(),
    });
    if (search) params.append("search", search);

    const response = await apiClient.get<PaginatedClassifications>(
      `/classification/classifications?${params.toString()}`
    );
    return response.data;
  },

  // Get sub-classifications for a parent
  async getSubClassifications(
    parentId: string
  ): Promise<{ success: boolean; data: ProductClassification[] }> {
    const response = await apiClient.get(
      `/classification/classifications/${parentId}/sub-classifications`
    );
    return response.data;
  },

  // Get classification by ID
  async getClassificationById(
    id: string
  ): Promise<{ success: boolean; data: ProductClassification }> {
    const response = await apiClient.get(`/classification/classifications/${id}`);
    return response.data;
  },

  // Get products by classification ID
  async getProductsByClassification(
    id: string,
    type: "classification" | "subClassification" = "classification",
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedProducts> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      type,
    });
    const response = await apiClient.get<PaginatedProducts>(
      `/classification/classifications/${id}/products?${params.toString()}`
    );
    return response.data;
  },

  // Get classification statistics
  async getClassificationStats(): Promise<{
    success: boolean;
    data: ClassificationStats[];
    total: number;
  }> {
    const response = await apiClient.get("/classification/classifications/stats");
    return response.data;
  },

  // Create a new classification
  async createClassification(
    data: CreateClassificationRequest
  ): Promise<{ success: boolean; message: string; data: ProductClassification }> {
    const response = await apiClient.post("/classification/classifications", data);
    return response.data;
  },

  // Update a classification
  async updateClassification(
    id: string,
    data: Partial<CreateClassificationRequest>
  ): Promise<{ success: boolean; message: string; data: ProductClassification }> {
    const response = await apiClient.put(`/classification/classifications/${id}`, data);
    return response.data;
  },

  // Delete a classification (with optional re-routing)
  async deleteClassification(
    id: string,
    data?: DeleteClassificationRequest
  ): Promise<{
    success: boolean;
    message?: string;
    requiresRerouting?: boolean;
    requiresConfirmation?: boolean;
    productCount?: number;
    isSubClassification?: boolean;
    products?: Array<{
      _id: string;
      productName: string;
      productClassification: string;
      productSubClassification: string;
    }>;
    targetClassification?: string;
  }> {
    const response = await apiClient.delete(`/classification/classifications/${id}`, {
      data,
    });
    return response.data;
  },
};
