import 'package:firebase_remote_config/firebase_remote_config.dart';
import 'package:flutter/foundation.dart';

class RemoteConfigService {
  static FirebaseRemoteConfig? _remoteConfig;
  
  static Future<void> initialize() async {
    try {
      _remoteConfig = FirebaseRemoteConfig.instance;
      
      await _remoteConfig!.setConfigSettings(RemoteConfigSettings(
        fetchTimeout: const Duration(minutes: 1),
        minimumFetchInterval: kDebugMode 
          ? const Duration(seconds: 10)  // Fast updates in debug mode
          : const Duration(hours: 1),    // Normal interval in production
      ));
      
      // Set default values - just in case app do stuff while offline
      await _remoteConfig!.setDefaults({
        'disable_application': false,  // Default: app is enabled
      });
      
      // Fetch and activate the latest values
      bool updated = await _remoteConfig!.fetchAndActivate();
      
      print('Remote Config initialized successfully. Updated: $updated');
      print('Current disable_application value: ${getDisableApplication()}');
      
    } catch (e) {
      print('Failed to initialize Remote Config: $e');
    }
  }
  
  static FirebaseRemoteConfig get instance {
    if (_remoteConfig == null) {
      throw Exception('Remote Config not initialized. Call initialize() first.');
    }
    return _remoteConfig!;
  }
  
  static bool getDisableApplication() {
    try {
      if (_remoteConfig == null) {
        print('Remote Config not initialized, defaulting to enabled');
        return false; 
      }
      
      bool isDisabled = _remoteConfig!.getBool('disable_application');
      print('Remote Config - disable_application: $isDisabled');
      return isDisabled;
      
    } catch (e) {
      print('Error getting disable_application value: $e');
      return false;
    }
  }
  
  /// Manually refresh Remote Config values
  static Future<bool> refresh() async {
    try {
      if (_remoteConfig != null) {
        bool updated = await _remoteConfig!.fetchAndActivate();
        print(updated 
          ? 'Remote Config refreshed with new values' 
          : 'ℹNo Remote Config updates available');
        return updated;
      }
      return false;
    } catch (e) {
      print('Failed to refresh Remote Config: $e');
      return false;
    }
  }
  
  /// Set up real-time listener for immediate updates
  static void addRealtimeListener(Function(bool) onDisableChange) {
    if (_remoteConfig == null) {
      print('Remote Config not initialized, cannot add listener');
      return;
    }
    
    _remoteConfig!.onConfigUpdated.listen((event) async {
      print('Remote Config update received');
      
      await _remoteConfig!.activate();
      
      bool newDisableValue = getDisableApplication();
      print('New disable_application value: $newDisableValue');
      
      onDisableChange(newDisableValue);
    });
    
    print('Real-time Remote Config listener added');
  }
}