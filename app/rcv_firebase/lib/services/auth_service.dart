import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:developer' as developer;
import 'token_service.dart';

class AuthService {
  // Backend API configuration
  static const String baseUrl = 'https://rcv-production-cbd6.up.railway.app/api/v1';
  
  // For local development use: 'http://10.0.2.2:3000/api/v1' (Android emulator)
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

  // Login user
  Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      developer.log('Attempting mobile login for: $email');
      
      final response = await http.post(
        Uri.parse('$baseUrl/auth/mobile-login'), // Use mobile-login endpoint
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
        // Store the JWT token using TokenService
        if (responseData['token'] != null) {
          developer.log('🔑 Saving token to TokenService...');
          // Save with expiry from response or default 7 days
          await TokenService.saveTokens(
            responseData['token'],
            responseData['refreshToken'] ?? responseData['token'], // Use same token if no refresh token
            responseData['expiresIn'] ?? 604800, // Default 7 days
          );
          developer.log('✅ Token saved successfully');
        }
        
        return {
          'success': true,
          'message': responseData['message'] ?? 'Login successful',
          'user': responseData['user'],
          'token': responseData['token'],
        };
      } else if (response.statusCode == 403) {
        // Account pending approval
        return {
          'success': false,
          'approved': responseData['approved'] ?? false,
          'message': responseData['message'] ?? 'Account pending approval',
        };
      } else if (response.statusCode == 401) {
        // Invalid credentials
        return {
          'success': false,
          'message': 'Invalid email or password',
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
        errorMessage = 'Cannot connect to server. Please check your internet connection.';
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
      developer.log('🚪 Logging out user...');
      // Clear stored tokens using TokenService
      await TokenService.clearTokens();
      developer.log('✅ User logged out successfully');
    } catch (e) {
      developer.log('❌ Error during logout: $e');
    }
  }

  // Check if user is logged in
  Future<bool> isLoggedIn() async {
    return await TokenService.hasAccessToken();
  }

  // Get current user token
  Future<String?> getCurrentToken() async {
    return await TokenService.getAccessToken();
  }
}