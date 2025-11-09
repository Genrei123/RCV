// lib/services/api_client.dart
// This is the main API client configuration using Dio
// It handles authentication, error handling, and request/response interceptors

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'dart:io';
import '../config/api_constants.dart';
import '../models/api_models.dart';
import 'token_service.dart';

class ApiClient {
  static ApiClient? _instance;
  late Dio _dio;

  // Singleton pattern for API client
  static ApiClient get instance {
    _instance ??= ApiClient._internal();
    return _instance!;
  }

  ApiClient._internal() {
    _initializeDio();
  }

  void _initializeDio() {
    _dio = Dio(BaseOptions(
      baseUrl: ApiConstants.baseUrl,
      connectTimeout: Duration(milliseconds: ApiConstants.connectTimeout),
      receiveTimeout: Duration(milliseconds: ApiConstants.receiveTimeout),
      sendTimeout: Duration(milliseconds: ApiConstants.sendTimeout),
      
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ));

    // Add interceptors
    _dio.interceptors.add(_createAuthInterceptor());
    _dio.interceptors.add(_createLoggingInterceptor());
    _dio.interceptors.add(_createErrorInterceptor());
  }

  /// Authentication interceptor - adds token to requests and handles refresh
  Interceptor _createAuthInterceptor() {
    return InterceptorsWrapper(
      onRequest: (options, handler) async {
        // Skip auth for login/register endpoints
        if (_isAuthEndpoint(options.path)) {
          return handler.next(options);
        }

        final token = await TokenService.getAccessToken();
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }

        handler.next(options);
      },
      onError: (error, handler) async {
        // Handle token expiration
        if (error.response?.statusCode == 401) {
          final refreshed = await _handleTokenRefresh();
          if (refreshed) {
            // Retry the original request
            final clonedRequest = await _retryRequest(error.requestOptions);
            return handler.resolve(clonedRequest);
          } else {
            // Refresh failed, redirect to login
            await TokenService.clearTokens();
            // TODO: Navigate to login screen
            // NavigationService.navigateToLogin();
          }
        }
        return handler.next(error);
      },
    );
  }

  /// Logging interceptor - logs requests and responses in debug mode
  Interceptor _createLoggingInterceptor() {
    return InterceptorsWrapper(
      onRequest: (options, handler) {
        if (kDebugMode) {
          print('🚀 REQUEST: ${options.method} ${options.path}');
          print('📤 Headers: ${options.headers}');
          if (options.data != null) {
            print('📦 Data: ${options.data}');
          }
          if (options.queryParameters.isNotEmpty) {
            print('🔍 Query: ${options.queryParameters}');
          }
        }
        handler.next(options);
      },
      onResponse: (response, handler) {
        if (kDebugMode) {
          print('✅ RESPONSE: ${response.statusCode} ${response.requestOptions.path}');
          print('📥 Data: ${response.data}');
        }
        handler.next(response);
      },
      onError: (error, handler) {
        if (kDebugMode) {
          print('❌ ERROR: ${error.response?.statusCode} ${error.requestOptions.path}');
          print('💥 Message: ${error.message}');
          print('📄 Response: ${error.response?.data}');
        }
        handler.next(error);
      },
    );
  }

  /// Error interceptor - handles common HTTP errors
  Interceptor _createErrorInterceptor() {
    return InterceptorsWrapper(
      onError: (error, handler) {
        String errorMessage = _getErrorMessage(error);
        
        // Create a custom exception with user-friendly message
        final customError = DioException(
          requestOptions: error.requestOptions,
          response: error.response,
          error: errorMessage,
          type: error.type,
        );

        handler.next(customError);
      },
    );
  }

  /// Check if endpoint requires authentication
  bool _isAuthEndpoint(String path) {
    final authEndpoints = [
      '/auth/login',
      '/auth/register',
      '/auth/forgot-password',
      '/auth/reset-password',
    ];
    return authEndpoints.any((endpoint) => path.contains(endpoint));
  }

  /// Handle token refresh
  Future<bool> _handleTokenRefresh() async {
    try {
      final refreshToken = await TokenService.getRefreshToken();
      if (refreshToken == null) return false;

      final response = await _dio.post(
        '/auth/refresh',
        data: {'refreshToken': refreshToken},
        options: Options(
          headers: {'Authorization': null}, // Remove expired token
        ),
      );

      if (response.statusCode == 200) {
        final authData = AuthData.fromJson(response.data['data']);
        await TokenService.saveTokens(
          authData.accessToken,
          authData.refreshToken,
          authData.expiresIn,
        );
        return true;
      }
      return false;
    } catch (e) {
      print('Token refresh failed: $e');
      return false;
    }
  }

  /// Retry original request with new token
  Future<Response> _retryRequest(RequestOptions requestOptions) async {
    final token = await TokenService.getAccessToken();
    requestOptions.headers['Authorization'] = 'Bearer $token';
    
    return _dio.request(
      requestOptions.path,
      data: requestOptions.data,
      queryParameters: requestOptions.queryParameters,
      options: Options(
        method: requestOptions.method,
        headers: requestOptions.headers,
      ),
    );
  }

  /// Convert DioException to user-friendly message
  String _getErrorMessage(DioException error) {
    switch (error.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return 'Connection timeout. Please check your internet connection.';
      
      case DioExceptionType.badResponse:
        final statusCode = error.response?.statusCode;
        switch (statusCode) {
          case 400:
            return _extractErrorMessage(error.response?.data) ?? 'Bad request';
          case 401:
            return 'Authentication failed. Please login again.';
          case 403:
            return 'Access denied. You don\'t have permission for this action.';
          case 404:
            return 'Resource not found.';
          case 422:
            return _extractValidationErrors(error.response?.data) ?? 'Validation error';
          case 500:
            return 'Server error. Please try again later.';
          default:
            return 'Request failed with status $statusCode';
        }
      
      case DioExceptionType.cancel:
        return 'Request was cancelled';
      
      case DioExceptionType.connectionError:
      case DioExceptionType.unknown:
        if (error.error is SocketException) {
          return 'No internet connection';
        }
        return 'An unexpected error occurred';
      
      default:
        return 'An unexpected error occurred';
    }
  }

  /// Extract error message from API response
  String? _extractErrorMessage(dynamic data) {
    if (data is Map<String, dynamic>) {
      return data['message'] ?? data['error'];
    }
    return null;
  }

  /// Extract validation errors from API response
  String? _extractValidationErrors(dynamic data) {
    if (data is Map<String, dynamic>) {
      final errors = data['errors'];
      if (errors is List && errors.isNotEmpty) {
        return errors.join(', ');
      }
      return data['message'];
    }
    return null;
  }

  // Public API methods

  /// GET request
  Future<Response<T>> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
  }) async {
    return await _dio.get<T>(
      path,
      queryParameters: queryParameters,
      options: options,
      cancelToken: cancelToken,
    );
  }

  /// POST request
  Future<Response<T>> post<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
  }) async {
    return await _dio.post<T>(
      path,
      data: data,
      queryParameters: queryParameters,
      options: options,
      cancelToken: cancelToken,
    );
  }

  /// PUT request
  Future<Response<T>> put<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
  }) async {
    return await _dio.put<T>(
      path,
      data: data,
      queryParameters: queryParameters,
      options: options,
      cancelToken: cancelToken,
    );
  }

  /// PATCH request
  Future<Response<T>> patch<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
  }) async {
    return await _dio.patch<T>(
      path,
      data: data,
      queryParameters: queryParameters,
      options: options,
      cancelToken: cancelToken,
    );
  }

  /// DELETE request
  Future<Response<T>> delete<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
  }) async {
    return await _dio.delete<T>(
      path,
      data: data,
      queryParameters: queryParameters,
      options: options,
      cancelToken: cancelToken,
    );
  }

  /// Upload file
  Future<Response<T>> uploadFile<T>(
    String path,
    String filePath, {
    String fieldName = 'file',
    Map<String, dynamic>? data,
    ProgressCallback? onSendProgress,
  }) async {
    final formData = FormData.fromMap({
      fieldName: await MultipartFile.fromFile(filePath),
      ...?data,
    });

    return await _dio.post<T>(
      path,
      data: formData,
      onSendProgress: onSendProgress,
    );
  }

  /// Download file
  Future<Response> downloadFile(
    String path,
    String savePath, {
    ProgressCallback? onReceiveProgress,
    CancelToken? cancelToken,
  }) async {
    return await _dio.download(
      path,
      savePath,
      onReceiveProgress: onReceiveProgress,
      cancelToken: cancelToken,
    );
  }

  /// Cancel all requests
  void cancelAllRequests() {
    _dio.interceptors.clear();
  }

  /// Update base URL (useful for switching environments)
  void updateBaseUrl(String newBaseUrl) {
    _dio.options.baseUrl = newBaseUrl;
  }

  /// Get current Dio instance (for advanced usage)
  Dio get dio => _dio;
}