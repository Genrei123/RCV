// lib/services/product_service.dart
// Service for product management operations

import '../models/api_models.dart';
import '../config/api_constants.dart';
import 'api_client.dart';

class ProductService {
  static final ApiClient _apiClient = ApiClient.instance;

  /// Get paginated list of products
  static Future<ApiResponse<List<Product>>> getProducts({
    int page = 1,
    int limit = 20,
    String? search,
    ProductStatus? status,
    String? categoryId,
    String? manufacturerId,
  }) async {
    try {
      final queryParams = <String, dynamic>{
        'page': page,
        'limit': limit,
      };

      if (search != null && search.isNotEmpty) {
        queryParams['search'] = search;
      }
      if (status != null) {
        queryParams['status'] = status.toString().split('.').last.toUpperCase();
      }
      if (categoryId != null) {
        queryParams['categoryId'] = categoryId;
      }
      if (manufacturerId != null) {
        queryParams['manufacturerId'] = manufacturerId;
      }

      final response = await _apiClient.get(
        ApiConstants.productsEndpoint,
        queryParameters: queryParams,
      );

      return ApiResponse<List<Product>>.fromJson(
        response.data,
        (data) => (data as List).map((item) => Product.fromJson(item)).toList(),
      );
    } catch (e) {
      return ApiResponse<List<Product>>(
        success: false,
        message: 'Failed to fetch products: ${e.toString()}',
        errors: [e.toString()],
        data: [],
      );
    }
  }

  /// Get product by ID
  static Future<ApiResponse<Product>> getProductById(String id) async {
    try {
      final response = await _apiClient.get('${ApiConstants.productsEndpoint}/$id');

      return ApiResponse<Product>.fromJson(
        response.data,
        (data) => Product.fromJson(data),
      );
    } catch (e) {
      return ApiResponse<Product>(
        success: false,
        message: 'Failed to fetch product: ${e.toString()}',
        errors: [e.toString()],
      );
    }
  }

  /// Get product by SKU
  static Future<ApiResponse<Product>> getProductBySku(String sku) async {
    try {
      final response = await _apiClient.get(
        '${ApiConstants.productsEndpoint}/sku/$sku',
      );

      return ApiResponse<Product>.fromJson(
        response.data,
        (data) => Product.fromJson(data),
      );
    } catch (e) {
      return ApiResponse<Product>(
        success: false,
        message: 'Failed to fetch product by SKU: ${e.toString()}',
        errors: [e.toString()],
      );
    }
  }

  /// Create new product
  static Future<ApiResponse<Product>> createProduct({
    required String name,
    required String description,
    required String sku,
    required double price,
    required String manufacturerId,
    String? categoryId,
    String? imageUrl,
    ProductStatus status = ProductStatus.active,
  }) async {
    try {
      final productData = {
        'name': name,
        'description': description,
        'sku': sku,
        'price': price,
        'manufacturerId': manufacturerId,
        'status': status.toString().split('.').last.toUpperCase(),
        if (categoryId != null) 'categoryId': categoryId,
        if (imageUrl != null) 'imageUrl': imageUrl,
      };

      final response = await _apiClient.post(
        ApiConstants.productsEndpoint,
        data: productData,
      );

      return ApiResponse<Product>.fromJson(
        response.data,
        (data) => Product.fromJson(data),
      );
    } catch (e) {
      return ApiResponse<Product>(
        success: false,
        message: 'Failed to create product: ${e.toString()}',
        errors: [e.toString()],
      );
    }
  }

  /// Update existing product
  static Future<ApiResponse<Product>> updateProduct(
    String id, {
    String? name,
    String? description,
    String? sku,
    double? price,
    String? manufacturerId,
    String? categoryId,
    String? imageUrl,
    ProductStatus? status,
  }) async {
    try {
      final updateData = <String, dynamic>{};
      
      if (name != null) updateData['name'] = name;
      if (description != null) updateData['description'] = description;
      if (sku != null) updateData['sku'] = sku;
      if (price != null) updateData['price'] = price;
      if (manufacturerId != null) updateData['manufacturerId'] = manufacturerId;
      if (categoryId != null) updateData['categoryId'] = categoryId;
      if (imageUrl != null) updateData['imageUrl'] = imageUrl;
      if (status != null) {
        updateData['status'] = status.toString().split('.').last.toUpperCase();
      }

      final response = await _apiClient.put(
        '${ApiConstants.productsEndpoint}/$id',
        data: updateData,
      );

      return ApiResponse<Product>.fromJson(
        response.data,
        (data) => Product.fromJson(data),
      );
    } catch (e) {
      return ApiResponse<Product>(
        success: false,
        message: 'Failed to update product: ${e.toString()}',
        errors: [e.toString()],
      );
    }
  }

  /// Delete product
  static Future<ApiResponse<void>> deleteProduct(String id) async {
    try {
      final response = await _apiClient.delete('${ApiConstants.productsEndpoint}/$id');

      return ApiResponse<void>.fromJson(
        response.data,
        (_) {},
      );
    } catch (e) {
      return ApiResponse<void>(
        success: false,
        message: 'Failed to delete product: ${e.toString()}',
        errors: [e.toString()],
      );
    }
  }

  /// Upload product image
  static Future<ApiResponse<String>> uploadProductImage(
    String productId,
    String imagePath,
  ) async {
    try {
      final response = await _apiClient.uploadFile(
        '${ApiConstants.productsEndpoint}/$productId/image',
        imagePath,
        fieldName: 'image',
      );

      return ApiResponse<String>.fromJson(
        response.data,
        (data) => data['imageUrl'] as String,
      );
    } catch (e) {
      return ApiResponse<String>(
        success: false,
        message: 'Failed to upload product image: ${e.toString()}',
        errors: [e.toString()],
      );
    }
  }

  /// Get product categories
  static Future<ApiResponse<List<ProductCategory>>> getCategories() async {
    try {
      final response = await _apiClient.get('${ApiConstants.productsEndpoint}/categories');

      return ApiResponse<List<ProductCategory>>.fromJson(
        response.data,
        (data) => (data as List).map((item) => ProductCategory.fromJson(item)).toList(),
      );
    } catch (e) {
      return ApiResponse<List<ProductCategory>>(
        success: false,
        message: 'Failed to fetch categories: ${e.toString()}',
        errors: [e.toString()],
        data: [],
      );
    }
  }

  /// Search products with advanced filters
  static Future<ApiResponse<List<Product>>> searchProducts({
    required String query,
    List<ProductStatus>? statuses,
    List<String>? categoryIds,
    List<String>? manufacturerIds,
    double? minPrice,
    double? maxPrice,
    DateTime? createdAfter,
    DateTime? createdBefore,
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final queryParams = <String, dynamic>{
        'q': query,
        'page': page,
        'limit': limit,
      };

      if (statuses != null && statuses.isNotEmpty) {
        queryParams['statuses'] = statuses
            .map((s) => s.toString().split('.').last.toUpperCase())
            .join(',');
      }
      if (categoryIds != null && categoryIds.isNotEmpty) {
        queryParams['categoryIds'] = categoryIds.join(',');
      }
      if (manufacturerIds != null && manufacturerIds.isNotEmpty) {
        queryParams['manufacturerIds'] = manufacturerIds.join(',');
      }
      if (minPrice != null) queryParams['minPrice'] = minPrice;
      if (maxPrice != null) queryParams['maxPrice'] = maxPrice;
      if (createdAfter != null) queryParams['createdAfter'] = createdAfter.toIso8601String();
      if (createdBefore != null) queryParams['createdBefore'] = createdBefore.toIso8601String();

      final response = await _apiClient.get(
        '${ApiConstants.productsEndpoint}/search',
        queryParameters: queryParams,
      );

      return ApiResponse<List<Product>>.fromJson(
        response.data,
        (data) => (data as List).map((item) => Product.fromJson(item)).toList(),
      );
    } catch (e) {
      return ApiResponse<List<Product>>(
        success: false,
        message: 'Failed to search products: ${e.toString()}',
        errors: [e.toString()],
        data: [],
      );
    }
  }

  /// Verify product by QR code scanning
  static Future<ApiResponse<Product>> verifyProductByQR(String qrCode) async {
    try {
      final response = await _apiClient.post(
        '${ApiConstants.productsEndpoint}/verify-qr',
        data: {'qrCode': qrCode},
      );

      return ApiResponse<Product>.fromJson(
        response.data,
        (data) => Product.fromJson(data),
      );
    } catch (e) {
      return ApiResponse<Product>(
        success: false,
        message: 'Failed to verify product: ${e.toString()}',
        errors: [e.toString()],
      );
    }
  }

  /// Get product verification history
  static Future<ApiResponse<List<Scan>>> getProductVerificationHistory(
    String productId, {
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final response = await _apiClient.get(
        '${ApiConstants.productsEndpoint}/$productId/verifications',
        queryParameters: {
          'page': page,
          'limit': limit,
        },
      );

      return ApiResponse<List<Scan>>.fromJson(
        response.data,
        (data) => (data as List).map((item) => Scan.fromJson(item)).toList(),
      );
    } catch (e) {
      return ApiResponse<List<Scan>>(
        success: false,
        message: 'Failed to fetch verification history: ${e.toString()}',
        errors: [e.toString()],
        data: [],
      );
    }
  }
}