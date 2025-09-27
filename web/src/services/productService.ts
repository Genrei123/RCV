// Product Service - Sample implementation for product management
// This demonstrates CRUD Operations and advanced filtering

import ApiService from './apiService';
import type {
  Product,
  ProductFilters,
  ProductListResponse,
  ProductResponse,
  CreateProductRequest,
  UpdateProductRequest,
} from '../types/Sample';

export class ProductService {
  private static readonly BASE_PATH = '/products';

  // ================================
  // GET METHODS
  // ================================

  /**
   * Get paginated list of products with optional filters
   * @param filters - Pagination and filter parameters
   * @returns Promise<ProductListResponse>
   */
  static async getProducts(filters: ProductFilters = {}): Promise<ProductListResponse> {
    const params = {
      page: filters.page || 1,
      limit: filters.limit || 10,
      ...(filters.categoryId && { categoryId: filters.categoryId }),
      ...(filters.status && { status: filters.status }),
      ...(filters.manufacturerId && { manufacturerId: filters.manufacturerId }),
      ...(filters.search && { search: filters.search }),
      ...(filters.priceMin && { priceMin: filters.priceMin }),
      ...(filters.priceMax && { priceMax: filters.priceMax }),
      ...(filters.sortBy && { sortBy: filters.sortBy }),
      ...(filters.sortOrder && { sortOrder: filters.sortOrder }),
    };

    return ApiService.get<Product[]>(`${this.BASE_PATH}`, params);
  }

  /**
   * Get a single product by ID
   * @param id - Product ID
   * @returns Promise<ProductResponse>
   */
  static async getProductById(id: string): Promise<ProductResponse> {
    return ApiService.get<Product>(`${this.BASE_PATH}/${id}`);
  }

  /**
   * Get product by SKU
   * @param sku - Product SKU
   * @returns Promise<ProductResponse>
   */
  static async getProductBySku(sku: string): Promise<ProductResponse> {
    return ApiService.get<Product>(`${this.BASE_PATH}/sku/${sku}`);
  }

  /**
   * Get product by QR code
   * @param qrCode - QR code string
   * @returns Promise<ProductResponse>
   */
  static async getProductByQrCode(qrCode: string): Promise<ProductResponse> {
    return ApiService.get<Product>(`${this.BASE_PATH}/qr/${encodeURIComponent(qrCode)}`);
  }

  /**
   * Get featured/popular products
   * @param limit - Number of products to return
   * @returns Promise<ProductListResponse>
   */
  static async getFeaturedProducts(limit: number = 10): Promise<ProductListResponse> {
    return ApiService.get<Product[]>(`${this.BASE_PATH}/featured`, { limit });
  }

  // ================================
  // POST METHODS
  // ================================

  /**
   * Create a new product
   * @param productData - Product creation data
   * @returns Promise<ProductResponse>
   */
  static async createProduct(productData: CreateProductRequest): Promise<ProductResponse> {
    return ApiService.post<Product>(`${this.BASE_PATH}`, productData);
  }

  /**
   * Create a new product using the backend API structure
   * @param productData - Backend product creation data
   * @returns Promise with backend product structure
   */
  static async createBackendProduct(productData: any): Promise<any> {
    try {
      console.log('ProductService sending data:', JSON.stringify(productData, null, 2));
      const response = await ApiService.post(`${this.BASE_PATH}`, productData);
      console.log('ProductService received response:', response);
      return response;
    } catch (error: any) {
      console.error('ProductService error:', error);
      console.error('Error response:', error.response?.data);
      throw error;
    }
  }

  /**
   * Get all companies for the product form
   * @returns Promise with list of companies
   */
  static async getCompanies(): Promise<any> {
    return ApiService.get('/companies');
  }

  /**
   * Get all products using backend API structure
   * @returns Promise with list of products
   */
  static async getBackendProducts(): Promise<any> {
    return ApiService.get(`${this.BASE_PATH}`);
  }

  /**
   * Bulk create products
   * @param products - Array of product creation data
   * @returns Promise<ProductListResponse>
   */
  static async bulkCreateProducts(products: CreateProductRequest[]): Promise<ProductListResponse> {
    return ApiService.post<Product[]>(`${this.BASE_PATH}/bulk`, { products });
  }

  // ================================
  // PUT/PATCH METHODS
  // ================================

  /**
   * Update a product by ID
   * @param id - Product ID
   * @param productData - Partial product data to update
   * @returns Promise<ProductResponse>
   */
  static async updateProduct(id: string, productData: UpdateProductRequest): Promise<ProductResponse> {
    return ApiService.patch<Product>(`${this.BASE_PATH}/${id}`, productData);
  }

  /**
   * Update product status
   * @param id - Product ID
   * @param status - New status
   * @returns Promise<ProductResponse>
   */
  static async updateProductStatus(id: string, status: string): Promise<ProductResponse> {
    return ApiService.patch<Product>(`${this.BASE_PATH}/${id}/status`, { status });
  }

  // ================================
  // DELETE METHODS
  // ================================

  /**
   * Delete a product by ID
   * @param id - Product ID
   * @returns Promise<void>
   */
  static async deleteProduct(id: string): Promise<void> {
    await ApiService.delete(`${this.BASE_PATH}/${id}`);
  }

  /**
   * Bulk delete products
   * @param ids - Array of product IDs
   * @returns Promise<any>
   */
  static async bulkDeleteProducts(ids: string[]): Promise<any> {
    return ApiService.delete(`${this.BASE_PATH}/bulk?ids=${ids.join(',')}`);
  }

  // ================================
  // FILE UPLOAD METHODS
  // ================================

  /**
   * Upload product image
   * @param productId - Product ID
   * @param file - Image file
   * @param onProgress - Progress callback
   * @returns Promise<ProductResponse>
   */
  static async uploadProductImage(
    productId: string, 
    file: File, 
    onProgress?: (progress: number) => void
  ): Promise<ProductResponse> {
    return ApiService.uploadFile<Product>(`${this.BASE_PATH}/${productId}/image`, file, onProgress);
  }

  /**
   * Upload products from CSV file
   * @param file - CSV file
   * @param onProgress - Progress callback
   * @returns Promise<any>
   */
  static async uploadProductsCsv(
    file: File, 
    onProgress?: (progress: number) => void
  ): Promise<any> {
    return ApiService.uploadFile(`${this.BASE_PATH}/import/csv`, file, onProgress);
  }

  // ================================
  // SEARCH AND FILTER METHODS
  // ================================

  /**
   * Search products by name, SKU, or description
   * @param query - Search query
   * @param limit - Maximum number of results
   * @returns Promise<ProductListResponse>
   */
  static async searchProducts(query: string, limit: number = 10): Promise<ProductListResponse> {
    return ApiService.get<Product[]>(`${this.BASE_PATH}/search`, { q: query, limit });
  }

  /**
   * Get products by category
   * @param categoryId - Category ID
   * @param page - Page number
   * @param limit - Items per page
   * @returns Promise<ProductListResponse>
   */
  static async getProductsByCategory(
    categoryId: string, 
    page: number = 1, 
    limit: number = 10
  ): Promise<ProductListResponse> {
    return ApiService.get<Product[]>(`${this.BASE_PATH}/category/${categoryId}`, { page, limit });
  }

  /**
   * Get products by manufacturer
   * @param manufacturerId - Manufacturer ID
   * @param page - Page number
   * @param limit - Items per page
   * @returns Promise<ProductListResponse>
   */
  static async getProductsByManufacturer(
    manufacturerId: string, 
    page: number = 1, 
    limit: number = 10
  ): Promise<ProductListResponse> {
    return ApiService.get<Product[]>(`${this.BASE_PATH}/manufacturer/${manufacturerId}`, { page, limit });
  }

  /**
   * Get products by price range
   * @param minPrice - Minimum price
   * @param maxPrice - Maximum price
   * @param page - Page number
   * @param limit - Items per page
   * @returns Promise<ProductListResponse>
   */
  static async getProductsByPriceRange(
    minPrice: number, 
    maxPrice: number, 
    page: number = 1, 
    limit: number = 10
  ): Promise<ProductListResponse> {
    return ApiService.get<Product[]>(`${this.BASE_PATH}/price-range`, {
      minPrice,
      maxPrice,
      page,
      limit,
    });
  }

  // ================================
  // ANALYTICS AND REPORTING
  // ================================

  /**
   * Get product analytics
   * @param productId - Product ID
   * @param dateFrom - Start date (ISO string)
   * @param dateTo - End date (ISO string)
   * @returns Promise<any>
   */
  static async getProductAnalytics(
    productId: string, 
    dateFrom?: string, 
    dateTo?: string
  ): Promise<any> {
    const params = {
      ...(dateFrom && { dateFrom }),
      ...(dateTo && { dateTo }),
    };
    
    return ApiService.get(`${this.BASE_PATH}/${productId}/analytics`, params);
  }

  /**
   * Export products to CSV
   * @param filters - Filter parameters
   * @returns Promise<Blob>
   */
  static async exportProductsCsv(filters: ProductFilters = {}): Promise<Blob> {
    const params = {
      ...(filters.categoryId && { categoryId: filters.categoryId }),
      ...(filters.status && { status: filters.status }),
      ...(filters.manufacturerId && { manufacturerId: filters.manufacturerId }),
    };

    // Note: This would return a Blob for CSV download
    // You might need to adjust the API service to handle blob responses
    const response = await ApiService.get(`${this.BASE_PATH}/export/csv`, params);
    return response as unknown as Blob;
  }

  // ================================
  // QR CODE METHODS
  // ================================

  /**
   * Generate QR code for product
   * @param productId - Product ID
   * @returns Promise<any>
   */
  static async generateQrCode(productId: string): Promise<any> {
    return ApiService.post(`${this.BASE_PATH}/${productId}/qr-code/generate`);
  }

  /**
   * Download QR code image
   * @param productId - Product ID
   * @param format - Image format (png, svg, etc.)
   * @returns Promise<Blob>
   */
  static async downloadQrCode(productId: string, format: string = 'png'): Promise<Blob> {
    const response = await ApiService.get(`${this.BASE_PATH}/${productId}/qr-code/download`, { format });
    return response as unknown as Blob;
  }
}

// Export default for easier importing
export default ProductService;