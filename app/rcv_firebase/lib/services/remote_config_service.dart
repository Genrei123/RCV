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
          ? const Duration(seconds: 10)
          : const Duration(hours: 1),
      ));
      
      // Fetch and activate the latest values
      await _remoteConfig!.fetchAndActivate();
      
      print('Remote Config initialized successfully');
      
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
  
  static String getString(String key, {String defaultValue = ''}) {
    try {
      if (_remoteConfig == null) return defaultValue;
      return _remoteConfig!.getString(key);
    } catch (e) {
      print('Error getting string value for $key: $e');
      return defaultValue;
    }
  }
  
  static bool getBool(String key, {bool defaultValue = false}) {
    try {
      if (_remoteConfig == null) return defaultValue;
      return _remoteConfig!.getBool(key);
    } catch (e) {
      print('Error getting bool value for $key: $e');
      return defaultValue;
    }
  }
  
  static double getNumber(String key, {double defaultValue = 0.0}) {
    try {
      if (_remoteConfig == null) return defaultValue;
      return _remoteConfig!.getDouble(key);
    } catch (e) {
      print('Error getting number value for $key: $e');
      return defaultValue;
    }
  }
  
  static bool getDisableApplication() {
    return getBool('disable_application', defaultValue: false);
  }
  
  // Function inside the page for enability checkings

  //sample format:
  //    if (RemoteConfigService.isFeatureDisabled('disable_scanning_page')) {
  //   return const FeatureDisabledScreen(
  //      featureName: 'QR Code Scanning',
  //      icon: Icons.qr_code_scanner,
  //      selectedNavIndex: 2,
  //      navBarRole: NavBarRole.user,
  //    );
  //  }

  static bool isFeatureDisabled(String featureKey) {
    return getBool(featureKey, defaultValue: false);
  }
  
  /// Manually refresh Remote Config values
  static Future<bool> refresh() async {
    try {
      if (_remoteConfig != null) {
        bool updatedConfig = await _remoteConfig!.fetchAndActivate();
        print(updatedConfig 
          ? 'Remote Config refreshed with new values' 
          : 'No Remote Config updates available');
        return updatedConfig;
      }
      return false;
    } catch (e) {
      print('Failed to refresh Remote Config: $e');
      return false;
    }
  }
  
  /// Set up real-time listener for immediate updates
  static void addRealtimeListener(Function() onConfigUpdated) {
    if (_remoteConfig == null) {
      print('Remote Config not initialized, cannot add listener');
      return;
    }
    
    _remoteConfig!.onConfigUpdated.listen((event) async {
      print('Remote Config update received');
      
      await _remoteConfig!.activate();
      
      // Notify callback that config was updated
      onConfigUpdated();
    });
    
    print('Real-time Remote Config listener added');
  }
}