// Sample types for RCV System - Template for API integration
// This file demonstrates the type structure your team should follow

// ================================
// COMMON TYPES
// ================================

// Standard API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
  pagination?: PaginationMeta;
}

// Pagination metadata
export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// Standard error response
export interface ApiError {
  message: string;
  code: string;
  details?: Record<string, unknown>;
}

// ================================
// SAMPLE DOMAIN TYPES
// ================================

// Sample User entity (replace with your actual entities)
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export type UserRole = "ADMIN" | "INSPECTOR" | "USER";

export type UserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

// Sample Product entity
export interface Product {
  id: string;
  name: string;
  description: string;
  sku: string;
  category: ProductCategory;
  status: ProductStatus;
  price: number;
  imageUrl?: string;
  qrCode?: string;
  manufacturerId: string;
  manufacturer?: Manufacturer;
  createdAt: string;
  updatedAt: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  description?: string;
}

export interface Manufacturer {
  id: string;
  name: string;
  email: string;
  address: string;
  verified: boolean;
}

export type ProductStatus = "ACTIVE" | "INACTIVE" | "DISCONTINUED";

// Sample Scan/Verification entity
export interface Scan {
  id: string;
  productId: string;
  product?: Product;
  inspectorId: string;
  inspector?: User;
  result: ScanResult;
  location: ScanLocation;
  timestamp: string;
  notes?: string;
  imageUrl?: string;
  blockchainHash?: string;
}

export interface ScanLocation {
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  country: string;
}

export type ScanResult = "VERIFIED" | "FAILED" | "SUSPICIOUS" | "PENDING";

// ================================
// REQUEST/RESPONSE TYPES
// ================================

// User-related requests
export interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  password: string;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  status?: UserStatus;
  avatar?: string;
}

export interface UserListResponse extends ApiResponse<User[]> {
  data: User[];
}

export interface UserResponse extends ApiResponse<User> {
  data: User;
}

// Product-related requests
export interface CreateProductRequest {
  name: string;
  description: string;
  sku: string;
  categoryId: string;
  price: number;
  manufacturerId: string;
  imageUrl?: string;
}

export interface UpdateProductRequest {
  name?: string;
  description?: string;
  price?: number;
  status?: ProductStatus;
  imageUrl?: string;
}

export interface ProductListResponse extends ApiResponse<Product[]> {
  data: Product[];
}

export interface ProductResponse extends ApiResponse<Product> {
  data: Product;
}

// Scan-related requests
export interface CreateScanRequest {
  productId: string;
  location: ScanLocation;
  notes?: string;
  imageUrl?: string;
}

export interface ScanListResponse extends ApiResponse<Scan[]> {
  data: Scan[];
}

export interface ScanResponse extends ApiResponse<Scan> {
  data: Scan;
}

// ================================
// FILTER/QUERY TYPES
// ================================

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UserFilters extends PaginationParams {
  role?: UserRole;
  status?: UserStatus;
  search?: string; // Search by name or email
}

export interface ProductFilters extends PaginationParams {
  categoryId?: string;
  status?: ProductStatus;
  manufacturerId?: string;
  search?: string; // Search by name or SKU
  priceMin?: number;
  priceMax?: number;
}

export interface ScanFilters extends PaginationParams {
  productId?: string;
  inspectorId?: string;
  result?: ScanResult;
  dateFrom?: string;
  dateTo?: string;
  location?: string;
}

// ================================
// AUTHENTICATION TYPES
// ================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse extends ApiResponse<AuthData> {
  data: AuthData;
}

export interface AuthData {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

// ================================
// DASHBOARD/ANALYTICS TYPES
// ================================

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalProducts: number;
  totalScans: number;
  verifiedScans: number;
  failedScans: number;
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: string;
  userId?: string;
  user?: User;
}

export type ActivityType = 
  | "USER_CREATED"
  | "USER_UPDATED" 
  | "PRODUCT_CREATED"
  | "PRODUCT_VERIFIED"
  | "SCAN_COMPLETED"
  | "SYSTEM_EVENT";

export interface DashboardResponse extends ApiResponse<DashboardStats> {
  data: DashboardStats;
}
