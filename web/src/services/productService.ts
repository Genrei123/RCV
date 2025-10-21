import type { Product } from "@/typeorm/entities/product.entity";
import { apiClient } from "./axiosConfig";
import type { User } from "@/typeorm/entities/user.entity";
import type { Company } from "@/typeorm/entities/company.entity";

export interface ProductApiResponse {
  products?: Product[];
  data?: Product[];
  pagination?: any;
  links?: any;
}

export interface CreateProductResponse {
  message: string;
  company: Product;
}

export interface CreateProductRequest {
  LTONumber: string;
  CFPRNumber: string;
  lotNumber: string;
  brandName: string;
  productName: string;
  productClassification: number;
  productSubClassification: number;
  expirationDate: Date;
  dateOfRegistration: Date;
  registeredById: User;
  registeredAt: Date;
  companyId: Company;
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

  static async getProductsPage(page = 1, limit = 10) {
    try {
      const response = await apiClient.get<ProductApiResponse>(
        `/product/products?page=${page}&limit=${limit}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching products page:", error);
      throw error;
    }
  }

  static async addProduct(productData: CreateProductRequest) {
    try {
      const response = await apiClient.post<CreateProductResponse>(
        "/product/products",
        productData
      );
      return response.data;
    } catch (error: any) {
      console.error("Error creating product:", error);
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
