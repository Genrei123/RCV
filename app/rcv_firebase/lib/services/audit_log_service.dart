import 'dart:convert';
import 'dart:io';
import 'dart:async';
import 'package:http/http.dart' as http;
import 'dart:developer' as developer;
import '../config/api_constants.dart';
import 'token_service.dart';

class AuditLogService {
  static String get baseUrl => ApiConstants.baseUrl;

  // Get JWT token via TokenService
  static Future<String?> _getToken() async {
    try {
      return await TokenService.getAccessToken();
    } catch (e) {
      developer.log('Error getting token: $e');
      return null;
    }
  }

  /// Create an audit log entry
  /// 
  /// [action] - Description of the action performed
  /// [actionType] - Type of action (LOGIN, LOGOUT, SCAN_PRODUCT, etc.)
  /// [platform] - Platform where action occurred (MOBILE or WEB)
  /// [location] - Optional location data {latitude, longitude, address}
  /// [metadata] - Optional additional data
  static Future<bool> createLog({
    required String action,
    required String actionType,
    String? targetUserId,
    String? targetProductId,
    String platform = 'MOBILE',
    Map<String, dynamic>? location,
    Map<String, dynamic>? metadata,
  }) async {
    try {
      final token = await _getToken();
      if (token == null) {
        developer.log('Cannot create audit log: User not authenticated');
        return false;
      }

      final body = {
        'action': action,
        'actionType': actionType,
        'platform': platform,
        if (targetUserId != null) 'targetUserId': targetUserId,
        if (targetProductId != null) 'targetProductId': targetProductId,
        if (location != null) 'location': location,
        if (metadata != null) 'metadata': metadata,
      };

      developer.log('Creating audit log: $action ($actionType)');

      final response = await http.post(
        Uri.parse('$baseUrl/audit/log'),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: json.encode(body),
      ).timeout(const Duration(seconds: 10));

      developer.log('Audit Log Response Status: ${response.statusCode}');

      if (response.statusCode == 201) {
        developer.log('Audit log created successfully');
        return true;
      } else {
        developer.log('Failed to create audit log: ${response.body}');
        return false;
      }
    } catch (e) {
      developer.log('Error creating audit log: $e');
      return false;
    }
  }

  /// Get current user's audit logs
  /// 
  /// [page] - Page number for pagination
  /// [limit] - Number of items per page
  static Future<Map<String, dynamic>?> getMyAuditLogs({
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final token = await _getToken();
      if (token == null) {
        developer.log('Cannot fetch audit logs: User not authenticated');
        return null;
      }

      final url = Uri.parse('$baseUrl/audit/my-logs?page=$page&limit=$limit');
      
      developer.log('Fetching user audit logs (page $page, limit $limit)...');
      developer.log('URL: $url');

      final response = await http.get(
        url,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Bearer $token',
        },
      ).timeout(const Duration(seconds: 10));

      developer.log('Audit Logs Response Status: ${response.statusCode}');
      developer.log('Audit Logs Response Body: ${response.body}');

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return data;
      } else {
        developer.log('Failed to fetch audit logs: ${response.body}');
        return null;
      }
    } on SocketException {
      developer.log('Network error: Cannot connect to server');
      return null;
    } on TimeoutException {
      developer.log('Request timeout while fetching audit logs');
      return null;
    } catch (e) {
      developer.log('Error fetching audit logs: $e');
      return null;
    }
  }

  /// Get audit log by ID
  static Future<Map<String, dynamic>?> getAuditLogById(String logId) async {
    try {
      final token = await _getToken();
      if (token == null) {
        developer.log('Cannot fetch audit log: User not authenticated');
        return null;
      }

      final response = await http.get(
        Uri.parse('$baseUrl/audit/logs/$logId'),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Bearer $token',
        },
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return data['data'];
      } else {
        developer.log('Failed to fetch audit log: ${response.body}');
        return null;
      }
    } catch (e) {
      developer.log('Error fetching audit log: $e');
      return null;
    }
  }

  // Convenience methods for common actions

  static Future<void> logLogin() async {
    await createLog(
      action: 'User logged in to mobile app',
      actionType: 'LOGIN',
    );
  }

  static Future<void> logLogout() async {
    await createLog(
      action: 'User logged out from mobile app',
      actionType: 'LOGOUT',
    );
  }

  static Future<void> logScanProduct({
    String? productId,
    Map<String, dynamic>? scanData,
    Map<String, dynamic>? location,
  }) async {
    await createLog(
      action: 'User scanned a product',
      actionType: 'SCAN_PRODUCT',
      targetProductId: productId,
      location: location,
      metadata: scanData,
    );
  }

  static Future<void> logLocationUpdate({
    required double latitude,
    required double longitude,
    String? address,
  }) async {
    await createLog(
      action: 'User location updated',
      actionType: 'LOCATION_UPDATE',
      location: {
        'latitude': latitude,
        'longitude': longitude,
        if (address != null) 'address': address,
      },
    );
  }

  static Future<void> logAppClosed() async {
    await createLog(
      action: 'User closed the mobile app',
      actionType: 'APP_CLOSED',
    );
  }
}
