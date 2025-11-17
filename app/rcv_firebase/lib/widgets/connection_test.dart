import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import 'package:rcv_firebase/themes/app_colors.dart' as app_colors;

class ConnectionTestWidget extends StatefulWidget {
  const ConnectionTestWidget({super.key});

  @override
  State<ConnectionTestWidget> createState() => _ConnectionTestWidgetState();
}

class _ConnectionTestWidgetState extends State<ConnectionTestWidget> {
  final ApiService _apiService = ApiService();
  final AuthService _authService = AuthService();
  bool _isTesting = false;
  String _testResult = '';

  Future<void> _testConnection() async {
    setState(() {
      _isTesting = true;
      _testResult = 'Testing connection...';
    });

    try {
      final result = await _apiService.testConnection();
      
      setState(() {
        _testResult = result['success'] 
          ? '✅ ${result['message']}' 
          : '❌ ${result['message']}';
      });
    } catch (e) {
      setState(() {
        _testResult = '❌ Error: $e';
      });
    } finally {
      setState(() {
        _isTesting = false;
      });
    }
  }

  Future<void> _testLogin() async {
    setState(() {
      _isTesting = true;
      _testResult = 'Testing login...';
    });

    try {
      final result = await _authService.login('baidummyacc17@gmail.com', 'user123');
      
      setState(() {
        _testResult = result['success'] 
          ? '✅ Login successful: ${result['message']}' 
          : '❌ Login failed: ${result['message']}';
      });
    } catch (e) {
      setState(() {
        _testResult = '❌ Login error: $e';
      });
    } finally {
      setState(() {
        _isTesting = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.all(16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Backend Connection Test',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: app_colors.AppColors.primary,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Base URL: ${ApiService.baseUrl}',
              style: TextStyle(
                fontSize: 12,
                color: app_colors.AppColors.muted,
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton(
                    onPressed: _isTesting ? null : _testConnection,
                    child: Text(_isTesting ? 'Testing...' : 'Test Connection'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: ElevatedButton(
                    onPressed: _isTesting ? null : _testLogin,
                    child: Text(_isTesting ? 'Testing...' : 'Test Login'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            if (_testResult.isNotEmpty)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: _testResult.contains('✅') 
                    ? Colors.green.withOpacity(0.1)
                    : Colors.red.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: _testResult.contains('✅') 
                      ? Colors.green
                      : Colors.red,
                  ),
                ),
                child: Text(
                  _testResult,
                  style: TextStyle(
                    color: _testResult.contains('✅') 
                      ? Colors.green.shade700
                      : Colors.red.shade700,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            const SizedBox(height: 16),
            Text(
              'Instructions:',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                color: app_colors.AppColors.primary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              '1. Make sure your Node.js backend is running on port 3000\n'
              '2. Click "Test Connection" to check if backend is reachable\n'
              '3. Click "Test Login" to test authentication\n'
              '4. If tests fail, check your backend server and network settings',
              style: TextStyle(
                fontSize: 12,
                color: app_colors.AppColors.muted,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

