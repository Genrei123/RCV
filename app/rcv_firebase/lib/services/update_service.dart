import 'package:package_info_plus/package_info_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:flutter/material.dart';
import 'remote_config_service.dart';

class UpdateService {
  /// Check for updates and show appropriate dialog
  static Future<void> checkAndShowUpdateDialog(BuildContext context) async {
    try {
      bool forceUpdateRequired = await isForceUpdateRequired();
      bool updateAvailable = await checkForUpdates();
      bool forceUpdateFromConfig = RemoteConfigService.isForceUpdateRequired();
      
      if (forceUpdateRequired) {
        _showForceUpdateDialog(context, 'Your app version is too old. Please update to continue.');
      } else if (updateAvailable && forceUpdateFromConfig) {
        _showForceUpdateDialog(context, 'A critical update is available. Please update to continue.');
      } else if (updateAvailable) {
        _showOptionalUpdateDialog(context);
      }
    } catch (e) {
      print('Error checking for updates: $e');
    }
  }

  static void _showForceUpdateDialog(BuildContext context, String message) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext context) {
        return WillPopScope(
          onWillPop: () async => false, // Prevent back button
          child: AlertDialog(
            title: Row(
              children: [
                Icon(Icons.system_update, color: Colors.orange),
                SizedBox(width: 8),
                Text('Update Required'),
              ],
            ),
            content: Text(message),
            actions: [
              ElevatedButton(
                onPressed: () => redirectToUpdate(),
                style: ElevatedButton.styleFrom(backgroundColor: Color(0xFF005440)),
                child: const Text('Update Now', style: TextStyle(color: Colors.white)),
              ),
            ],
          ),
        );
      },
    );
  }
  
  static void _showOptionalUpdateDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: Row(
            children: [
              Icon(Icons.new_releases, color: Colors.blue),
              SizedBox(width: 8),
              Text('Update Available'),
            ],
          ),
          content: const Text(
            'A new version of the app is available. Would you like to update now?',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Later'),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.of(context).pop();
                redirectToUpdate();
              },
              style: ElevatedButton.styleFrom(backgroundColor: Color(0xFF005440)),
              child: const Text('Update', style: TextStyle(color: Colors.white)),
            ),
          ],
        );
      },
    );
  }

  /// Check if app version is lower than latest version
  static Future<bool> checkForUpdates() async {
    try {
      final packageInfo = await PackageInfo.fromPlatform();
      final currentVersion = packageInfo.version;
      final latestVersion = RemoteConfigService.getLatestAppVersion();
      
      return _isVersionLower(currentVersion, latestVersion);
    } catch (e) {
      print('Error checking for updates: $e');
      return false;
    }
  }
  
  /// Check if force update is required based on minimum version
  static Future<bool> isForceUpdateRequired() async {
    try {
      final packageInfo = await PackageInfo.fromPlatform();
      final currentVersion = packageInfo.version;
      final minimumVersion = RemoteConfigService.getMinimumAppVersion();
      
      return _isVersionLower(currentVersion, minimumVersion);
    } catch (e) {
      print('Error checking force update: $e');
      return false;
    }
  }
  
  /// Redirect user to update link in browser
  static Future<void> redirectToUpdate() async {
    try {
      String updateUrl = RemoteConfigService.getUpdateUrl();
      
      if (updateUrl.isEmpty) {
        updateUrl = 'https://console.firebase.google.com/u/1/project/rcv-firebase-dev/settings/general/android:rcv.app.android';
      }
      
      await launchUrl(
        Uri.parse(updateUrl),
        mode: LaunchMode.externalApplication,
        webOnlyWindowName: '_blank',
      );
      
    } catch (e) {
      print('Error opening update link: $e');
    }
  }
  
  /// Get current app version
  static Future<String> getCurrentVersion() async {
    try {
      final packageInfo = await PackageInfo.fromPlatform();
      return packageInfo.version;
    } catch (e) {
      print('Error getting current version: $e');
      return '1.0.0';
    }
  }
  
  /// Version comparison helper
  static bool _isVersionLower(String current, String latest) {
    try {
      final currentParts = current.split('.').map(int.parse).toList();
      final latestParts = latest.split('.').map(int.parse).toList();
      
      // Ensure both have at least 3 parts (major.minor.patch)
      while (currentParts.length < 3) currentParts.add(0);
      while (latestParts.length < 3) latestParts.add(0);
      
      for (int i = 0; i < 3; i++) {
        if (currentParts[i] < latestParts[i]) return true;
        if (currentParts[i] > latestParts[i]) return false;
      }
      return false; // Versions are equal
    } catch (e) {
      print('Error comparing versions: $e');
      return false;
    }
  }
}