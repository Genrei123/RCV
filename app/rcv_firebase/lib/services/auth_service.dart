import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:developer' as developer;
import 'package:shared_preferences/shared_preferences.dart';
import '../config/api_constants.dart';

/// Authentication Service using JWT Tokens
///
/// This service handles authentication with the backend using JWT tokens
/// stored in SharedPreferences and sent via Authorization headers.
class AuthService {
  // Backend API configuration
  static String get baseUrl => ApiConstants.baseUrl;

  // Token storage key
  static const String _tokenKey = 'access_token';

  /// Save JWT token to SharedPreferences
  static Future<void> _saveToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
    developer.log('✅ Token saved to SharedPreferences');
  }

  /// Get stored JWT token
  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey);
  }

  /// Clear stored token (logout)
  static Future<void> clearToken() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    developer.log('🗑️ Token cleared');
  }

  /// Get headers with Authorization token
  static Future<Map<String, String>> _getHeaders() async {
    final headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    final token = await getToken();
    if (token != null) {
      headers['Authorization'] = 'Bearer $token';
      developer.log('📤 Sending Authorization header with token');
    } else {
      developer.log('⚠️ No token found to send');
    }

    return headers;
  }

  // Email validation
  bool isValidEmail(String email) {
    return RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(email);
  }

  // Show message helper
  void showMessage(
    BuildContext context,
    String message, {
    bool isError = false,
  }) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? Colors.red : Colors.green,
        duration: Duration(seconds: 3),
      ),
    );
  }

  // Show OTP dialog for testing
  void showOTPDialog(BuildContext context, String email, String otp) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: Text('OTP Generated'),
          content: Text(
            'OTP for $email: $otp\n\n(This is for testing purposes only)',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: Text('OK'),
            ),
          ],
        );
      },
    );
  }

  // Login user with JWT token
  Future<Map<String, dynamic>> login(
    String email,
    String password, {
    bool rememberMe = false,
  }) async {
    try {
      developer.log('Attempting mobile login for: $email');

      final uri = Uri.parse('$baseUrl/mobile/login');
      final response = await http
          .post(
            uri,
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: json.encode({
              'email': email,
              'password': password,
              'rememberMe': rememberMe,
            }),
          )
          .timeout(const Duration(seconds: 12));

      developer.log('Login status: ${response.statusCode}');

      Map<String, dynamic>? responseData = _tryDecodeJson(response.body);

      if (response.statusCode == 200 &&
          (responseData?['success'] == true ||
              responseData?['token'] != null)) {
        developer.log('✅ Login successful');

        // Save the JWT token from response
        if (responseData?['token'] != null) {
          await _saveToken(responseData!['token']);
          developer.log('💾 JWT token saved');
        }

        return {
          'success': true,
          'message': responseData?['message'] ?? 'Login successful',
          'user': responseData?['user'],
          'token': responseData?['token'],
        };
      } else if (response.statusCode == 403) {
        // Account pending approval or app access disabled
        final approved = responseData?['approved'];
        final appAccess = responseData?['appAccess'];

        if (approved == false) {
          return {
            'success': false,
            'approved': false,
            'message': responseData?['message'] ?? 'Account pending approval',
          };
        } else if (appAccess == false) {
          return {
            'success': false,
            'appAccess': false,
            'message': responseData?['message'] ?? 'Mobile access is disabled',
          };
        } else {
          return {
            'success': false,
            'message': responseData?['message'] ?? 'Access denied',
          };
        }
      } else if (response.statusCode == 401) {
        // Invalid credentials
        return {'success': false, 'message': 'Invalid email or password'};
      } else {
        return {
          'success': false,
          'message': responseData?['message'] ?? 'Login failed',
        };
      }
    } catch (e) {
      developer.log('Login error: $e');

      String errorMessage;
      final es = e.toString();
      if (es.contains('FormatException')) {
        errorMessage =
            'Server returned a non-JSON response. Please check your internet connection or try again later.';
      } else if (es.contains('SocketException')) {
        errorMessage =
            'Cannot connect to server. Please check your internet connection.';
      } else if (es.contains('TimeoutException')) {
        errorMessage = 'Request timeout. Please try again.';
      } else {
        errorMessage = 'Network error. Please try again.';
      }

      return {'success': false, 'message': errorMessage};
    }
  }

  // Safely decode JSON; return null if not JSON
  Map<String, dynamic>? _tryDecodeJson(String body) {
    try {
      final decoded = json.decode(body);
      return decoded is Map<String, dynamic> ? decoded : null;
    } catch (_) {
      return null;
    }
  }

  // Send password reset email
  Future<Map<String, dynamic>> sendPasswordResetEmail(String email) async {
    try {
      developer.log('Sending password reset email for: $email');

      final response = await http
          .post(
            Uri.parse('$baseUrl/mobile/forgot-password'),
            headers: {'Content-Type': 'application/json'},
            body: json.encode({'email': email}),
          )
          .timeout(const Duration(seconds: 10));

      developer.log('Password Reset Response Status: ${response.statusCode}');
      developer.log('Password Reset Response Body: ${response.body}');

      final responseData = json.decode(response.body);

      if (response.statusCode == 200) {
        return {
          'success': true,
          'message': responseData['message'] ?? 'OTP sent successfully',
          'otp': responseData['otp'] ?? '123456', // For testing
        };
      } else {
        return {
          'success': false,
          'message': responseData['message'] ?? 'Failed to send OTP',
        };
      }
    } catch (e) {
      developer.log('Error sending password reset email: $e');

      // Handle different types of errors
      String errorMessage;
      if (e.toString().contains('SocketException')) {
        errorMessage =
            'Cannot connect to server. Make sure the API is running and accessible.';
      } else if (e.toString().contains('TimeoutException')) {
        errorMessage = 'Request timeout. Please try again.';
      } else {
        errorMessage = 'Network error: ${e.toString()}';
      }

      return {'success': false, 'message': errorMessage};
    }
  }

  // Verify OTP
  Future<bool> verifyOTP(String email, String otp) async {
    try {
      developer.log('Verifying OTP for $email with code: $otp');

      final response = await http
          .post(
            Uri.parse('$baseUrl/mobile/verify-reset-code'),
            headers: {'Content-Type': 'application/json'},
            body: json.encode({'email': email, 'otp': otp}),
          )
          .timeout(const Duration(seconds: 10));

      developer.log('OTP Verification Response Status: ${response.statusCode}');
      developer.log('OTP Verification Response Body: ${response.body}');

      return response.statusCode == 200;
    } catch (e) {
      developer.log('Error verifying OTP: $e');
      return false;
    }
  }

  // Confirm password reset
  Future<bool> confirmPasswordReset(
    String email,
    String otp,
    String newPassword,
  ) async {
    try {
      developer.log('Confirming password reset for $email');

      final response = await http
          .post(
            Uri.parse('$baseUrl/mobile/reset-password'),
            headers: {'Content-Type': 'application/json'},
            body: json.encode({
              'email': email,
              'otp': otp,
              'newPassword': newPassword,
            }),
          )
          .timeout(const Duration(seconds: 10));

      developer.log(
        'Confirm Password Reset Response Status: ${response.statusCode}',
      );
      developer.log('Confirm Password Reset Response Body: ${response.body}');

      return response.statusCode == 200;
    } catch (e) {
      developer.log('Error confirming password reset: $e');
      return false;
    }
  }

  // Logout functionality
  Future<void> logout() async {
    try {
      developer.log('🚪 Logging out user...');

      // Clear all cached data
      final prefs = await SharedPreferences.getInstance();
      await prefs.clear(); // Clear all SharedPreferences data

      developer.log('🗑️ All cache cleared');
      developer.log('✅ User logged out successfully');
    } catch (e) {
      developer.log('❌ Error during logout: $e');
      // Still try to clear token even if there's an error
      try {
        await clearToken();
      } catch (_) {}
    }
  }

  // Check if user is authenticated (has valid JWT token)
  Future<bool> isLoggedIn() async {
    try {
      final token = await getToken();
      if (token == null || token.isEmpty) {
        developer.log('❌ No token stored - user not logged in');
        return false;
      }

      developer.log('🔍 Checking authentication with /mobile/me...');

      // Verify with backend by calling /mobile/me endpoint
      final uri = Uri.parse('$baseUrl/mobile/me');
      final headers = await _getHeaders();

      developer.log('📤 Request headers: $headers');

      final response = await http
          .get(uri, headers: headers)
          .timeout(const Duration(seconds: 5));

      developer.log('📥 Auth check response: ${response.statusCode}');
      if (response.statusCode != 200) {
        developer.log('❌ Auth check body: ${response.body}');
      }

      return response.statusCode == 200;
    } catch (e) {
      developer.log('❌ Auth check error: $e');
      return false;
    }
  }

  // Get current user info from backend
  Future<Map<String, dynamic>?> getCurrentUser() async {
    try {
      final uri = Uri.parse('$baseUrl/mobile/me');
      final response = await http
          .get(uri, headers: await _getHeaders())
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        return json.decode(response.body);
      }
      return null;
    } catch (e) {
      developer.log('Get current user error: $e');
      return null;
    }
  }

  // Get current user token
  Future<String?> getCurrentToken() async {
    return await getToken();
  }
}
