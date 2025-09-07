import 'dart:convert';
import 'package:http/http.dart' as http;
import 'dart:developer' as developer;

class ApiService {
  // For Android emulator, use 10.0.2.2 instead of localhost
  // For iOS simulator, use localhost or 127.0.0.1
  // For physical devices, use your computer's IP address (e.g., 192.168.1.100)
  static const String baseUrl = 'http://10.0.2.2:3000/api/v1';
  
  static Future<Map<String, dynamic>> sendScanData({
    required String data,
    required String type,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/scan'),
        headers: {
          'Content-Type': 'application/json',
        },
        body: json.encode({
          'data': data,
          'timestamp': DateTime.now().toIso8601String(),
          'type': type,
        }),
      ).timeout(const Duration(seconds: 10));

      developer.log('API Response Status: ${response.statusCode}');
      developer.log('API Response Body: ${response.body}');

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
}