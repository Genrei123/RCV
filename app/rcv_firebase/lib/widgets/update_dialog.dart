import 'package:flutter/material.dart';
import '../services/update_service.dart';

class UpdateDialog {
  /// Show force update dialog (user cannot dismiss)
  static void showForceUpdateDialog(BuildContext context) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => WillPopScope(
        onWillPop: () async => false, // Prevent back button
        child: AlertDialog(
          title: const Row(
            children: [
              Icon(Icons.system_update, color: Colors.red),
              SizedBox(width: 8),
              Text('Update Required'),
            ],
          ),
          content: const Text(
            'A new version of the app is required. Please update to continue using the app.',
          ),
          actions: [
            ElevatedButton(
              onPressed: () => UpdateService.redirectToUpdate(),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red,
                foregroundColor: Colors.white,
              ),
              child: const Text('Update Now'),
            ),
          ],
        ),
      ),
    );
  }

  /// Show optional update dialog (user can dismiss)
  static void showOptionalUpdateDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.system_update, color: Colors.blue),
            SizedBox(width: 8),
            Text('Update Available'),
          ],
        ),
        content: const Text(
          'A new version of the app is available. Would you like to update?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Later'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(context).pop();
              UpdateService.redirectToUpdate();
            },
            child: const Text('Update'),
          ),
        ],
      ),
    );
  }

  /// Check for updates and show appropriate dialog
  static Future<void> checkAndShowUpdateDialog(BuildContext context) async {
    try {
      // Check for force update first
      if (await UpdateService.isForceUpdateRequired()) {
        showForceUpdateDialog(context);
        return;
      }
      
      // Check for optional update
      if (await UpdateService.checkForUpdates()) {
        showOptionalUpdateDialog(context);
      }
    } catch (e) {
      print('Error checking for updates: $e');
    }
  }
}