import 'package:flutter/foundation.dart';
import 'dart:async';
import 'package:cloud_firestore/cloud_firestore.dart';

/// KioskService - Firebase-based real-time kiosk management
///
/// Uses Firebase Firestore for:
/// - Reading kiosk status (real-time listeners)
/// - Sending commands (instant delivery)
/// - No polling needed!
///
/// Firestore Structure:
/// - kiosks/{kioskId} - Kiosk status document
/// - kiosks/{kioskId}/commands/{commandId} - Command documents
class KioskService extends ChangeNotifier {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  
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
  
  // Firebase listeners
  StreamSubscription<QuerySnapshot>? _kiosksSubscription;
  StreamSubscription<DocumentSnapshot>? _selectedKioskSubscription;
  
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
    _startListeningToSelectedKiosk();
    notifyListeners();
  }

  /// Start listening to all kiosks (real-time updates)
  void startMonitoring() {
    debugPrint('🔥 Starting Firebase kiosk monitoring');
    
    _kiosksSubscription = _firestore
        .collection('kiosks')
        .snapshots()
        .listen((snapshot) {
          _allKiosks = snapshot.docs.map((doc) {
            final data = doc.data();
            data['kioskId'] = doc.id;
            
            // Calculate online status (within last hour)
            final lastSeen = data['lastSeen'] as Timestamp?;
            if (lastSeen != null) {
              final lastSeenDate = lastSeen.toDate();
              final oneHourAgo = DateTime.now().subtract(const Duration(hours: 1));
              data['status'] = lastSeenDate.isAfter(oneHourAgo) ? 'online' : 'offline';
            } else {
              data['status'] = 'offline';
            }
            
            return data;
          }).toList();
          
          debugPrint('📡 Loaded ${_allKiosks.length} kiosks from Firebase');
          
          // Update selected kiosk if it exists
          if (_selectedKioskId != null) {
            final selected = _allKiosks.firstWhere(
              (k) => k['kioskId'] == _selectedKioskId,
              orElse: () => {},
            );
            if (selected.isNotEmpty) {
              _updateFromKioskData(selected);
            }
          }
          
          _isLoading = false;
          notifyListeners();
        }, onError: (e) {
          debugPrint('❌ Firebase error: $e');
          _isLoading = false;
          notifyListeners();
        });
    
    _isLoading = true;
    notifyListeners();
  }

  /// Start listening to selected kiosk for real-time status
  void _startListeningToSelectedKiosk() {
    // Cancel existing subscription
    _selectedKioskSubscription?.cancel();
    
    if (_selectedKioskId == null) return;
    
    debugPrint('🔥 Listening to kiosk: $_selectedKioskId');
    
    _selectedKioskSubscription = _firestore
        .collection('kiosks')
        .doc(_selectedKioskId)
        .snapshots()
        .listen((doc) {
          if (doc.exists) {
            final data = doc.data()!;
            data['kioskId'] = doc.id;
            _updateFromKioskData(data);
            notifyListeners();
          }
        }, onError: (e) {
          debugPrint('❌ Error listening to kiosk: $e');
        });
  }

  void stopMonitoring() {
    _kiosksSubscription?.cancel();
    _kiosksSubscription = null;
    _selectedKioskSubscription?.cancel();
    _selectedKioskSubscription = null;
  }

  /// Manual refresh - fetch all kiosks
  Future<void> fetchAllKiosks() async {
    try {
      _isLoading = true;
      notifyListeners();
      
      debugPrint('🔥 Fetching kiosks from Firebase');
      final snapshot = await _firestore.collection('kiosks').get();
      
      _allKiosks = snapshot.docs.map((doc) {
        final data = doc.data();
        data['kioskId'] = doc.id;
        
        // Calculate online status
        final lastSeen = data['lastSeen'] as Timestamp?;
        if (lastSeen != null) {
          final lastSeenDate = lastSeen.toDate();
          final oneHourAgo = DateTime.now().subtract(const Duration(hours: 1));
          data['status'] = lastSeenDate.isAfter(oneHourAgo) ? 'online' : 'offline';
        } else {
          data['status'] = 'offline';
        }
        
        return data;
      }).toList();
      
      debugPrint('📡 Fetched ${_allKiosks.length} kiosks');
      
      // Update selected kiosk if exists
      if (_selectedKioskId != null) {
        final selected = _allKiosks.firstWhere(
          (k) => k['kioskId'] == _selectedKioskId,
          orElse: () => {},
        );
        if (selected.isNotEmpty) {
          _updateFromKioskData(selected);
        }
      }
    } catch (e) {
      debugPrint('❌ Error fetching kiosks: $e');
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
      
      final doc = await _firestore.collection('kiosks').doc(_selectedKioskId).get();
      
      if (doc.exists) {
        final data = doc.data()!;
        data['kioskId'] = doc.id;
        _updateFromKioskData(data);
      } else {
        _isOnline = false;
      }
    } catch (e) {
      debugPrint('❌ Error refreshing status: $e');
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
    
    // Calculate online status from lastSeen
    final lastSeen = data['lastSeen'];
    if (lastSeen is Timestamp) {
      _lastSeen = lastSeen.toDate();
      final oneHourAgo = DateTime.now().subtract(const Duration(hours: 1));
      _isOnline = _lastSeen!.isAfter(oneHourAgo);
    } else if (data['status'] != null) {
      _isOnline = data['status'].toString() == 'online';
    } else {
      _isOnline = false;
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

  /// Send a command to Firebase (instant delivery to kiosk)
  Future<bool> _sendCommand(String command, {Map<String, dynamic>? payload}) async {
    if (_selectedKioskId == null) return false;
    
    try {
      await _firestore
          .collection('kiosks')
          .doc(_selectedKioskId)
          .collection('commands')
          .add({
            'command': command,
            'payload': payload ?? {},
            'timestamp': FieldValue.serverTimestamp(),
          });
      
      debugPrint('🔥 Command sent: $command');
      return true;
    } catch (e) {
      debugPrint('❌ Error sending command: $e');
      return false;
    }
  }

  /// Toggle an LED
  Future<bool> toggleLED(String ledName) async {
    if (_selectedKioskId == null) return false;
    
    final commandKey = 'led_$ledName';
    if (!_canSendCommand(commandKey)) {
      debugPrint('Command $commandKey is in cooldown');
      return false;
    }
    
    final success = await _sendCommand('toggle_led', payload: {'ledName': ledName});
    if (success) _markCommandSent(commandKey);
    return success;
  }

  /// Test all LEDs
  Future<bool> testAllLEDs() async {
    if (_selectedKioskId == null) return false;
    
    const commandKey = 'test_all_leds';
    if (!_canSendCommand(commandKey)) {
      debugPrint('Command $commandKey is in cooldown');
      return false;
    }
    
    final success = await _sendCommand('test_all_leds');
    if (success) _markCommandSent(commandKey);
    return success;
  }

  /// Restart the kiosk
  Future<bool> restartKiosk() async {
    if (_selectedKioskId == null) return false;
    
    const commandKey = 'restart';
    if (!_canSendCommand(commandKey)) {
      debugPrint('Command $commandKey is in cooldown');
      return false;
    }
    
    final success = await _sendCommand('restart');
    if (success) _markCommandSent(commandKey);
    return success;
  }

  /// Shutdown the kiosk
  Future<bool> shutdownKiosk() async {
    if (_selectedKioskId == null) return false;
    
    const commandKey = 'shutdown';
    if (!_canSendCommand(commandKey)) {
      debugPrint('Command $commandKey is in cooldown');
      return false;
    }
    
    final success = await _sendCommand('shutdown');
    if (success) _markCommandSent(commandKey);
    return success;
  }

  /// Change kiosk mode
  Future<bool> setMode(String mode) async {
    if (_selectedKioskId == null) return false;
    
    final commandKey = 'mode_$mode';
    if (!_canSendCommand(commandKey)) {
      debugPrint('Command $commandKey is in cooldown');
      return false;
    }
    
    final success = await _sendCommand('set_mode', payload: {'mode': mode});
    if (success) _markCommandSent(commandKey);
    return success;
  }

  @override
  void dispose() {
    stopMonitoring();
    super.dispose();
  }
}
