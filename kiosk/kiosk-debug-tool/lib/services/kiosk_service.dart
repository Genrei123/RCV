import 'package:flutter/foundation.dart';
import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;

class KioskService extends ChangeNotifier {
  // RCV API endpoint - commands are queued here and kiosk polls for them
  // For local development: http://10.0.2.2:3005 (Android emulator)
  // For real device: use your computer's IP or ngrok URL
  static const String _apiBaseUrl = 'https://rcv-production-cbd6.up.railway.app';
  
  // Command debouncing - prevent spam
  final Map<String, DateTime> _lastCommandTime = {};
  static const Duration _commandCooldown = Duration(seconds: 3);
  
  String? _selectedKioskId;
  bool _isOnline = false;
  bool _isLoading = false;
  DateTime? _lastSeen;
  String _currentMode = 'idle';
  String _kioskName = '';
  String _kioskCity = '';
  double _kioskLat = 0;
  double _kioskLng = 0;
  
  bool _ledProcessing = false;
  bool _ledSuccess = false;
  bool _ledError = false;
  
  List<Map<String, dynamic>> _allKiosks = [];
  
  Timer? _monitoringTimer;
  
  // Getters
  String? get selectedKioskId => _selectedKioskId;
  bool get isOnline => _isOnline;
  bool get isLoading => _isLoading;
  bool get hasData => _lastSeen != null;
  DateTime? get lastSeen => _lastSeen;
  String get currentMode => _currentMode;
  String get kioskName => _kioskName;
  String get kioskCity => _kioskCity;
  double get kioskLat => _kioskLat;
  double get kioskLng => _kioskLng;
  
  bool get ledProcessing => _ledProcessing;
  bool get ledSuccess => _ledSuccess;
  bool get ledError => _ledError;
  
  List<Map<String, dynamic>> get allKiosks => _allKiosks;

  void selectKiosk(String kioskId) {
    _selectedKioskId = kioskId;
    refreshStatus();
    notifyListeners();
  }

  void startMonitoring() {
    // Only fetch once on start - no automatic polling to reduce server load
    // Kiosks send heartbeat every hour, so manual refresh is sufficient
    fetchAllKiosks();
  }

  void stopMonitoring() {
    _monitoringTimer?.cancel();
    _monitoringTimer = null;
  }

  /// Fetch all kiosks from the API
  Future<void> fetchAllKiosks() async {
    try {
      _isLoading = true;
      notifyListeners();
      
      debugPrint('Fetching kiosks from: $_apiBaseUrl/api/v1/kiosks');
      final response = await http.get(
        Uri.parse('$_apiBaseUrl/api/v1/kiosks'),
      ).timeout(const Duration(seconds: 10));

      debugPrint('Response status: ${response.statusCode}');
      debugPrint('Response body: ${response.body}');
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        _allKiosks = List<Map<String, dynamic>>.from(data['kiosks'] ?? []);
        debugPrint('Loaded ${_allKiosks.length} kiosks');
        
        // If we have a selected kiosk, update its status
        if (_selectedKioskId != null) {
          final selected = _allKiosks.firstWhere(
            (k) => k['kioskId'] == _selectedKioskId,
            orElse: () => {},
          );
          if (selected.isNotEmpty) {
            _updateFromKioskData(selected);
          }
        }
      } else {
        debugPrint('API error: ${response.statusCode}');
      }
    } catch (e) {
      debugPrint('Error fetching kiosks: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Refresh status of the selected kiosk
  Future<void> refreshStatus() async {
    if (_selectedKioskId == null) return;
    
    try {
      _isLoading = true;
      notifyListeners();
      
      final response = await http.get(
        Uri.parse('$_apiBaseUrl/api/v1/kiosks/$_selectedKioskId'),
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        _updateFromKioskData(data);
      } else {
        _isOnline = false;
      }
    } catch (e) {
      debugPrint('Error fetching kiosk status: $e');
      _isOnline = false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void _updateFromKioskData(Map<String, dynamic> data) {
    _kioskName = data['name']?.toString() ?? 'Unknown';
    final location = data['location'] as Map<String, dynamic>?;
    _kioskCity = location?['city']?.toString() ?? '';
    _kioskLat = _parseDouble(location?['lat']);
    _kioskLng = _parseDouble(location?['lng']);
    _currentMode = data['mode']?.toString() ?? 'idle';
    _isOnline = data['status']?.toString() == 'online';
    
    final lastSeenStr = data['lastSeen']?.toString();
    if (lastSeenStr != null) {
      _lastSeen = DateTime.tryParse(lastSeenStr);
    }
    
    // LED states from kiosk data
    final leds = data['leds'] as Map<String, dynamic>?;
    if (leds != null) {
      _ledProcessing = leds['processing'] == true;
      _ledSuccess = leds['success'] == true;
      _ledError = leds['error'] == true;
    }
  }

  double _parseDouble(dynamic value) {
    if (value == null) return 0;
    if (value is double) return value;
    if (value is int) return value.toDouble();
    if (value is String) return double.tryParse(value) ?? 0;
    return 0;
  }

  /// Check if command can be sent (not in cooldown)
  bool _canSendCommand(String commandKey) {
    final lastTime = _lastCommandTime[commandKey];
    if (lastTime == null) return true;
    return DateTime.now().difference(lastTime) > _commandCooldown;
  }

  /// Mark command as sent
  void _markCommandSent(String commandKey) {
    _lastCommandTime[commandKey] = DateTime.now();
  }

  /// Queue a command to toggle an LED
  Future<bool> toggleLED(String ledName) async {
    if (_selectedKioskId == null) return false;
    
    final commandKey = 'led_$ledName';
    if (!_canSendCommand(commandKey)) {
      debugPrint('Command $commandKey is in cooldown');
      return false;
    }
    
    try {
      final response = await http.post(
        Uri.parse('$_apiBaseUrl/api/v1/kiosks/$_selectedKioskId/led/$ledName/toggle'),
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        _markCommandSent(commandKey);
        debugPrint('LED toggle command queued for $ledName');
        return true;
      }
      return false;
    } catch (e) {
      debugPrint('Error toggling LED: $e');
      return false;
    }
  }

  /// Queue a command to test all LEDs
  Future<bool> testAllLEDs() async {
    if (_selectedKioskId == null) return false;
    
    const commandKey = 'test_all_leds';
    if (!_canSendCommand(commandKey)) {
      debugPrint('Command $commandKey is in cooldown');
      return false;
    }
    
    try {
      final response = await http.post(
        Uri.parse('$_apiBaseUrl/api/v1/kiosks/$_selectedKioskId/led/test-all'),
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        _markCommandSent(commandKey);
        debugPrint('Test all LEDs command queued');
        return true;
      }
      return false;
    } catch (e) {
      debugPrint('Error testing LEDs: $e');
      return false;
    }
  }

  /// Queue a restart command
  Future<bool> restartKiosk() async {
    if (_selectedKioskId == null) return false;
    
    const commandKey = 'restart';
    if (!_canSendCommand(commandKey)) {
      debugPrint('Command $commandKey is in cooldown');
      return false;
    }
    
    try {
      final response = await http.post(
        Uri.parse('$_apiBaseUrl/api/v1/kiosks/$_selectedKioskId/restart'),
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        _markCommandSent(commandKey);
        debugPrint('Restart command queued');
        return true;
      }
      return false;
    } catch (e) {
      debugPrint('Error restarting kiosk: $e');
      return false;
    }
  }

  /// Queue a shutdown command
  Future<bool> shutdownKiosk() async {
    if (_selectedKioskId == null) return false;
    
    const commandKey = 'shutdown';
    if (!_canSendCommand(commandKey)) {
      debugPrint('Command $commandKey is in cooldown');
      return false;
    }
    
    try {
      final response = await http.post(
        Uri.parse('$_apiBaseUrl/api/v1/kiosks/$_selectedKioskId/shutdown'),
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        _markCommandSent(commandKey);
        debugPrint('Shutdown command queued');
        return true;
      }
      return false;
    } catch (e) {
      debugPrint('Error shutting down kiosk: $e');
      return false;
    }
  }

  /// Queue a mode change command
  Future<bool> setMode(String mode) async {
    if (_selectedKioskId == null) return false;
    
    final commandKey = 'mode_$mode';
    if (!_canSendCommand(commandKey)) {
      debugPrint('Command $commandKey is in cooldown');
      return false;
    }
    
    try {
      final response = await http.post(
        Uri.parse('$_apiBaseUrl/api/v1/kiosks/$_selectedKioskId/mode'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'mode': mode}),
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        _markCommandSent(commandKey);
        debugPrint('Mode change command queued: $mode');
        return true;
      }
      return false;
    } catch (e) {
      debugPrint('Error setting mode: $e');
      return false;
    }
  }

  @override
  void dispose() {
    stopMonitoring();
    super.dispose();
  }
}
