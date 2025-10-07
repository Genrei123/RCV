import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:developer' as developer;

class ApiService {
  // Backend API configuration
  static const String baseUrl = 'http://10.0.2.2:3000/api/v1';
  
  // For iOS Simulator use: 'http://localhost:3000/api/v1'
  // For Physical Device use: 'http://YOUR_COMPUTER_IP:3000/api/v1'

  // Get authorization headers
  Future<Map<String, String>> _getHeaders() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('auth_token');
    
    Map<String, String> headers = {
      'Content-Type': 'application/json',
    };
    
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    
    return headers;
  }

  // Test connection to backend
  Future<Map<String, dynamic>> testConnection() async {
    try {
      developer.log('Testing connection to backend...');
      
      final response = await http.get(
        Uri.parse('$baseUrl/auth/signin'),
        headers: await _getHeaders(),
      ).timeout(const Duration(seconds: 5));

      developer.log('Connection test response: ${response.statusCode}');
      
      return {
        'success': response.statusCode == 200 || response.statusCode == 405, // 405 means method not allowed but server is reachable
        'statusCode': response.statusCode,
        'message': response.statusCode == 200 ? 'Backend is running!' : 'Backend is reachable but endpoint needs POST method',
      };
    } catch (e) {
      developer.log('Connection test failed: $e');
      return {
        'success': false,
        'message': 'Cannot connect to backend: ${e.toString()}',
      };
    }
  }

  // Send scan data
  Future<Map<String, dynamic>> sendScanData({
    required String data,
    required String type,
  }) async {
    try {
      developer.log('Sending scan data to backend...');
      
      final response = await http.post(
        Uri.parse('$baseUrl/scan'),
        headers: await _getHeaders(),
        body: json.encode({
          'data': data,
          'timestamp': DateTime.now().toIso8601String(),
          'type': type,
        }),
      ).timeout(const Duration(seconds: 10));

      developer.log('Scan API Response Status: ${response.statusCode}');
      developer.log('Scan API Response Body: ${response.body}');

      final responseData = json.decode(response.body);
      
      if (response.statusCode == 200) {
        developer.log('Scan data sent successfully: ${responseData['message']}');
        return {
          'success': true,
          'message': responseData['message'] ?? 'Success',
          'data': responseData,
        };
      } else {
        developer.log('Failed to send scan data: ${response.statusCode}');
        return {
          'success': false,
          'message': responseData['message'] ?? 'Failed to send data',
          'error': responseData['error'],
        };
      }
    } catch (e) {
      developer.log('Error sending scan data: $e');
      
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
        'error': e.toString(),
      };
    }
  }

  // Get products
  Future<Map<String, dynamic>> getProducts() async {
    try {
      developer.log('Fetching products from backend...');
      
      final response = await http.get(
        Uri.parse('$baseUrl/products'),
        headers: await _getHeaders(),
      ).timeout(const Duration(seconds: 10));

      developer.log('Products API Response Status: ${response.statusCode}');
      
      if (response.statusCode == 200) {
        final responseData = json.decode(response.body);
        return {
          'success': true,
          'products': responseData['products'] ?? [],
        };
      } else {
        return {
          'success': false,
          'message': 'Failed to fetch products',
        };
      }
    } catch (e) {
      developer.log('Error fetching products: $e');
      return {
        'success': false,
        'message': 'Network error: ${e.toString()}',
      };
    }
  }

  // Search products
  Future<Map<String, dynamic>> searchProducts(String query) async {
    try {
      developer.log('Searching products with query: $query');
      
      final response = await http.get(
        Uri.parse('$baseUrl/products/search?query=$query'),
        headers: await _getHeaders(),
      ).timeout(const Duration(seconds: 10));

      developer.log('Search API Response Status: ${response.statusCode}');
      
      if (response.statusCode == 200) {
        final responseData = json.decode(response.body);
        return {
          'success': true,
          'products': responseData['products'] ?? [],
        };
      } else {
        return {
          'success': false,
          'message': 'Failed to search products',
        };
      }
    } catch (e) {
      developer.log('Error searching products: $e');
      return {
        'success': false,
        'message': 'Network error: ${e.toString()}',
      };
    }
  }
}