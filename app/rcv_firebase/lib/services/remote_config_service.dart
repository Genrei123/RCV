import 'package:firebase_remote_config/firebase_remote_config.dart';
import 'package:flutter/foundation.dart';

class RemoteConfigService {
  static FirebaseRemoteConfig? _remoteConfig;
  
  static Future<void> initialize() async {
    try {
      print('🔧 [RemoteConfig] Starting initialization...');
      _remoteConfig = FirebaseRemoteConfig.instance;
      print('🔧 [RemoteConfig] Instance obtained');
      
      await _remoteConfig!.setConfigSettings(RemoteConfigSettings(
        fetchTimeout: const Duration(seconds: 30), // Reduced timeout
        minimumFetchInterval: kDebugMode 
          ? const Duration(seconds: 10)
          : const Duration(hours: 1),
      ));
      print('🔧 [RemoteConfig] Config settings applied');
      
      // Set default values first
      await _remoteConfig!.setDefaults({
        'latest_app_version': '1.0.1',
        'minimum_app_version': '1.0.0',
        'force_update_required': false,
        'app_update_url': '',
      });
      print('🔧 [RemoteConfig] Defaults set');
      
      // Try to fetch and activate, but don't fail if network issues
      try {
        bool success = await _remoteConfig!.fetchAndActivate();
        print('🔧 [RemoteConfig] Fetch and activate result: $success');
        
        // Test getting a value
        String testValue = _remoteConfig!.getString('latest_app_version');
        print('🔧 [RemoteConfig] Test value for latest_app_version: $testValue');
      } catch (networkError) {
        print('⚠️ [RemoteConfig] Network fetch failed, using defaults: $networkError');
      }
      
      print('✅ [RemoteConfig] Initialization completed');
      
    } catch (e) {
      print('💥 [RemoteConfig] Failed to initialize: $e');
      _remoteConfig = null; // Ensure null state on failure
    }
  }
  
  /// Ensure Remote Config is initialized (re-initialize if needed)
  static Future<void> ensureInitialized() async {
    if (_remoteConfig == null) {
      print('🔄 [RemoteConfig] Instance is null, re-initializing...');
      await initialize();
    } else {
      print('✅ [RemoteConfig] Instance already exists');
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
        print('⚠️ [RemoteConfig] _remoteConfig is null for key: $key, returning default: $defaultValue');
        return defaultValue;
      }
      String value = _remoteConfig!.getString(key);
      print('📋 [RemoteConfig] getString($key) = "$value" (default: "$defaultValue")');
      return value.isEmpty ? defaultValue : value;
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
  
  // Update-related methods
  static String getMinimumAppVersion() {
    return getString('minimum_app_version', defaultValue: '1.0.0');
  }

  static String getLatestAppVersion() {
    String version = getString('latest_app_version', defaultValue: '1.0.1'); // Changed default for testing
    print('🔍 [RemoteConfig] getLatestAppVersion: $version');
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
      print('🔄 [RemoteConfig] Starting refresh...');
      
      if (_remoteConfig == null) {
        print('⚠️ [RemoteConfig] Instance is null during refresh');
        return false;
      }
      
      bool updatedConfig = await _remoteConfig!.fetchAndActivate();
      print('🔄 [RemoteConfig] Refresh result: $updatedConfig');
      
      // Test getting values after refresh
      String version = _remoteConfig!.getString('latest_app_version');
      print('🔄 [RemoteConfig] After refresh - latest_app_version: $version');
      
      print(updatedConfig 
        ? '✅ [RemoteConfig] Refreshed with new values' 
        : 'ℹ️ [RemoteConfig] No updates available');
      return updatedConfig;
    } catch (e) {
      print('💥 [RemoteConfig] Refresh failed: $e');
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