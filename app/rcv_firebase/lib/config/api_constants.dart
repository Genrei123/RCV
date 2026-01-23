// lib/config/api_constants.dart
// Configuration constants for API endpoints and settings

class ApiConstants {
  // Environment-specific base URLs
  static const String developmentUrl = 'https://rcv-production-cbd6.up.railway.app/api/v1';  // Android emulator
  static const String stagingUrl = 'https://rcv-production-cbd6.up.railway.app/api/v1';
  static const String productionUrl = 'https://rcv-production-cbd6.up.railway.app/api/v1';
  
  // Current environment (change this based on your build configuration)
  static const Environment currentEnvironment = Environment.development;
  
  // Base URL - computed at runtime
  static String get baseUrl => _getBaseUrl();
  
  // API endpoints
  static const String authEndpoint = '/auth';
  static const String usersEndpoint = '/users';
  static const String productsEndpoint = '/products';
  static const String scansEndpoint = '/scans';
  static const String dashboardEndpoint = '/dashboard';
  static const String uploadsEndpoint = '/uploads';
  
  // Specific auth endpoints
  static const String loginEndpoint = '$authEndpoint/login';
  static const String registerEndpoint = '$authEndpoint/register';
  static const String refreshTokenEndpoint = '$authEndpoint/refresh';
  static const String logoutEndpoint = '$authEndpoint/logout';
  static const String forgotPasswordEndpoint = '$authEndpoint/forgot-password';
  static const String resetPasswordEndpoint = '$authEndpoint/reset-password';
  static const String verifyEmailEndpoint = '$authEndpoint/verify-email';
  
  // Request timeouts (in milliseconds)
  static const int connectTimeout = 30000;  // 30 seconds
  static const int receiveTimeout = 30000;  // 30 seconds
  static const int sendTimeout = 30000;     // 30 seconds
  
  // Pagination defaults
  static const int defaultPageSize = 20;
  static const int maxPageSize = 100;
  
  // File upload limits
  static const int maxFileSize = 10 * 1024 * 1024; // 10MB
  static const List<String> allowedImageTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ];
  
  // Cache settings
  static const Duration cacheTimeout = Duration(minutes: 5);
  static const int maxCacheSize = 50; // Maximum number of cached items
  
  // Retry settings
  static const int maxRetryAttempts = 3;
  static const Duration retryDelay = Duration(seconds: 1);
  
  // Token settings
  static const Duration tokenRefreshThreshold = Duration(minutes: 5);
  
  // Get base URL based on environment
  static String _getBaseUrl() {
    switch (currentEnvironment) {
      case Environment.development:
        return developmentUrl;
      case Environment.staging:
        return stagingUrl;
      case Environment.production:
        return productionUrl;
    }
  }
  
  // Get full endpoint URL
  static String getFullUrl(String endpoint) {
    return '$baseUrl$endpoint';
  }
  
  // Check if endpoint requires authentication
  static bool requiresAuth(String endpoint) {
    final noAuthEndpoints = [
      loginEndpoint,
      registerEndpoint,
      forgotPasswordEndpoint,
      resetPasswordEndpoint,
    ];
    return !noAuthEndpoints.contains(endpoint);
  }
}

/// Environment enum
enum Environment {
  development,
  staging,
  production,
}

/// HTTP status codes
class HttpStatusCodes {
  static const int ok = 200;
  static const int created = 201;
  static const int accepted = 202;
  static const int noContent = 204;
  static const int badRequest = 400;
  static const int unauthorized = 401;
  static const int forbidden = 403;
  static const int notFound = 404;
  static const int methodNotAllowed = 405;
  static const int conflict = 409;
  static const int unprocessableEntity = 422;
  static const int tooManyRequests = 429;
  static const int internalServerError = 500;
  static const int badGateway = 502;
  static const int serviceUnavailable = 503;
  static const int gatewayTimeout = 504;
}

/// API response keys
class ApiResponseKeys {
  static const String success = 'success';
  static const String data = 'data';
  static const String message = 'message';
  static const String errors = 'errors';
  static const String pagination = 'pagination';
  static const String meta = 'meta';
}

/// Storage keys for local storage
class StorageKeys {
  static const String accessToken = 'access_token';
  static const String refreshToken = 'refresh_token';
  static const String tokenExpiry = 'token_expiry';
  static const String userProfile = 'user_profile';
  static const String appSettings = 'app_settings';
  static const String cachePrefix = 'cache_';
}