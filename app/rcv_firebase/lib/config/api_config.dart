/// API Configuration
/// 
/// Contains all API endpoints and configuration settings
class ApiConfig {
  // Base URL - change this based on environment
  static const String baseUrl = 'https://39b1f0dd99f9.ngrok-free.app'; // For local development
  // static const String baseUrl = 'http://10.0.2.2:3000'; // For Android emulator
  // static const String baseUrl = 'http://YOUR_IP:3000'; // For physical device
  
  // API version
  static const String apiVersion = 'v1';
  
  // Timeout settings
  static const Duration connectTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);
  
  // Endpoints
  static const String scanProduct = '/api/$apiVersion/scan/scanProduct';
  static const String getScans = '/api/$apiVersion/scan/getScans';
  static String getScanById(String id) => '/api/$apiVersion/scan/getScans/$id';
  
  // Headers
  static Map<String, String> get headers => {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  
  // Full URL helper
  static String getFullUrl(String endpoint) => '$baseUrl$endpoint';
}
