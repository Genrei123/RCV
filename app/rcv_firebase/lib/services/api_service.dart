import 'dart:convert';
import 'dart:io';
import 'dart:async';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:developer' as developer;
import '../models/product.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  // Backend API configuration
  // static const String baseUrl = 'http://localhost:3000/api/v1';
  // For Android Emulator use: 'http://10.0.2.2:3000/api/v1'
  // For iOS Simulator use: 'http://localhost:3000/api/v1'
  // For Physical Device use: 'http://YOUR_COMPUTER_IP:3000/api/v1'
  static const String baseUrl = 'https://13727598fac3.ngrok-free.app/api/v1';

  // Get authorization headers
  Future<Map<String, String>> _getHeaders() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('auth_token');
    
    Map<String, String> headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    
    return headers;
  }

  /// Scan product using OCR text
  /// 
  /// Sends the extracted OCR text to backend for processing
  /// Returns extracted product information WITHOUT querying database
  Future<Map<String, dynamic>> scanProduct(String ocrText) async {
    try {
      developer.log('Sending OCR text to backend for processing...');
      developer.log('OCR Text length: ${ocrText.length} characters');
      
      final response = await http
          .post(
            Uri.parse('$baseUrl/scan/scanProduct'),
            headers: await _getHeaders(),
            body: jsonEncode({
              'blockOfText': ocrText,
            }),
          )
          .timeout(const Duration(seconds: 30));

      developer.log('Scan product response: ${response.statusCode}');

      if (response.statusCode == 200) {
        final jsonData = jsonDecode(response.body);
        developer.log('OCR processing successful: ${jsonData.toString()}');
        return jsonData;
      } else {
        developer.log('OCR processing failed: ${response.body}');
        throw ApiException(
          statusCode: response.statusCode,
          message: 'Failed to process OCR text: ${response.body}',
        );
      }
    } on SocketException catch (e) {
      developer.log('Network error: $e');
      throw ApiException(
        statusCode: 0,
        message: 'No internet connection. Please check your network.',
        details: e.toString(),
      );
    } on TimeoutException catch (e) {
      developer.log('Timeout error: $e');
      throw ApiException(
        statusCode: 0,
        message: 'Request timeout. Please try again.',
        details: e.toString(),
      );
    } on http.ClientException catch (e) {
      developer.log('Client error: $e');
      throw ApiException(
        statusCode: 0,
        message: 'Cannot connect to server. Make sure backend is running on $baseUrl',
        details: e.toString(),
      );
    } catch (e) {
      developer.log('Unexpected error: $e');
      throw ApiException(
        statusCode: 0,
        message: 'An unexpected error occurred',
        details: e.toString(),
      );
    }
  }

  /// Search for product in database
  /// 
  /// User can search by productName, LTONumber, or CFPRNumber
  /// This is called AFTER the user reviews the extracted information
  Future<ScanProductResponse> searchProduct({
    String? productName,
    String? ltoNumber,
    String? cfprNumber,
    String? brandName,
    String? lotNumber,
    String? expirationDate,
  }) async {
    try {
      developer.log('Searching for product in database...');
      
      final body = <String, dynamic>{};
      if (productName != null) body['productName'] = productName;
      if (ltoNumber != null) body['LTONumber'] = ltoNumber;
      if (cfprNumber != null) body['CFPRNumber'] = cfprNumber;
      if (brandName != null) body['brandName'] = brandName;
      if (lotNumber != null) body['lotNumber'] = lotNumber;
      if (expirationDate != null) body['expirationDate'] = expirationDate;
      
      developer.log('Search criteria: $body');
      
      final response = await http
          .post(
            Uri.parse('$baseUrl/scan/searchProduct'),
            headers: await _getHeaders(),
            body: jsonEncode(body),
          )
          .timeout(const Duration(seconds: 30));

      developer.log('Search product response: ${response.statusCode}');

      if (response.statusCode == 200) {
        final jsonData = jsonDecode(response.body);
        developer.log('Product search successful: ${jsonData.toString()}');
        return ScanProductResponse.fromJson(jsonData);
      } else {
        developer.log('Product search failed: ${response.body}');
        throw ApiException(
          statusCode: response.statusCode,
          message: 'Failed to search product: ${response.body}',
        );
      }
    } on SocketException catch (e) {
      developer.log('Network error: $e');
      throw ApiException(
        statusCode: 0,
        message: 'No internet connection. Please check your network.',
        details: e.toString(),
      );
    } on TimeoutException catch (e) {
      developer.log('Timeout error: $e');
      throw ApiException(
        statusCode: 0,
        message: 'Request timeout. Please try again.',
        details: e.toString(),
      );
    } on http.ClientException catch (e) {
      developer.log('Client error: $e');
      throw ApiException(
        statusCode: 0,
        message: 'Cannot connect to server. Make sure backend is running on $baseUrl',
        details: e.toString(),
      );
    } catch (e) {
      developer.log('Unexpected error: $e');
      throw ApiException(
        statusCode: 0,
        message: 'An unexpected error occurred',
        details: e.toString(),
      );
    }
  }

  /// Get all scans
  Future<List<dynamic>> getScans() async {
    try {
      developer.log('Fetching all scans...');
      
      final response = await http
          .get(
            Uri.parse('$baseUrl/scan/getScans'),
            headers: await _getHeaders(),
          )
          .timeout(const Duration(seconds: 30));

      if (response.statusCode == 200) {
        final jsonData = jsonDecode(response.body);
        return jsonData['scans'] ?? [];
      } else {
        throw ApiException(
          statusCode: response.statusCode,
          message: 'Failed to get scans',
        );
      }
    } catch (e) {
      developer.log('Get scans error: $e');
      throw ApiException(
        statusCode: 0,
        message: 'Failed to get scans',
        details: e.toString(),
      );
    }
  }

  /// Get scan by ID
  Future<Map<String, dynamic>> getScanById(String id) async {
    try {
      developer.log('Fetching scan with ID: $id');
      
      final response = await http
          .get(
            Uri.parse('$baseUrl/scan/getScans/$id'),
            headers: await _getHeaders(),
          )
          .timeout(const Duration(seconds: 30));

      if (response.statusCode == 200) {
        final jsonData = jsonDecode(response.body);
        return jsonData['scan'] ?? {};
      } else {
        throw ApiException(
          statusCode: response.statusCode,
          message: 'Failed to get scan',
        );
      }
    } catch (e) {
      developer.log('Get scan by ID error: $e');
      throw ApiException(
        statusCode: 0,
        message: 'Failed to get scan',
        details: e.toString(),
      );
    }
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
        'success': response.statusCode == 200 || response.statusCode == 405,
        'statusCode': response.statusCode,
        'message': response.statusCode == 200 
            ? 'Backend is running!' 
            : 'Backend is reachable but endpoint needs POST method',
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

/// Custom API Exception
class ApiException implements Exception {
  final int statusCode;
  final String message;
  final String? details;

  ApiException({
    required this.statusCode,
    required this.message,
    this.details,
  });

  @override
  String toString() {
    return 'ApiException: $message ${details != null ? '($details)' : ''}';
  }
}
