import 'package:flutter/material.dart';
import 'update_service.dart';
import 'remote_config_service.dart';

class UpdateModalService {
  static bool _showUpdateModal = false;
  static bool _isForceUpdate = false;
  static String _updateTitle = '';
  static String _updateMessage = '';
  
  /// Check for updates and set modal state
  static Future<UpdateModalState?> checkForUpdates() async {
    try {
      bool forceUpdateRequired = await UpdateService.isForceUpdateRequired();
      bool updateAvailable = await UpdateService.checkForUpdates();
      bool forceUpdateFromConfig = RemoteConfigService.isForceUpdateRequired();
      
      if (forceUpdateRequired || updateAvailable) {
        _showUpdateModal = true;
        _isForceUpdate = forceUpdateRequired || forceUpdateFromConfig;
        
        if (forceUpdateRequired) {
          _updateTitle = 'Critical Update Required';
          _updateMessage = 'Your app version is too old. Please update to continue using the app.';
        } else if (updateAvailable && forceUpdateFromConfig) {
          _updateTitle = 'Important Update Available';
          _updateMessage = 'A critical update is available. Please update for the best experience.';
        } else {
          _updateTitle = 'New Version Available';
          _updateMessage = 'Update now for new features and improvements!';
        }
        
        return UpdateModalState(
          showModal: _showUpdateModal,
          isForceUpdate: _isForceUpdate,
          title: _updateTitle,
          message: _updateMessage,
        );
      }
      
      return null; // No update needed
    } catch (e) {
      debugPrint('Error checking for updates: $e');
      return null;
    }
  }
  
  /// Handle the "Update Now" button press
  static void handleUpdateNow() {
    try {
      UpdateService.redirectToUpdate();
    } catch (e) {
      debugPrint('Error launching app store: $e');
    }
  }
  
  /// Build the update modal widget
  static Widget? buildUpdateModal(BuildContext context, UpdateModalState? state, VoidCallback onDismiss) {
    if (state == null || !state.showModal) return null;
    
    return Container(
      color: Colors.black26,
      child: Center(
        child: Container(
          margin: const EdgeInsets.all(20),
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                state.title,
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w600,
                  color: Colors.black87,
                  decoration: TextDecoration.none,
                  fontFamily: 'SF Pro Text',
                ),
              ),
              const SizedBox(height: 16),
              Text(
                state.message,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w400,
                  color: Colors.black54,
                  decoration: TextDecoration.none,
                  fontFamily: 'SF Pro Text',
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 24),
              Row(
                mainAxisAlignment: state.isForceUpdate 
                    ? MainAxisAlignment.center 
                    : MainAxisAlignment.spaceEvenly,
                children: [
                  if (!state.isForceUpdate)
                    TextButton(
                      onPressed: onDismiss,
                      style: TextButton.styleFrom(
                        foregroundColor: const Color(0xFF005440),
                      ),
                      child: const Text(
                        'Later',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  TextButton(
                    onPressed: handleUpdateNow,
                    style: TextButton.styleFrom(
                      foregroundColor: const Color(0xFF005440),
                    ),
                    child: const Text(
                      'Update Now',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Data class to hold update modal state
class UpdateModalState {
  final bool showModal;
  final bool isForceUpdate;
  final String title;
  final String message;
  
  UpdateModalState({
    required this.showModal,
    required this.isForceUpdate,
    required this.title,
    required this.message,
  });
}