import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;

class AuthService extends ChangeNotifier {
  static const String _tokenKey = 'auth_token';
  static const String _userKey = 'user_data';
  
  // Update this to your API endpoint
  static const String _apiBaseUrl = 'https://rcv-production-cbd6.up.railway.app/api/v1';
  
  bool _isAuthenticated = false;
  String? _token;
  Map<String, dynamic>? _userData;

  bool get isAuthenticated => _isAuthenticated;
  String? get token => _token;
  Map<String, dynamic>? get userData => _userData;

  AuthService() {
    _loadSavedAuth();
  }

  Future<void> _loadSavedAuth() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      _token = prefs.getString(_tokenKey);
      final userJson = prefs.getString(_userKey);
      
      if (_token != null && userJson != null) {
        _userData = jsonDecode(userJson);
        _isAuthenticated = true;
        notifyListeners();
      }
    } catch (e) {
      debugPrint('Error loading saved auth: $e');
    }
  }

  Future<bool> login(String email, String password) async {
    try {
      // Hardcoded technician credentials for MVP
      if (email == 'technician@gmail.com' && password == 'technician@123') {
        _token = 'mock-token-${DateTime.now().millisecondsSinceEpoch}';
        _userData = {
          '_id': 'tech-001',
          'email': email,
          'fullName': 'Technician User',
          'role': 'technician',
        };
        
        // Save to persistent storage
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(_tokenKey, _token!);
        await prefs.setString(_userKey, jsonEncode(_userData));
        
        _isAuthenticated = true;
        notifyListeners();
        return true;
      }

      // If not hardcoded credentials, try API login
      final response = await http.post(
        Uri.parse('$_apiBaseUrl/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': email,
          'password': password,
        }),
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        _token = data['token'];
        _userData = data['user'];
        
        // Save to persistent storage
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(_tokenKey, _token!);
        await prefs.setString(_userKey, jsonEncode(_userData));
        
        _isAuthenticated = true;
        notifyListeners();
        return true;
      }
      
      return false;
    } catch (e) {
      debugPrint('Login error: $e');
      return false;
    }
  }

  Future<void> logout() async {
    _token = null;
    _userData = null;
    _isAuthenticated = false;
    
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_userKey);
    
    notifyListeners();
  }
}
