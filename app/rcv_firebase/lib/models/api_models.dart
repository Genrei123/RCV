// lib/models/api_models.dart
// This file contains all the data models for API communication
// Similar to TypeScript interfaces, these define the structure of your data

/// Base API Response wrapper - all API responses should follow this structure
class ApiResponse<T> {
  final bool success;
  final T? data;
  final String? message;
  final List<String>? errors;
  final PaginationMeta? pagination;

  ApiResponse({
    required this.success,
    this.data,
    this.message,
    this.errors,
    this.pagination,
  });

  factory ApiResponse.fromJson(
    Map<String, dynamic> json,
    T Function(dynamic) fromJsonT,
  ) {
    return ApiResponse<T>(
      success: json['success'] ?? false,
      data: json['data'] != null ? fromJsonT(json['data']) : null,
      message: json['message'],
      errors: json['errors'] != null ? List<String>.from(json['errors']) : null,
      pagination: json['pagination'] != null 
          ? PaginationMeta.fromJson(json['pagination']) 
          : null,
    );
  }

  Map<String, dynamic> toJson(Map<String, dynamic> Function(T?) toJsonT) {
    return {
      'success': success,
      'data': data != null ? toJsonT(data) : null,
      'message': message,
      'errors': errors,
      'pagination': pagination?.toJson(),
    };
  }
}

/// Pagination metadata for paginated responses
class PaginationMeta {
  final int currentPage;
  final int totalPages;
  final int totalItems;
  final int itemsPerPage;
  final bool hasNextPage;
  final bool hasPrevPage;

  PaginationMeta({
    required this.currentPage,
    required this.totalPages,
    required this.totalItems,
    required this.itemsPerPage,
    required this.hasNextPage,
    required this.hasPrevPage,
  });

  factory PaginationMeta.fromJson(Map<String, dynamic> json) {
    return PaginationMeta(
      currentPage: json['currentPage'] ?? 1,
      totalPages: json['totalPages'] ?? 1,
      totalItems: json['totalItems'] ?? 0,
      itemsPerPage: json['itemsPerPage'] ?? 10,
      hasNextPage: json['hasNextPage'] ?? false,
      hasPrevPage: json['hasPrevPage'] ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'currentPage': currentPage,
      'totalPages': totalPages,
      'totalItems': totalItems,
      'itemsPerPage': itemsPerPage,
      'hasNextPage': hasNextPage,
      'hasPrevPage': hasPrevPage,
    };
  }
}

/// User model - matches backend User entity
class User {
  final String id;
  final String email;
  final String firstName;
  final String lastName;
  final UserRole role;
  final UserStatus status;
  final String? avatar;
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime? lastLoginAt;

  User({
    required this.id,
    required this.email,
    required this.firstName,
    required this.lastName,
    required this.role,
    required this.status,
    this.avatar,
    required this.createdAt,
    required this.updatedAt,
    this.lastLoginAt,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'],
      email: json['email'],
      firstName: json['firstName'],
      lastName: json['lastName'],
      role: UserRole.values.firstWhere(
        (e) => e.toString().split('.').last == json['role'],
        orElse: () => UserRole.user,
      ),
      status: UserStatus.values.firstWhere(
        (e) => e.toString().split('.').last == json['status'],
        orElse: () => UserStatus.active,
      ),
      avatar: json['avatar'],
      createdAt: DateTime.parse(json['createdAt']),
      updatedAt: DateTime.parse(json['updatedAt']),
      lastLoginAt: json['lastLoginAt'] != null 
          ? DateTime.parse(json['lastLoginAt']) 
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'firstName': firstName,
      'lastName': lastName,
      'role': role.toString().split('.').last.toUpperCase(),
      'status': status.toString().split('.').last.toUpperCase(),
      'avatar': avatar,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
      'lastLoginAt': lastLoginAt?.toIso8601String(),
    };
  }

  String get fullName => '$firstName $lastName';
}

/// User roles enum
enum UserRole { admin, inspector, user }

/// User status enum
enum UserStatus { active, inactive, suspended }

/// Product model - matches backend Product entity
class Product {
  final String id;
  final String name;
  final String description;
  final String sku;
  final ProductCategory? category;
  final ProductStatus status;
  final double price;
  final String? imageUrl;
  final String? qrCode;
  final String manufacturerId;
  final Manufacturer? manufacturer;
  final DateTime createdAt;
  final DateTime updatedAt;

  Product({
    required this.id,
    required this.name,
    required this.description,
    required this.sku,
    this.category,
    required this.status,
    required this.price,
    this.imageUrl,
    this.qrCode,
    required this.manufacturerId,
    this.manufacturer,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      id: json['id'],
      name: json['name'],
      description: json['description'],
      sku: json['sku'],
      category: json['category'] != null 
          ? ProductCategory.fromJson(json['category']) 
          : null,
      status: ProductStatus.values.firstWhere(
        (e) => e.toString().split('.').last == json['status'],
        orElse: () => ProductStatus.active,
      ),
      price: (json['price'] ?? 0).toDouble(),
      imageUrl: json['imageUrl'],
      qrCode: json['qrCode'],
      manufacturerId: json['manufacturerId'],
      manufacturer: json['manufacturer'] != null 
          ? Manufacturer.fromJson(json['manufacturer']) 
          : null,
      createdAt: DateTime.parse(json['createdAt']),
      updatedAt: DateTime.parse(json['updatedAt']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'sku': sku,
      'category': category?.toJson(),
      'status': status.toString().split('.').last.toUpperCase(),
      'price': price,
      'imageUrl': imageUrl,
      'qrCode': qrCode,
      'manufacturerId': manufacturerId,
      'manufacturer': manufacturer?.toJson(),
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }
}

/// Product status enum
enum ProductStatus { active, inactive, discontinued }

/// Product category model
class ProductCategory {
  final String id;
  final String name;
  final String? description;

  ProductCategory({
    required this.id,
    required this.name,
    this.description,
  });

  factory ProductCategory.fromJson(Map<String, dynamic> json) {
    return ProductCategory(
      id: json['id'],
      name: json['name'],
      description: json['description'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
    };
  }
}

/// Manufacturer model
class Manufacturer {
  final String id;
  final String name;
  final String email;
  final String address;
  final bool verified;

  Manufacturer({
    required this.id,
    required this.name,
    required this.email,
    required this.address,
    required this.verified,
  });

  factory Manufacturer.fromJson(Map<String, dynamic> json) {
    return Manufacturer(
      id: json['id'],
      name: json['name'],
      email: json['email'],
      address: json['address'],
      verified: json['verified'] ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'address': address,
      'verified': verified,
    };
  }
}

/// Scan/Verification model
class Scan {
  final String id;
  final String productId;
  final Product? product;
  final String inspectorId;
  final User? inspector;
  final ScanResult result;
  final ScanLocation location;
  final DateTime timestamp;
  final String? notes;
  final String? imageUrl;
  final String? blockchainHash;

  Scan({
    required this.id,
    required this.productId,
    this.product,
    required this.inspectorId,
    this.inspector,
    required this.result,
    required this.location,
    required this.timestamp,
    this.notes,
    this.imageUrl,
    this.blockchainHash,
  });

  factory Scan.fromJson(Map<String, dynamic> json) {
    return Scan(
      id: json['id'],
      productId: json['productId'],
      product: json['product'] != null 
          ? Product.fromJson(json['product']) 
          : null,
      inspectorId: json['inspectorId'],
      inspector: json['inspector'] != null 
          ? User.fromJson(json['inspector']) 
          : null,
      result: ScanResult.values.firstWhere(
        (e) => e.toString().split('.').last == json['result'],
        orElse: () => ScanResult.pending,
      ),
      location: ScanLocation.fromJson(json['location']),
      timestamp: DateTime.parse(json['timestamp']),
      notes: json['notes'],
      imageUrl: json['imageUrl'],
      blockchainHash: json['blockchainHash'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'productId': productId,
      'product': product?.toJson(),
      'inspectorId': inspectorId,
      'inspector': inspector?.toJson(),
      'result': result.toString().split('.').last.toUpperCase(),
      'location': location.toJson(),
      'timestamp': timestamp.toIso8601String(),
      'notes': notes,
      'imageUrl': imageUrl,
      'blockchainHash': blockchainHash,
    };
  }
}

/// Scan result enum
enum ScanResult { verified, failed, suspicious, pending }

/// Scan location model
class ScanLocation {
  final double latitude;
  final double longitude;
  final String address;
  final String city;
  final String country;

  ScanLocation({
    required this.latitude,
    required this.longitude,
    required this.address,
    required this.city,
    required this.country,
  });

  factory ScanLocation.fromJson(Map<String, dynamic> json) {
    return ScanLocation(
      latitude: (json['latitude'] ?? 0.0).toDouble(),
      longitude: (json['longitude'] ?? 0.0).toDouble(),
      address: json['address'] ?? '',
      city: json['city'] ?? '',
      country: json['country'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'latitude': latitude,
      'longitude': longitude,
      'address': address,
      'city': city,
      'country': country,
    };
  }
}

/// Authentication data model
class AuthData {
  final User user;
  final String accessToken;
  final String refreshToken;
  final int expiresIn;

  AuthData({
    required this.user,
    required this.accessToken,
    required this.refreshToken,
    required this.expiresIn,
  });

  factory AuthData.fromJson(Map<String, dynamic> json) {
    return AuthData(
      user: User.fromJson(json['user']),
      accessToken: json['accessToken'],
      refreshToken: json['refreshToken'],
      expiresIn: json['expiresIn'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'user': user.toJson(),
      'accessToken': accessToken,
      'refreshToken': refreshToken,
      'expiresIn': expiresIn,
    };
  }
}

/// Login request model
class LoginRequest {
  final String email;
  final String password;

  LoginRequest({
    required this.email,
    required this.password,
  });

  Map<String, dynamic> toJson() {
    return {
      'email': email,
      'password': password,
    };
  }
}

/// Dashboard statistics model
class DashboardStats {
  final int totalUsers;
  final int activeUsers;
  final int totalProducts;
  final int totalScans;
  final int verifiedScans;
  final int failedScans;
  final List<ActivityItem> recentActivity;

  DashboardStats({
    required this.totalUsers,
    required this.activeUsers,
    required this.totalProducts,
    required this.totalScans,
    required this.verifiedScans,
    required this.failedScans,
    required this.recentActivity,
  });

  factory DashboardStats.fromJson(Map<String, dynamic> json) {
    return DashboardStats(
      totalUsers: json['totalUsers'] ?? 0,
      activeUsers: json['activeUsers'] ?? 0,
      totalProducts: json['totalProducts'] ?? 0,
      totalScans: json['totalScans'] ?? 0,
      verifiedScans: json['verifiedScans'] ?? 0,
      failedScans: json['failedScans'] ?? 0,
      recentActivity: (json['recentActivity'] as List<dynamic>?)
              ?.map((e) => ActivityItem.fromJson(e))
              .toList() ??
          [],
    );
  }
}

/// Activity item model
class ActivityItem {
  final String id;
  final ActivityType type;
  final String title;
  final String description;
  final DateTime timestamp;
  final String? userId;
  final User? user;

  ActivityItem({
    required this.id,
    required this.type,
    required this.title,
    required this.description,
    required this.timestamp,
    this.userId,
    this.user,
  });

  factory ActivityItem.fromJson(Map<String, dynamic> json) {
    return ActivityItem(
      id: json['id'],
      type: ActivityType.values.firstWhere(
        (e) => e.toString().split('.').last == json['type'],
        orElse: () => ActivityType.systemEvent,
      ),
      title: json['title'],
      description: json['description'],
      timestamp: DateTime.parse(json['timestamp']),
      userId: json['userId'],
      user: json['user'] != null ? User.fromJson(json['user']) : null,
    );
  }
}

/// Activity type enum
enum ActivityType {
  userCreated,
  userUpdated,
  productCreated,
  productVerified,
  scanCompleted,
  systemEvent,
}