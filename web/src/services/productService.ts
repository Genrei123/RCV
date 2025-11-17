import type { Product } from "@/typeorm/entities/product.entity";
import { apiClient } from "./axiosConfig";

export interface ProductApiResponse {
  products?: Product[];
  data?: Product[];
  pagination?: any;
  links?: any;
}

export interface CreateProductResponse {
  success: boolean;
  message: string;
  product: Product;
  registeredBy: {
    _id: string;
    name: string;
    email: string;
  };
}

export interface CreateProductRequest {
  LTONumber: string;
  CFPRNumber: string;
  lotNumber: string;
  brandName: string;
  productName: string;
  productClassification: string;
  productSubClassification: string;
  expirationDate: Date;
  dateOfRegistration: Date;
  companyId: string;
}

export class ProductService {
  static async getAllProducts() {
    try {
      const response = await apiClient.get<ProductApiResponse>(
        "/product/products"
      );
      return response.data;
    } catch (error) {
      console.error(error);
    }
  }

  static async getProductsPage(page = 1, limit = 10, search?: string) {
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (search && search.trim().length > 0) {
        params.append("search", search.trim());
      }
      const response = await apiClient.get<ProductApiResponse>(
        `/product/products?${params.toString()}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching products page:", error);
      throw error;
    }
  }

  static async addProduct(productData: CreateProductRequest) {
    try {
      // The JWT token will be automatically added by axios interceptor
      // The backend will extract the user from the token
      const response = await apiClient.post<CreateProductResponse>(
        "/product/products",
        productData
      );
      return response.data;
    } catch (error: any) {
      console.error("Error creating product:", error);

      // Handle specific error cases
      if (error.response?.status === 401) {
        throw new Error("You must be logged in to create a product");
      }
      if (error.response?.status === 400) {
        throw new Error(
          error.response?.data?.message || "Invalid product data"
        );
      }

      throw error;
    }
  }

  static async getProductById(id: string) {
    try {
      const response = await apiClient.get<{ product: Product }>(
        `/product/products/${id}`
      );
      return response.data;
    } catch (error: any) {
      console.error("Error fetching product:", error);
      throw error;
    }
  }
}
