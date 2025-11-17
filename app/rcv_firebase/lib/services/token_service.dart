// lib/services/token_service.dart
// Service for managing JWT tokens (access token, refresh token)
// Handles token storage, retrieval, and validation

import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import '../config/api_constants.dart';

class TokenService {
  static const String _accessTokenKey = StorageKeys.accessToken;
  static const String _refreshTokenKey = StorageKeys.refreshToken;
  static const String _tokenExpiryKey = StorageKeys.tokenExpiry;

  /// Save authentication tokens to local storage
  static Future<void> saveTokens(
    String accessToken,
    String refreshToken,
    int expiresIn,
  ) async {
    final prefs = await SharedPreferences.getInstance();
    final expiryTime = DateTime.now().add(Duration(seconds: expiresIn));
    
    await Future.wait([
      prefs.setString(_accessTokenKey, accessToken),
      prefs.setString(_refreshTokenKey, refreshToken),
      prefs.setInt(_tokenExpiryKey, expiryTime.millisecondsSinceEpoch),
    ]);
  }

  /// Get access token from local storage
  static Future<String?> getAccessToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_accessTokenKey);
  }

  /// Get refresh token from local storage
  static Future<String?> getRefreshToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_refreshTokenKey);
  }

  /// Get token expiry time
  static Future<DateTime?> getTokenExpiry() async {
    final prefs = await SharedPreferences.getInstance();
    final expiryTimestamp = prefs.getInt(_tokenExpiryKey);
    if (expiryTimestamp != null) {
      return DateTime.fromMillisecondsSinceEpoch(expiryTimestamp);
    }
    return null;
  }

  /// Check if access token exists
  static Future<bool> hasAccessToken() async {
    final token = await getAccessToken();
    return token != null && token.isNotEmpty;
  }

  /// Check if access token is expired
  static Future<bool> isTokenExpired() async {
    final expiry = await getTokenExpiry();
    if (expiry == null) return true;
    
    // Consider token expired if it expires within the threshold
    final now = DateTime.now();
    final threshold = now.add(ApiConstants.tokenRefreshThreshold);
    
    return expiry.isBefore(threshold);
  }

  /// Check if access token is valid (exists and not expired)
  static Future<bool> isTokenValid() async {
    final hasToken = await hasAccessToken();
    if (!hasToken) return false;
    
    final isExpired = await isTokenExpired();
    return !isExpired;
  }

  /// Check if refresh is needed (token exists but is expired)
  static Future<bool> needsRefresh() async {
    final hasToken = await hasAccessToken();
    final hasRefreshToken = await getRefreshToken() != null;
    final isExpired = await isTokenExpired();
    
    return hasToken && hasRefreshToken && isExpired;
  }

  /// Clear all tokens from local storage
  static Future<void> clearTokens() async {
    final prefs = await SharedPreferences.getInstance();
    await Future.wait([
      prefs.remove(_accessTokenKey),
      prefs.remove(_refreshTokenKey),
      prefs.remove(_tokenExpiryKey),
    ]);
  }

  /// Clear only access token (keep refresh token for renewal)
  static Future<void> clearAccessToken() async {
    final prefs = await SharedPreferences.getInstance();
    await Future.wait([
      prefs.remove(_accessTokenKey),
      prefs.remove(_tokenExpiryKey),
    ]);
  }

  /// Get token information for debugging
  static Future<Map<String, dynamic>> getTokenInfo() async {
    final accessToken = await getAccessToken();
    final refreshToken = await getRefreshToken();
    final expiry = await getTokenExpiry();
    final isValid = await isTokenValid();
    final needsRefresh = await TokenService.needsRefresh();

    return {
      'hasAccessToken': accessToken != null,
      'hasRefreshToken': refreshToken != null,
      'expiry': expiry?.toIso8601String(),
      'isValid': isValid,
      'needsRefresh': needsRefresh,
      'timeUntilExpiry': expiry?.difference(DateTime.now()).inMinutes,
    };
  }

  /// Decode JWT payload (simple base64 decode, no signature verification)
  /// This is for reading token information only, not for security validation
  static Map<String, dynamic>? decodeTokenPayload(String token) {
    try {
      final parts = token.split('.');
      if (parts.length != 3) return null;

      final payload = parts[1];
      // Add padding if needed
      var normalizedPayload = payload;
      switch (payload.length % 4) {
        case 1:
          normalizedPayload += '===';
          break;
        case 2:
          normalizedPayload += '==';
          break;
        case 3:
          normalizedPayload += '=';
          break;
      }

      final decoded = utf8.decode(base64Url.decode(normalizedPayload));
      return jsonDecode(decoded) as Map<String, dynamic>;
    } catch (e) {
      print('Error decoding JWT token: $e');
      return null;
    }
  }

  /// Check if user has specific role (requires token decoding)
  static Future<bool> hasRole(String role) async {
    final token = await getAccessToken();
    if (token == null) return false;

    final payload = decodeTokenPayload(token);
    if (payload == null) return false;

    final userRole = payload['role'] as String?;
    return userRole?.toLowerCase() == role.toLowerCase();
  }

  /// Get user ID from token
  static Future<String?> getUserId() async {
    final token = await getAccessToken();
    if (token == null) return null;

    final payload = decodeTokenPayload(token);
    if (payload == null) return null;

    // Your backend JWT uses 'sub' field for user ID
    return payload['sub'] as String?;
  }

  /// Check if token will expire soon
  static Future<bool> willExpireSoon({
    Duration threshold = const Duration(minutes: 5)
  }) async {
    final expiry = await getTokenExpiry();
    if (expiry == null) return true;

    final warningTime = DateTime.now().add(threshold);
    return expiry.isBefore(warningTime);
  }
}