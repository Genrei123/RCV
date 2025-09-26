// lib/services/auth_service.dart
// Authentication service for login, logout, token management, and user state

import '../models/api_models.dart';
import '../config/api_constants.dart';
import 'api_client.dart';
import 'token_service.dart';

class AuthService {
  static final ApiClient _apiClient = ApiClient.instance;

  /// Login with email and password
  static Future<ApiResponse<AuthData>> login(String email, String password) async {
    try {
      final loginRequest = LoginRequest(email: email, password: password);
      
      final response = await _apiClient.post(
        ApiConstants.loginEndpoint,
        data: loginRequest.toJson(),
      );

      final apiResponse = ApiResponse<AuthData>.fromJson(
        response.data,
        (data) => AuthData.fromJson(data),
      );

      // Save tokens if login successful
      if (apiResponse.success && apiResponse.data != null) {
        final authData = apiResponse.data!;
        await TokenService.saveTokens(
          authData.accessToken,
          authData.refreshToken,
          authData.expiresIn,
        );
      }

      return apiResponse;
    } catch (e) {
      return ApiResponse<AuthData>(
        success: false,
        message: 'Login failed: ${e.toString()}',
        errors: [e.toString()],
      );
    }
  }

  /// Register new user account
  static Future<ApiResponse<AuthData>> register({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
    UserRole role = UserRole.user,
  }) async {
    try {
      final registerData = {
        'email': email,
        'password': password,
        'firstName': firstName,
        'lastName': lastName,
        'role': role.toString().split('.').last.toUpperCase(),
      };

      final response = await _apiClient.post(
        ApiConstants.registerEndpoint,
        data: registerData,
      );

      final apiResponse = ApiResponse<AuthData>.fromJson(
        response.data,
        (data) => AuthData.fromJson(data),
      );

      // Save tokens if registration successful
      if (apiResponse.success && apiResponse.data != null) {
        final authData = apiResponse.data!;
        await TokenService.saveTokens(
          authData.accessToken,
          authData.refreshToken,
          authData.expiresIn,
        );
      }

      return apiResponse;
    } catch (e) {
      return ApiResponse<AuthData>(
        success: false,
        message: 'Registration failed: ${e.toString()}',
        errors: [e.toString()],
      );
    }
  }

  /// Logout user
  static Future<ApiResponse<void>> logout() async {
    try {
      // Call logout endpoint to invalidate token on server
      await _apiClient.post(ApiConstants.logoutEndpoint);
    } catch (e) {
      // Continue with local logout even if server call fails
      print('Server logout failed: $e');
    }

    // Always clear local tokens
    await TokenService.clearTokens();
    
    return ApiResponse<void>(
      success: true,
      message: 'Logged out successfully',
    );
  }

  /// Refresh access token using refresh token
  static Future<ApiResponse<AuthData>> refreshToken() async {
    try {
      final refreshToken = await TokenService.getRefreshToken();
      if (refreshToken == null) {
        return ApiResponse<AuthData>(
          success: false,
          message: 'No refresh token available',
          errors: ['Refresh token not found'],
        );
      }

      final response = await _apiClient.post(
        ApiConstants.refreshTokenEndpoint,
        data: {'refreshToken': refreshToken},
      );

      final apiResponse = ApiResponse<AuthData>.fromJson(
        response.data,
        (data) => AuthData.fromJson(data),
      );

      // Save new tokens if refresh successful
      if (apiResponse.success && apiResponse.data != null) {
        final authData = apiResponse.data!;
        await TokenService.saveTokens(
          authData.accessToken,
          authData.refreshToken,
          authData.expiresIn,
        );
      }

      return apiResponse;
    } catch (e) {
      // If refresh fails, clear all tokens
      await TokenService.clearTokens();
      
      return ApiResponse<AuthData>(
        success: false,
        message: 'Token refresh failed: ${e.toString()}',
        errors: [e.toString()],
      );
    }
  }

  /// Check if user is currently authenticated
  static Future<bool> isAuthenticated() async {
    final hasValidToken = await TokenService.isTokenValid();
    if (hasValidToken) return true;

    // Try to refresh token if available
    final needsRefresh = await TokenService.needsRefresh();
    if (needsRefresh) {
      final refreshResult = await refreshToken();
      return refreshResult.success;
    }

    return false;
  }

  /// Get current user profile
  static Future<ApiResponse<User>> getCurrentUser() async {
    try {
      final response = await _apiClient.get('/auth/profile');

      return ApiResponse<User>.fromJson(
        response.data,
        (data) => User.fromJson(data),
      );
    } catch (e) {
      return ApiResponse<User>(
        success: false,
        message: 'Failed to get user profile: ${e.toString()}',
        errors: [e.toString()],
      );
    }
  }

  /// Update user profile
  static Future<ApiResponse<User>> updateProfile({
    String? firstName,
    String? lastName,
    String? avatar,
  }) async {
    try {
      final updateData = <String, dynamic>{};
      if (firstName != null) updateData['firstName'] = firstName;
      if (lastName != null) updateData['lastName'] = lastName;
      if (avatar != null) updateData['avatar'] = avatar;

      final response = await _apiClient.put(
        '/auth/profile',
        data: updateData,
      );

      return ApiResponse<User>.fromJson(
        response.data,
        (data) => User.fromJson(data),
      );
    } catch (e) {
      return ApiResponse<User>(
        success: false,
        message: 'Failed to update profile: ${e.toString()}',
        errors: [e.toString()],
      );
    }
  }

  /// Change password
  static Future<ApiResponse<void>> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    try {
      final response = await _apiClient.put(
        '/auth/change-password',
        data: {
          'currentPassword': currentPassword,
          'newPassword': newPassword,
        },
      );

      return ApiResponse<void>.fromJson(
        response.data,
        (_) => null,
      );
    } catch (e) {
      return ApiResponse<void>(
        success: false,
        message: 'Failed to change password: ${e.toString()}',
        errors: [e.toString()],
      );
    }
  }

  /// Request password reset
  static Future<ApiResponse<void>> forgotPassword(String email) async {
    try {
      final response = await _apiClient.post(
        ApiConstants.forgotPasswordEndpoint,
        data: {'email': email},
      );

      return ApiResponse<void>.fromJson(
        response.data,
        (_) => null,
      );
    } catch (e) {
      return ApiResponse<void>(
        success: false,
        message: 'Failed to request password reset: ${e.toString()}',
        errors: [e.toString()],
      );
    }
  }

  /// Reset password with token
  static Future<ApiResponse<void>> resetPassword({
    required String token,
    required String newPassword,
  }) async {
    try {
      final response = await _apiClient.post(
        ApiConstants.resetPasswordEndpoint,
        data: {
          'token': token,
          'newPassword': newPassword,
        },
      );

      return ApiResponse<void>.fromJson(
        response.data,
        (_) => null,
      );
    } catch (e) {
      return ApiResponse<void>(
        success: false,
        message: 'Failed to reset password: ${e.toString()}',
        errors: [e.toString()],
      );
    }
  }

  /// Verify email address
  static Future<ApiResponse<void>> verifyEmail(String token) async {
    try {
      final response = await _apiClient.post(
        ApiConstants.verifyEmailEndpoint,
        data: {'token': token},
      );

      return ApiResponse<void>.fromJson(
        response.data,
        (_) => null,
      );
    } catch (e) {
      return ApiResponse<void>(
        success: false,
        message: 'Failed to verify email: ${e.toString()}',
        errors: [e.toString()],
      );
    }
  }

  /// Resend email verification
  static Future<ApiResponse<void>> resendEmailVerification() async {
    try {
      final response = await _apiClient.post('/auth/resend-verification');

      return ApiResponse<void>.fromJson(
        response.data,
        (_) => null,
      );
    } catch (e) {
      return ApiResponse<void>(
        success: false,
        message: 'Failed to resend verification email: ${e.toString()}',
        errors: [e.toString()],
      );
    }
  }

  /// Check if user has specific role
  static Future<bool> hasRole(UserRole role) async {
    try {
      final userResponse = await getCurrentUser();
      if (userResponse.success && userResponse.data != null) {
        return userResponse.data!.role == role;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  /// Check if user is admin
  static Future<bool> isAdmin() async {
    return await hasRole(UserRole.admin);
  }

  /// Check if user is inspector
  static Future<bool> isInspector() async {
    return await hasRole(UserRole.inspector);
  }

  /// Get authentication status information
  static Future<Map<String, dynamic>> getAuthStatus() async {
    final tokenInfo = await TokenService.getTokenInfo();
    final isAuth = await isAuthenticated();
    
    return {
      'isAuthenticated': isAuth,
      'tokenInfo': tokenInfo,
    };
  }

  /// Force logout (clear tokens without server call)
  static Future<void> forceLogout() async {
    await TokenService.clearTokens();
  }
}