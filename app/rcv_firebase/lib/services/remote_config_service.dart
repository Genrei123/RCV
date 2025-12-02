import 'package:firebase_remote_config/firebase_remote_config.dart';
import 'package:flutter/foundation.dart';

class RemoteConfigService {
  static FirebaseRemoteConfig? _remoteConfig;
  
  static Future<void> initialize() async {
    try {
      debugPrint('🔧 [RemoteConfig] Starting initialization...');
      _remoteConfig = FirebaseRemoteConfig.instance;
      debugPrint('🔧 [RemoteConfig] Instance obtained');
      
      await _remoteConfig!.setConfigSettings(RemoteConfigSettings(
        fetchTimeout: const Duration(seconds: 30), // Reduced timeout
        minimumFetchInterval: kDebugMode 
          ? const Duration(seconds: 10)
          : const Duration(hours: 1),
      ));
      
      // Fetch and activate the latest values
      await _remoteConfig!.fetchAndActivate();
      
      debugPrint('Remote Config initialized successfully');
      
    } catch (e) {
      debugPrint('Failed to initialize Remote Config: $e');
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
      if (_remoteConfig == null) {
        debugPrint('⚠️ [RemoteConfig] _remoteConfig is null for key: $key, returning default: $defaultValue');
        return defaultValue;
      }
      String value = _remoteConfig!.getString(key);
      debugPrint('📋 [RemoteConfig] getString($key) = "$value" (default: "$defaultValue")');
      return value.isEmpty ? defaultValue : value;
    } catch (e) {
      debugPrint('Error getting string value for $key: $e');
      return defaultValue;
    }
  }
  
  static bool getBool(String key, {bool defaultValue = false}) {
    try {
      if (_remoteConfig == null) return defaultValue;
      return _remoteConfig!.getBool(key);
    } catch (e) {
      debugPrint('Error getting bool value for $key: $e');
      return defaultValue;
    }
  }
  
  static double getNumber(String key, {double defaultValue = 0.0}) {
    try {
      if (_remoteConfig == null) return defaultValue;
      return _remoteConfig!.getDouble(key);
    } catch (e) {
      debugPrint('Error getting number value for $key: $e');
      return defaultValue;
    }
  }
  
  static bool getDisableApplication() {
    return getBool('disable_application', defaultValue: false);
  }
  
  // Update-related methods
  static String getMinimumAppVersion() {
    return getString('minimum_app_version', defaultValue: '1.0.0');
  }

  static String getLatestAppVersion() {
    String version = getString('latest_app_version', defaultValue: '1.0.1'); // Changed default for testing
    debugPrint('🔍 [RemoteConfig] getLatestAppVersion: $version');
    return version;
  }

  static String getUpdateUrl() {
    return getString('app_update_url', defaultValue: '');
  }

  static bool isForceUpdateRequired() {
    return getBool('force_update_required', defaultValue: false);
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
        debugPrint(updatedConfig 
          ? 'Remote Config refreshed with new values' 
          : 'No Remote Config updates available');
        return updatedConfig;
      }
      return false;
    } catch (e) {
      debugPrint('Failed to refresh Remote Config: $e');
      return false;
    }
  }
  
  /// Set up real-time listener for immediate updates
  static void addRealtimeListener(Function() onConfigUpdated) {
    if (_remoteConfig == null) {
      debugPrint('Remote Config not initialized, cannot add listener');
      return;
    }
    
    _remoteConfig!.onConfigUpdated.listen((event) async {
      debugPrint('Remote Config update received');
      
      await _remoteConfig!.activate();
      
      // Notify callback that config was updated
      onConfigUpdated();
    });
    
    debugPrint('Real-time Remote Config listener added');
  }
}