import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:developer' as developer;
import 'package:shared_preferences/shared_preferences.dart';
import '../config/api_constants.dart';

/// Authentication Service with Cookie Support
/// 
/// This service handles authentication with the backend using httpOnly cookies.
/// Since Flutter's http package doesn't automatically handle cookies,
/// we manually extract and store the Set-Cookie header.
class AuthService {
  // Backend API configuration
  static String get baseUrl => ApiConstants.baseUrl;

  // Cookie storage keys
  static const String _cookieKey = 'session_cookies';

  /// Save cookies from response headers
  static Future<void> _saveCookies(http.Response response) async {
    final cookies = response.headers['set-cookie'];
    if (cookies != null) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_cookieKey, cookies);
      developer.log('✅ Cookies saved: ${cookies.substring(0, 50)}...');
    }
  }

  /// Get stored cookies for requests
  static Future<String?> _getCookies() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_cookieKey);
  }

  /// Clear stored cookies (logout)
  static Future<void> clearCookies() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_cookieKey);
    developer.log('🗑️ Cookies cleared');
  }

  /// Get headers with cookies included
  static Future<Map<String, String>> _getHeaders() async {
    final headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    final cookies = await _getCookies();
    if (cookies != null) {
      headers['Cookie'] = cookies;
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

  // Login user with cookie support
  Future<Map<String, dynamic>> login(String email, String password, {bool rememberMe = false}) async {
    try {
      developer.log('Attempting mobile login for: $email');

      final uri = Uri.parse('$baseUrl/auth/mobile-login');
      final response = await http.post(
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
      ).timeout(const Duration(seconds: 12));

      developer.log('Login status: ${response.statusCode}');
      
      // Save cookies from response (backend now sends httpOnly cookies)
      await _saveCookies(response);
      
      Map<String, dynamic>? responseData = _tryDecodeJson(response.body);

      if (response.statusCode == 200 &&
          (responseData?['success'] == true ||
              responseData?['token'] != null)) {
        
        developer.log('✅ Login successful');
        
        // Also save the JWT token for backward compatibility (optional)
        if (responseData?['token'] != null) {
          final prefs = await SharedPreferences.getInstance();
          await prefs.setString('jwt_token', responseData!['token']);
        }
        
        return {
          'success': true,
          'message': responseData?['message'] ?? 'Login successful',
          'user': responseData?['user'],
          'token': responseData?['token'],
        };
      } else if (response.statusCode == 403) {
        // Account pending approval
        return {
          'success': false,
          'approved': responseData?['approved'] ?? false,
          'message': responseData?['message'] ?? 'Account pending approval',
        };
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
            Uri.parse('$baseUrl/auth/reset-password'),
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
            Uri.parse('$baseUrl/auth/verify-otp'),
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
            Uri.parse('$baseUrl/auth/confirm-reset-password'),
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

  // Logout functionality with cookie clearing
  Future<void> logout() async {
    try {
      developer.log('🚪 Logging out user...');
      
      // Call backend logout endpoint to clear server-side session
      final uri = Uri.parse('$baseUrl/auth/logout');
      await http.post(
        uri,
        headers: await _getHeaders(),
      ).timeout(const Duration(seconds: 5));
      
      // Clear local cookies
      await clearCookies();
      developer.log('✅ User logged out successfully');
    } catch (e) {
      developer.log('❌ Error during logout: $e');
      // Still clear local cookies even if server request fails
      await clearCookies();
    }
  }

  // Check if user is authenticated (has valid session cookie)
  Future<bool> isLoggedIn() async {
    try {
      final cookies = await _getCookies();
      if (cookies == null || cookies.isEmpty) {
        return false;
      }
      
      // Verify with backend by calling /me-mobile endpoint (handles encrypted cookies)
      final uri = Uri.parse('$baseUrl/auth/me-mobile');
      final response = await http.get(
        uri,
        headers: await _getHeaders(),
      ).timeout(const Duration(seconds: 5));
      
      return response.statusCode == 200;
    } catch (e) {
      developer.log('Auth check error: $e');
      return false;
    }
  }

  // Get current user info from backend
  Future<Map<String, dynamic>?> getCurrentUser() async {
    try {
      final uri = Uri.parse('$baseUrl/auth/me');
      final response = await http.get(
        uri,
        headers: await _getHeaders(),
      ).timeout(const Duration(seconds: 10));
      
      if (response.statusCode == 200) {
        return json.decode(response.body);
      }
      return null;
    } catch (e) {
      developer.log('Get current user error: $e');
      return null;
    }
  }

  // Get current user token (compatibility method - returns cookie header)
  Future<String?> getCurrentToken() async {
    return await _getCookies();
  }
}
