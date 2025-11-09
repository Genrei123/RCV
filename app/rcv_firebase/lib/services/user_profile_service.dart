import 'dart:convert';
import 'package:http/http.dart' as http;
import 'dart:developer' as developer;
import 'package:shared_preferences/shared_preferences.dart';
import '../config/api_constants.dart';

class UserProfileService {
  static String get baseUrl => ApiConstants.baseUrl;

  /// Get stored JWT token
  static Future<String?> _getToken() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getString('access_token');
    } catch (e) {
      developer.log('Error getting token: $e');
      return null;
    }
  }

  /// Get headers with Authorization token
  static Future<Map<String, String>> _getHeaders() async {
    final headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    final token = await _getToken();
    if (token != null) {
      headers['Authorization'] = 'Bearer $token';
    }

    return headers;
  }

  // Get current user profile
  static Future<Map<String, dynamic>?> getUserProfile() async {
    try {
      final token = await _getToken();
      if (token == null) {
        developer.log('No token found');
        return null;
      }

      developer.log('Fetching user profile...');

      final response = await http
          .get(
            Uri.parse('$baseUrl/mobile/me'),
            headers: await _getHeaders(),
          )
          .timeout(const Duration(seconds: 10));

      developer.log('Profile Response Status: ${response.statusCode}');
      developer.log('Profile Response Body: ${response.body}');

      if (response.statusCode == 200) {
        final contentType = response.headers['content-type'] ?? '';
        if (contentType.contains('application/json')) {
          final data = json.decode(response.body);
          return data is Map<String, dynamic> ? data : null;
        }
        developer.log('Unexpected content-type for /mobile/me: $contentType');
        return null;
      }

      return null;
    } catch (e) {
      developer.log('Error fetching user profile: $e');
      return null;
    }
  }

  // Update user profile
  static Future<Map<String, dynamic>> updateProfile(
    Map<String, dynamic> profileData,
  ) async {
    try {
      final token = await _getToken();
      if (token == null) {
        return {'success': false, 'message': 'Not authenticated'};
      }

      developer.log('Updating user profile...');

      // Correct endpoint is /api/v1/user/profile (see API routes)
      final response = await http
          .patch(
            Uri.parse('$baseUrl/user/profile'),
            headers: await _getHeaders(),
            body: json.encode(profileData),
          )
          .timeout(const Duration(seconds: 10));

      developer.log('Update Profile Response Status: ${response.statusCode}');
      developer.log('Update Profile Response Headers: ${response.headers}');
      developer.log(
        'Update Profile Response Body (first 200): ${response.body.substring(0, response.body.length > 200 ? 200 : response.body.length)}',
      );

      dynamic responseData;
      final contentType = response.headers['content-type'] ?? '';
      final isJson = contentType.contains('application/json');
      try {
        if (isJson && response.body.isNotEmpty) {
          responseData = json.decode(response.body);
        }
      } catch (e) {
        developer.log('JSON decode error: $e');
      }

      if (response.statusCode == 200) {
        return {
          'success': true,
          'message': (responseData != null
              ? (responseData['message'] ?? 'Profile updated successfully')
              : 'Profile updated successfully'),
          'user': (responseData != null
              ? (responseData['data'] ?? responseData['user'])
              : null),
        };
      } else {
        return {
          'success': false,
          'message': (responseData != null
              ? (responseData['message'] ?? 'Failed to update profile')
              : 'Failed to update profile (HTTP ${response.statusCode})'),
        };
      }
    } catch (e) {
      developer.log('Error updating profile: $e');

      String errorMessage;
      if (e.toString().contains('SocketException')) {
        errorMessage =
            'Cannot connect to server. Please check your internet connection.';
      } else if (e.toString().contains('TimeoutException')) {
        errorMessage = 'Request timeout. Please try again.';
      } else {
        errorMessage = 'Network error: ${e.toString()}';
      }

      return {'success': false, 'message': errorMessage};
    }
  }

  // Change password
  static Future<Map<String, dynamic>> changePassword(
    String currentPassword,
    String newPassword,
  ) async {
    try {
      final token = await _getToken();
      if (token == null) {
        return {'success': false, 'message': 'Not authenticated'};
      }

      final response = await http
          .post(
            Uri.parse('$baseUrl/auth/change-password'),
            headers: await _getHeaders(),
            body: json.encode({
              'currentPassword': currentPassword,
              'newPassword': newPassword,
            }),
          )
          .timeout(const Duration(seconds: 10));

      final responseData = json.decode(response.body);

      if (response.statusCode == 200) {
        return {
          'success': true,
          'message': responseData['message'] ?? 'Password changed successfully',
        };
      } else {
        return {
          'success': false,
          'message': responseData['message'] ?? 'Failed to change password',
        };
      }
    } catch (e) {
      developer.log('Error changing password: $e');
      return {'success': false, 'message': 'Failed to change password'};
    }
  }

  // Upload profile avatar (base64 string, optionally with data URI prefix)
  static Future<Map<String, dynamic>> uploadProfileAvatar(
    String base64Data,
  ) async {
    try {
      final token = await _getToken();
      if (token == null) {
        return {'success': false, 'message': 'Not authenticated'};
      }

      final response = await http
          .post(
            Uri.parse('$baseUrl/user/profile/avatar'),
            headers: await _getHeaders(),
            body: json.encode({'image': base64Data}),
          )
          .timeout(const Duration(seconds: 15));

      final contentType = response.headers['content-type'] ?? '';
      final isJson = contentType.contains('application/json');
      final Map<String, dynamic>? body = isJson && response.body.isNotEmpty
          ? json.decode(response.body) as Map<String, dynamic>
          : null;

      if (response.statusCode == 200) {
        return {
          'success': true,
          'avatarUrl': body?['avatarUrl'] ?? body?['data']?['avatarUrl'],
          'user': body?['data'],
        };
      }

      return {
        'success': false,
        'message':
            body?['message'] ??
            'Failed to upload avatar (HTTP ${response.statusCode})',
      };
    } catch (e) {
      return {'success': false, 'message': 'Upload error: $e'};
    }
  }
}
