import type { Product } from "@/typeorm/entities/product.entity";
import { apiClient } from "./axiosConfig";

export interface ProductApiResponse {
    products: Product[]
}

export class ProductService {
    static async getAllProducts() {
        try {
            const response = await apiClient.get<ProductApiResponse>('/product/products');
            return response.data;
        } catch (error) {
            console.error(error);
        }

    }

    static async addProducts() {
        // TO DO
    }
}