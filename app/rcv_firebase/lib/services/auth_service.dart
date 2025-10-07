import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:developer' as developer;

class AuthService {
  // Backend API configuration
  static const String baseUrl = 'http://10.0.2.2:3000/api/v1';
  
  // For iOS Simulator use: 'http://localhost:3000/api/v1'
  // For Physical Device use: 'http://YOUR_COMPUTER_IP:3000/api/v1'

  // Email validation
  bool isValidEmail(String email) {
    return RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(email);
  }

  // Show message helper
  void showMessage(BuildContext context, String message, {bool isError = false}) {
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
          content: Text('OTP for $email: $otp\n\n(This is for testing purposes only)'),
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

  // Store JWT token
  Future<void> _storeToken(String token) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('auth_token', token);
      developer.log('Token stored successfully');
    } catch (e) {
      developer.log('Error storing token: $e');
    }
  }

  // Get stored JWT token
  Future<String?> _getToken() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getString('auth_token');
    } catch (e) {
      developer.log('Error getting token: $e');
      return null;
    }
  }

  // Clear stored token (for logout)
  Future<void> _clearToken() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('auth_token');
      developer.log('Token cleared successfully');
    } catch (e) {
      developer.log('Error clearing token: $e');
    }
  }

  // Login user
  Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      developer.log('Attempting login for: $email');
      
      final response = await http.post(
        Uri.parse('$baseUrl/auth/signin'),
        headers: {
          'Content-Type': 'application/json',
        },
        body: json.encode({
          'email': email,
          'password': password,
        }),
      ).timeout(const Duration(seconds: 10));

      developer.log('Login Response Status: ${response.statusCode}');
      developer.log('Login Response Body: ${response.body}');

      final responseData = json.decode(response.body);
      
      if (response.statusCode == 200 && responseData['success'] == true) {
        // Store the JWT token
        if (responseData['token'] != null) {
          await _storeToken(responseData['token']);
        }
        
        return {
          'success': true,
          'message': responseData['message'] ?? 'Login successful',
          'user': responseData['user'],
          'token': responseData['token'],
        };
      } else {
        return {
          'success': false,
          'message': responseData['message'] ?? 'Login failed',
        };
      }
    } catch (e) {
      developer.log('Login error: $e');
      
      String errorMessage;
      if (e.toString().contains('SocketException')) {
        errorMessage = 'Cannot connect to server. Make sure the API is running.';
      } else if (e.toString().contains('TimeoutException')) {
        errorMessage = 'Request timeout. Please try again.';
      } else {
        errorMessage = 'Network error: ${e.toString()}';
      }
      
      return {
        'success': false,
        'message': errorMessage,
      };
    }
  }

  // Send password reset email
  Future<Map<String, dynamic>> sendPasswordResetEmail(String email) async {
    try {
      developer.log('Sending password reset email for: $email');
      
      final response = await http.post(
        Uri.parse('$baseUrl/auth/reset-password'),
        headers: {
          'Content-Type': 'application/json',
        },
        body: json.encode({
          'email': email,
        }),
      ).timeout(const Duration(seconds: 10));

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
        errorMessage = 'Cannot connect to server. Make sure the API is running and accessible.';
      } else if (e.toString().contains('TimeoutException')) {
        errorMessage = 'Request timeout. Please try again.';
      } else {
        errorMessage = 'Network error: ${e.toString()}';
      }
      
      return {
        'success': false,
        'message': errorMessage,
      };
    }
  }

  // Verify OTP
  Future<bool> verifyOTP(String email, String otp) async {
    try {
      developer.log('Verifying OTP for $email with code: $otp');
      
      final response = await http.post(
        Uri.parse('$baseUrl/auth/verify-otp'),
        headers: {
          'Content-Type': 'application/json',
        },
        body: json.encode({
          'email': email,
          'otp': otp,
        }),
      ).timeout(const Duration(seconds: 10));

      developer.log('OTP Verification Response Status: ${response.statusCode}');
      developer.log('OTP Verification Response Body: ${response.body}');

      return response.statusCode == 200;
    } catch (e) {
      developer.log('Error verifying OTP: $e');
      return false;
    }
  }

  // Confirm password reset
  Future<bool> confirmPasswordReset(String email, String otp, String newPassword) async {
    try {
      developer.log('Confirming password reset for $email');
      
      final response = await http.post(
        Uri.parse('$baseUrl/auth/confirm-reset-password'),
        headers: {
          'Content-Type': 'application/json',
        },
        body: json.encode({
          'email': email,
          'otp': otp,
          'newPassword': newPassword,
        }),
      ).timeout(const Duration(seconds: 10));

      developer.log('Confirm Password Reset Response Status: ${response.statusCode}');
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
      developer.log('User logged out successfully');
      // Clear stored token
      await _clearToken();
    } catch (e) {
      developer.log('Error during logout: $e');
    }
  }

  // Check if user is logged in
  Future<bool> isLoggedIn() async {
    final token = await _getToken();
    return token != null && token.isNotEmpty;
  }

  // Get current user token
  Future<String?> getCurrentToken() async {
    return await _getToken();
  }
}