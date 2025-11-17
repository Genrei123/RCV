// lib/services/scan_service.dart
// Service for scan/verification operations

import '../models/api_models.dart';
import '../config/api_constants.dart';
import 'api_client.dart';

class ScanService {
  static final ApiClient _apiClient = ApiClient.instance;

  /// Create a new scan/verification record
  static Future<ApiResponse<Scan>> createScan({
    required String productId,
    required ScanResult result,
    required ScanLocation location,
    String? notes,
    String? imageUrl,
  }) async {
    try {
      final scanData = {
        'productId': productId,
        'result': result.toString().split('.').last.toUpperCase(),
        'location': location.toJson(),
        if (notes != null) 'notes': notes,
        if (imageUrl != null) 'imageUrl': imageUrl,
      };

      final response = await _apiClient.post(
        ApiConstants.scansEndpoint,
        data: scanData,
      );

      return ApiResponse<Scan>.fromJson(
        response.data,
        (data) => Scan.fromJson(data),
      );
    } catch (e) {
      return ApiResponse<Scan>(
        success: false,
        message: 'Failed to create scan: ${e.toString()}',
        errors: [e.toString()],
      );
    }
  }

  /// Get paginated list of scans
  static Future<ApiResponse<List<Scan>>> getScans({
    int page = 1,
    int limit = 20,
    String? productId,
    String? inspectorId,
    ScanResult? result,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    try {
      final queryParams = <String, dynamic>{
        'page': page,
        'limit': limit,
      };

      if (productId != null) queryParams['productId'] = productId;
      if (inspectorId != null) queryParams['inspectorId'] = inspectorId;
      if (result != null) {
        queryParams['result'] = result.toString().split('.').last.toUpperCase();
      }
      if (startDate != null) queryParams['startDate'] = startDate.toIso8601String();
      if (endDate != null) queryParams['endDate'] = endDate.toIso8601String();

      final response = await _apiClient.get(
        ApiConstants.scansEndpoint,
        queryParameters: queryParams,
      );

      return ApiResponse<List<Scan>>.fromJson(
        response.data,
        (data) => (data as List).map((item) => Scan.fromJson(item)).toList(),
      );
    } catch (e) {
      return ApiResponse<List<Scan>>(
        success: false,
        message: 'Failed to fetch scans: ${e.toString()}',
        errors: [e.toString()],
        data: [],
      );
    }
  }

  /// Get scan by ID
  static Future<ApiResponse<Scan>> getScanById(String id) async {
    try {
      final response = await _apiClient.get('${ApiConstants.scansEndpoint}/$id');

      return ApiResponse<Scan>.fromJson(
        response.data,
        (data) => Scan.fromJson(data),
      );
    } catch (e) {
      return ApiResponse<Scan>(
        success: false,
        message: 'Failed to fetch scan: ${e.toString()}',
        errors: [e.toString()],
      );
    }
  }

  /// Update scan result
  static Future<ApiResponse<Scan>> updateScan(
    String id, {
    ScanResult? result,
    String? notes,
    String? imageUrl,
  }) async {
    try {
      final updateData = <String, dynamic>{};
      
      if (result != null) {
        updateData['result'] = result.toString().split('.').last.toUpperCase();
      }
      if (notes != null) updateData['notes'] = notes;
      if (imageUrl != null) updateData['imageUrl'] = imageUrl;

      final response = await _apiClient.put(
        '${ApiConstants.scansEndpoint}/$id',
        data: updateData,
      );

      return ApiResponse<Scan>.fromJson(
        response.data,
        (data) => Scan.fromJson(data),
      );
    } catch (e) {
      return ApiResponse<Scan>(
        success: false,
        message: 'Failed to update scan: ${e.toString()}',
        errors: [e.toString()],
      );
    }
  }

  /// Delete scan
  static Future<ApiResponse<void>> deleteScan(String id) async {
    try {
      final response = await _apiClient.delete('${ApiConstants.scansEndpoint}/$id');

      return ApiResponse<void>.fromJson(
        response.data,
        (_) {},
      );
    } catch (e) {
      return ApiResponse<void>(
        success: false,
        message: 'Failed to delete scan: ${e.toString()}',
        errors: [e.toString()],
      );
    }
  }

  /// Upload scan image
  static Future<ApiResponse<String>> uploadScanImage(
    String scanId,
    String imagePath,
  ) async {
    try {
      final response = await _apiClient.uploadFile(
        '${ApiConstants.scansEndpoint}/$scanId/image',
        imagePath,
        fieldName: 'image',
      );

      return ApiResponse<String>.fromJson(
        response.data,
        (data) => data['imageUrl'] as String,
      );
    } catch (e) {
      return ApiResponse<String>(
        success: false,
        message: 'Failed to upload scan image: ${e.toString()}',
        errors: [e.toString()],
      );
    }
  }

  /// Get scan statistics
  static Future<ApiResponse<Map<String, dynamic>>> getScanStatistics({
    DateTime? startDate,
    DateTime? endDate,
    String? inspectorId,
    String? productId,
  }) async {
    try {
      final queryParams = <String, dynamic>{};
      
      if (startDate != null) queryParams['startDate'] = startDate.toIso8601String();
      if (endDate != null) queryParams['endDate'] = endDate.toIso8601String();
      if (inspectorId != null) queryParams['inspectorId'] = inspectorId;
      if (productId != null) queryParams['productId'] = productId;

      final response = await _apiClient.get(
        '${ApiConstants.scansEndpoint}/statistics',
        queryParameters: queryParams,
      );

      return ApiResponse<Map<String, dynamic>>.fromJson(
        response.data,
        (data) => data as Map<String, dynamic>,
      );
    } catch (e) {
      return ApiResponse<Map<String, dynamic>>(
        success: false,
        message: 'Failed to fetch scan statistics: ${e.toString()}',
        errors: [e.toString()],
        data: {},
      );
    }
  }

  /// Get scans by inspector
  static Future<ApiResponse<List<Scan>>> getScansByInspector(
    String inspectorId, {
    int page = 1,
    int limit = 20,
    ScanResult? result,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    try {
      final queryParams = <String, dynamic>{
        'page': page,
        'limit': limit,
        'inspectorId': inspectorId,
      };

      if (result != null) {
        queryParams['result'] = result.toString().split('.').last.toUpperCase();
      }
      if (startDate != null) queryParams['startDate'] = startDate.toIso8601String();
      if (endDate != null) queryParams['endDate'] = endDate.toIso8601String();

      final response = await _apiClient.get(
        ApiConstants.scansEndpoint,
        queryParameters: queryParams,
      );

      return ApiResponse<List<Scan>>.fromJson(
        response.data,
        (data) => (data as List).map((item) => Scan.fromJson(item)).toList(),
      );
    } catch (e) {
      return ApiResponse<List<Scan>>(
        success: false,
        message: 'Failed to fetch inspector scans: ${e.toString()}',
        errors: [e.toString()],
        data: [],
      );
    }
  }

  /// Get recent scans (for dashboard)
  static Future<ApiResponse<List<Scan>>> getRecentScans({
    int limit = 10,
  }) async {
    try {
      final response = await _apiClient.get(
        '${ApiConstants.scansEndpoint}/recent',
        queryParameters: {'limit': limit},
      );

      return ApiResponse<List<Scan>>.fromJson(
        response.data,
        (data) => (data as List).map((item) => Scan.fromJson(item)).toList(),
      );
    } catch (e) {
      return ApiResponse<List<Scan>>(
        success: false,
        message: 'Failed to fetch recent scans: ${e.toString()}',
        errors: [e.toString()],
        data: [],
      );
    }
  }

  /// Submit scan for blockchain verification
  static Future<ApiResponse<Map<String, dynamic>>> submitToBlockchain(String scanId) async {
    try {
      final response = await _apiClient.post(
        '${ApiConstants.scansEndpoint}/$scanId/blockchain',
      );

      return ApiResponse<Map<String, dynamic>>.fromJson(
        response.data,
        (data) => data as Map<String, dynamic>,
      );
    } catch (e) {
      return ApiResponse<Map<String, dynamic>>(
        success: false,
        message: 'Failed to submit to blockchain: ${e.toString()}',
        errors: [e.toString()],
        data: {},
      );
    }
  }

  /// Verify scan on blockchain
  static Future<ApiResponse<Map<String, dynamic>>> verifyOnBlockchain(String scanId) async {
    try {
      final response = await _apiClient.get(
        '${ApiConstants.scansEndpoint}/$scanId/blockchain/verify',
      );

      return ApiResponse<Map<String, dynamic>>.fromJson(
        response.data,
        (data) => data as Map<String, dynamic>,
      );
    } catch (e) {
      return ApiResponse<Map<String, dynamic>>(
        success: false,
        message: 'Failed to verify on blockchain: ${e.toString()}',
        errors: [e.toString()],
        data: {},
      );
    }
  }

  /// Export scans data (CSV, Excel, etc.)
  static Future<ApiResponse<String>> exportScans({
    String format = 'csv',
    DateTime? startDate,
    DateTime? endDate,
    String? inspectorId,
    String? productId,
    ScanResult? result,
  }) async {
    try {
      final queryParams = <String, dynamic>{
        'format': format,
      };

      if (startDate != null) queryParams['startDate'] = startDate.toIso8601String();
      if (endDate != null) queryParams['endDate'] = endDate.toIso8601String();
      if (inspectorId != null) queryParams['inspectorId'] = inspectorId;
      if (productId != null) queryParams['productId'] = productId;
      if (result != null) {
        queryParams['result'] = result.toString().split('.').last.toUpperCase();
      }

      final response = await _apiClient.get(
        '${ApiConstants.scansEndpoint}/export',
        queryParameters: queryParams,
      );

      return ApiResponse<String>.fromJson(
        response.data,
        (data) => data['downloadUrl'] as String,
      );
    } catch (e) {
      return ApiResponse<String>(
        success: false,
        message: 'Failed to export scans: ${e.toString()}',
        errors: [e.toString()],
      );
    }
  }
}