import 'dart:io';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:developer' as developer;

/// Service for uploading and managing files in Firebase Storage
class FirebaseStorageService {
  static final FirebaseStorage _storage = FirebaseStorage.instance;

  /// Upload profile avatar to Firebase Storage
  /// 
  /// Uploads the image file to 'avatars/{userId}.jpg' in Firebase Storage
  /// Returns the download URL on success, null on failure
  /// 
  /// Example:
  /// ```dart
  /// final url = await FirebaseStorageService.uploadAvatar('user123', imageFile);
  /// if (url != null) {
  ///   // Update backend with URL
  ///   await UserProfileService.updateAvatarUrl(url);
  /// }
  /// ```
  static Future<String?> uploadAvatar(String userId, File imageFile) async {
    try {
      developer.log('📤 [Storage] Uploading avatar for user: $userId');
      await _logAuthStatus();
      
      final ref = _storage.ref().child('avatars/$userId.jpg');
      
      // Set metadata for better performance
      final metadata = SettableMetadata(
        contentType: 'image/jpeg',
        cacheControl: 'public, max-age=31536000', // Cache for 1 year
      );
      
      // Upload file
      final uploadTask = await ref.putFile(imageFile, metadata);
      
      // Get download URL
      final url = await uploadTask.ref.getDownloadURL();
      
      developer.log('✅ [Storage] Avatar uploaded successfully: $url');
      return url;
    } catch (e, stackTrace) {
      developer.log('❌ [Storage] Avatar upload failed: $e');
      developer.log('Stack trace: $stackTrace');
      await _logAuthStatus();
      return null;
    }
  }

  /// Upload scan images (front and back) to Firebase Storage
  /// 
  /// Uploads both images to 'scans/{scanId}/front.jpg' and 'scans/{scanId}/back.jpg'
  /// Returns Map with 'frontUrl' and 'backUrl' keys
  /// 
  /// Example:
  /// ```dart
  /// final urls = await FirebaseStorageService.uploadScanImages(
  ///   scanId: 'scan_123',
  ///   frontImage: frontFile,
  ///   backImage: backFile,
  /// );
  /// ```
  static Future<Map<String, String?>> uploadScanImages({
    required String scanId,
    required File frontImage,
    required File backImage,
  }) async {
    try {
      developer.log('[Storage] Uploading scan images for: $scanId');
      await _logAuthStatus();
      
      final frontRef = _storage.ref().child('scans/$scanId/front.jpg');
      final backRef = _storage.ref().child('scans/$scanId/back.jpg');
      
      final metadata = SettableMetadata(
        contentType: 'image/jpeg',
        customMetadata: {
          'scanId': scanId,
          'uploadedAt': DateTime.now().toIso8601String(),
        },
      );
      
      // Upload both images in parallel for better performance
      final results = await Future.wait([
        frontRef.putFile(frontImage, metadata),
        backRef.putFile(backImage, metadata),
      ]);
      
      // Get download URLs
      final frontUrl = await results[0].ref.getDownloadURL();
      final backUrl = await results[1].ref.getDownloadURL();
      
      developer.log('[Storage] Scan images uploaded successfully');
      developer.log('Front: $frontUrl');
      developer.log('Back: $backUrl');
      
      return {'frontUrl': frontUrl, 'backUrl': backUrl};
    } catch (e, stackTrace) {
      developer.log('[Storage] Scan upload failed: $e');
      developer.log('Stack trace: $stackTrace');
      await _logAuthStatus();
      return {'frontUrl': null, 'backUrl': null};
    }
  }

  /// Upload multiple scan images to Firebase Storage
  /// 
  /// Supports uploading a variable number of images for different product types:
  /// - Pack/Sack: 2 images (front, back)
  /// - Can: 4 images (front, back, left, right)
  /// - Box: 6 images (front, back, left, right, top, bottom)
  /// 
  /// Example:
  /// ```dart
  /// final urls = await FirebaseStorageService.uploadMultipleScanImages(
  ///   scanId: 'scan_123',
  ///   images: {
  ///     'front': File('path/to/front.jpg'),
  ///     'back': File('path/to/back.jpg'),
  ///     'left': File('path/to/left.jpg'),
  ///     'right': File('path/to/right.jpg'),
  ///   },
  /// );
  /// ```
  static Future<Map<String, String?>> uploadMultipleScanImages({
    required String scanId,
    required Map<String, File> images,
  }) async {
    try {
      developer.log('[Storage] Uploading ${images.length} scan images for: $scanId');
      await _logAuthStatus();
      
      final metadata = SettableMetadata(
        contentType: 'image/jpeg',
        customMetadata: {
          'scanId': scanId,
          'uploadedAt': DateTime.now().toIso8601String(),
        },
      );
      
      // Create upload tasks for all images
      final uploadTasks = <String, Future<TaskSnapshot>>{};
      for (final entry in images.entries) {
        final imageName = entry.key;
        final imageFile = entry.value;
        final ref = _storage.ref().child('scans/$scanId/$imageName.jpg');
        uploadTasks[imageName] = ref.putFile(imageFile, metadata);
      }
      
      // Upload all images in parallel for better performance
      final results = <String, String?>{};
      await Future.wait(
        uploadTasks.entries.map((entry) async {
          try {
            final snapshot = await entry.value;
            final url = await snapshot.ref.getDownloadURL();
            results[entry.key] = url;
            developer.log('[Storage] ${entry.key}: $url');
          } catch (e) {
            developer.log('[Storage] Failed to upload ${entry.key}: $e');
            results[entry.key] = null;
          }
        }),
      );
      
      developer.log('[Storage] ${results.length} scan images uploaded successfully');
      return results;
    } catch (e, stackTrace) {
      developer.log('[Storage] Multi-scan upload failed: $e');
      developer.log('Stack trace: $stackTrace');
      await _logAuthStatus();
      return {};
    }
  }

  /// Delete user's avatar from Firebase Storage
  /// 
  /// Useful when uploading a new avatar to clean up old one
  /// Returns true if deleted successfully, false if failed or doesn't exist
  static Future<bool> deleteAvatar(String userId) async {
    try {
      developer.log('🗑️ [Storage] Deleting avatar for user: $userId');
      
      final ref = _storage.ref().child('avatars/$userId.jpg');
      await ref.delete();
      
      developer.log('✅ [Storage] Avatar deleted successfully');
      return true;
    } catch (e) {
      developer.log('⚠️ [Storage] Avatar delete failed (may not exist): $e');
      return false;
    }
  }

  /// Delete scan images from Firebase Storage
  /// 
  /// Useful when deleting scan history records
  static Future<bool> deleteScanImages(String scanId) async {
    try {
      developer.log('🗑️ [Storage] Deleting scan images for: $scanId');
      
      final frontRef = _storage.ref().child('scans/$scanId/front.jpg');
      final backRef = _storage.ref().child('scans/$scanId/back.jpg');
      
      // Delete both images in parallel
      await Future.wait([
        frontRef.delete(),
        backRef.delete(),
      ]);
      
      developer.log('✅ [Storage] Scan images deleted successfully');
      return true;
    } catch (e) {
      developer.log('⚠️ [Storage] Scan delete failed: $e');
      return false;
    }
  }

  /// Get download URL for an existing avatar
  /// 
  /// Useful for loading avatar without uploading again
  static Future<String?> getAvatarUrl(String userId) async {
    try {
      final ref = _storage.ref().child('avatars/$userId.jpg');
      final url = await ref.getDownloadURL();
      return url;
    } catch (e) {
      developer.log('⚠️ [Storage] Avatar not found for user: $userId');
      return null;
    }
  }

  /// Check if avatar exists for a user
  static Future<bool> avatarExists(String userId) async {
    try {
      final ref = _storage.ref().child('avatars/$userId.jpg');
      await ref.getMetadata();
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Get metadata for uploaded avatar (size, upload date, etc.)
  static Future<Map<String, dynamic>?> getAvatarMetadata(String userId) async {
    try {
      final ref = _storage.ref().child('avatars/$userId.jpg');
      final metadata = await ref.getMetadata();
      
      return {
        'size': metadata.size,
        'contentType': metadata.contentType,
        'timeCreated': metadata.timeCreated,
        'updated': metadata.updated,
        'downloadUrl': await ref.getDownloadURL(),
      };
    } catch (e) {
      developer.log('⚠️ [Storage] Failed to get metadata: $e');
      return null;
    }
  }

  /// Helper method to log current Firebase Auth status
  static Future<void> _logAuthStatus() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('access_token');
      final userEmail = prefs.getString('user_email');
      
      if (token != null && token.isNotEmpty) {
        developer.log('👤 [Auth] User authenticated: $userEmail');
        developer.log('🔑 [Auth] Has valid access token: true');
      } else {
        developer.log('⚠️ [Auth] Not authenticated - Anonymous uploads may be rejected');
        developer.log('💡 [Auth] Token missing: Make sure user is logged in');
      }
    } catch (e) {
      developer.log('❌ [Auth] Error checking auth status: $e');
    }
  }
}
