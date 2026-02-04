import 'dart:io';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:developer' as developer;
import 'package:path/path.dart' as path;

/// Service for uploading and managing files in Firebase Storage
class FirebaseStorageService {
  static final FirebaseStorage _storage = FirebaseStorage.instance;

  /// Sanitizes scanId to ensure it's valid for Firebase Storage paths
  static String _sanitizeScanId(String scanId) {
    // Remove or replace invalid characters
    return scanId
        .replaceAll(RegExp(r'[^\w\-]'), '_')  // Replace invalid chars with underscore
        .replaceAll(RegExp(r'_{2,}'), '_');   // Replace multiple underscores with single
  }

  /// Gets the proper content type and file extension from a File
  static Map<String, String> _getFileInfo(File file) {
    final ext = path.extension(file.path).toLowerCase();
    
    switch (ext) {
      case '.png':
        return {'contentType': 'image/png', 'extension': '.png'};
      case '.jpg':
      case '.jpeg':
        return {'contentType': 'image/jpeg', 'extension': '.jpg'};
      case '.webp':
        return {'contentType': 'image/webp', 'extension': '.webp'};
      default:
        // Default to JPEG if unknown
        developer.log('⚠️ Unknown image type: $ext, defaulting to JPEG');
        return {'contentType': 'image/jpeg', 'extension': '.jpg'};
    }
  }

  /// Upload profile avatar to Firebase Storage
  /// 
  /// Uploads the image file to 'avatars/{userId}.{ext}' in Firebase Storage
  /// Automatically detects and uses correct file extension and content type
  /// Returns the download URL on success, null on failure
  static Future<String?> uploadAvatar(String userId, File imageFile) async {
    try {
      developer.log('📤 [Storage] Uploading avatar for user: $userId');
      developer.log('📁 [Storage] Source file: ${imageFile.path}');
      await _logAuthStatus();
      
      // Validate file exists
      if (!await imageFile.exists()) {
        throw Exception('Image file does not exist: ${imageFile.path}');
      }
      
      // Check file size (max 30MB)
      final fileSize = await imageFile.length();
      const maxSize = 30 * 1024 * 1024; // 30MB
      if (fileSize > maxSize) {
        throw Exception('File size (${(fileSize / 1024 / 1024).toStringAsFixed(2)}MB) exceeds maximum allowed size (30MB)');
      }
      
      // Get file info
      final fileInfo = _getFileInfo(imageFile);
      final extension = fileInfo['extension']!;
      final contentType = fileInfo['contentType']!;
      
      // Sanitize userId for path safety
      final safeUserId = _sanitizeScanId(userId);
      final ref = _storage.ref().child('avatars/$safeUserId$extension');
      
      developer.log('☁️ [Storage] Upload path: avatars/$safeUserId$extension');
      developer.log('📋 [Storage] Content-Type: $contentType');
      
      // Set metadata
      final metadata = SettableMetadata(
        contentType: contentType,
        cacheControl: 'public, max-age=31536000',
        customMetadata: {
          'originalName': path.basename(imageFile.path),
          'uploadedAt': DateTime.now().toIso8601String(),
        },
      );
      
      // Upload file
      final uploadTask = await ref.putFile(imageFile, metadata);
      
      // Get download URL
      final url = await uploadTask.ref.getDownloadURL();
      
      developer.log('✅ [Storage] Avatar uploaded successfully');
      developer.log('🔗 [Storage] URL: $url');
      return url;
    } catch (e, stackTrace) {
      developer.log('❌ [Storage] Avatar upload failed: $e');
      developer.log('📍 Stack trace: $stackTrace');
      await _logAuthStatus();
      await _logStorageDebugInfo();
      return null;
    }
  }

  /// Upload scan images (front and back) to Firebase Storage
  /// 
  /// Automatically detects file types and uses correct extensions
  /// Returns Map with 'frontUrl' and 'backUrl' keys
  static Future<Map<String, String?>> uploadScanImages({
    required String scanId,
    required File frontImage,
    required File backImage,
  }) async {
    try {
      developer.log('📤 [Storage] Uploading scan images for: $scanId');
      developer.log('📁 [Storage] Front: ${frontImage.path}');
      developer.log('📁 [Storage] Back: ${backImage.path}');
      await _logAuthStatus();
      
      // Validate files exist
      if (!await frontImage.exists()) {
        throw Exception('Front image does not exist: ${frontImage.path}');
      }
      if (!await backImage.exists()) {
        throw Exception('Back image does not exist: ${backImage.path}');
      }
      
      // Check file sizes (max 30MB each)
      final frontSize = await frontImage.length();
      final backSize = await backImage.length();
      const maxSize = 30 * 1024 * 1024; // 30MB
      
      if (frontSize > maxSize) {
        throw Exception('Front image size (${(frontSize / 1024 / 1024).toStringAsFixed(2)}MB) exceeds maximum allowed size (30MB)');
      }
      if (backSize > maxSize) {
        throw Exception('Back image size (${(backSize / 1024 / 1024).toStringAsFixed(2)}MB) exceeds maximum allowed size (30MB)');
      }
      
      // Get file info for both images
      final frontInfo = _getFileInfo(frontImage);
      final backInfo = _getFileInfo(backImage);
      
      // Sanitize scanId
      final safeScanId = _sanitizeScanId(scanId);
      
      // Create references with proper extensions
      final frontRef = _storage.ref().child('scans/$safeScanId/front${frontInfo['extension']}');
      final backRef = _storage.ref().child('scans/$safeScanId/back${backInfo['extension']}');
      
      developer.log('☁️ [Storage] Front path: scans/$safeScanId/front${frontInfo['extension']}');
      developer.log('☁️ [Storage] Back path: scans/$safeScanId/back${backInfo['extension']}');
      
      // Create metadata for both uploads
      final frontMetadata = SettableMetadata(
        contentType: frontInfo['contentType']!,
        customMetadata: {
          'scanId': safeScanId,
          'side': 'front',
          'originalName': path.basename(frontImage.path),
          'uploadedAt': DateTime.now().toIso8601String(),
        },
      );
      
      final backMetadata = SettableMetadata(
        contentType: backInfo['contentType']!,
        customMetadata: {
          'scanId': safeScanId,
          'side': 'back',
          'originalName': path.basename(backImage.path),
          'uploadedAt': DateTime.now().toIso8601String(),
        },
      );
      
      developer.log('⏳ [Storage] Starting parallel upload...');
      
      // Upload both images in parallel
      final results = await Future.wait([
        frontRef.putFile(frontImage, frontMetadata),
        backRef.putFile(backImage, backMetadata),
      ]);
      
      developer.log('⏳ [Storage] Getting download URLs...');
      
      // Get download URLs
      final frontUrl = await results[0].ref.getDownloadURL();
      final backUrl = await results[1].ref.getDownloadURL();
      
      developer.log('✅ [Storage] Scan images uploaded successfully');
      developer.log('🔗 [Storage] Front URL: $frontUrl');
      developer.log('🔗 [Storage] Back URL: $backUrl');
      
      return {'frontUrl': frontUrl, 'backUrl': backUrl};
    } catch (e, stackTrace) {
      developer.log('❌ [Storage] Scan upload failed: $e');
      developer.log('📍 Stack trace: $stackTrace');
      await _logAuthStatus();
      await _logStorageDebugInfo();
      return {'frontUrl': null, 'backUrl': null};
    }
  }

  /// Upload a single scan image to Firebase Storage
  /// 
  /// Automatically detects file type and uses correct extension
  /// Returns the download URL on success, null on failure
  static Future<String?> uploadSingleImage({
    required String scanId,
    required File image,
    required String imageName,
  }) async {
    try {
      developer.log('📤 [Storage] Uploading single image: $imageName for scan: $scanId');
      developer.log('📁 [Storage] Image: ${image.path}');
      await _logAuthStatus();
      
      // Validate file exists
      if (!await image.exists()) {
        throw Exception('Image does not exist: ${image.path}');
      }
      
      // Check file size (max 30MB)
      final fileSize = await image.length();
      const maxSize = 30 * 1024 * 1024; // 30MB
      
      if (fileSize > maxSize) {
        throw Exception('Image size (${(fileSize / 1024 / 1024).toStringAsFixed(2)}MB) exceeds maximum allowed size (30MB)');
      }
      
      // Get file info
      final fileInfo = _getFileInfo(image);
      
      // Sanitize scanId and imageName
      final safeScanId = _sanitizeScanId(scanId);
      final safeImageName = _sanitizeScanId(imageName);
      
      // Create reference with proper extension
      final ref = _storage.ref().child('scans/$safeScanId/$safeImageName${fileInfo['extension']}');
      
      developer.log('☁️ [Storage] Path: scans/$safeScanId/$safeImageName${fileInfo['extension']}');
      
      // Create metadata
      final metadata = SettableMetadata(
        contentType: fileInfo['contentType']!,
        customMetadata: {
          'scanId': safeScanId,
          'imageName': safeImageName,
          'originalName': path.basename(image.path),
          'uploadedAt': DateTime.now().toIso8601String(),
        },
      );
      
      // Upload image
      final result = await ref.putFile(image, metadata);
      
      // Get download URL
      final url = await result.ref.getDownloadURL();
      
      developer.log('✅ [Storage] Single image uploaded successfully');
      developer.log('🔗 [Storage] URL: $url');
      
      return url;
    } catch (e, stackTrace) {
      developer.log('❌ [Storage] Single image upload failed: $e');
      developer.log('📍 Stack trace: $stackTrace');
      await _logAuthStatus();
      await _logStorageDebugInfo();
      return null;
    }
  }

  /// Delete user's avatar from Firebase Storage
  static Future<bool> deleteAvatar(String userId) async {
    try {
      developer.log('🗑️ [Storage] Deleting avatar for user: $userId');
      
      final safeUserId = _sanitizeScanId(userId);
      
      // Try deleting common extensions
      final extensions = ['.jpg', '.jpeg', '.png', '.webp'];
      bool deleted = false;
      
      for (final ext in extensions) {
        try {
          final ref = _storage.ref().child('avatars/$safeUserId$ext');
          await ref.delete();
          deleted = true;
          developer.log('✅ [Storage] Deleted: avatars/$safeUserId$ext');
        } catch (e) {
          // File with this extension doesn't exist, continue
        }
      }
      
      if (deleted) {
        developer.log('✅ [Storage] Avatar deleted successfully');
      } else {
        developer.log('⚠️ [Storage] No avatar found to delete');
      }
      
      return deleted;
    } catch (e) {
      developer.log('⚠️ [Storage] Avatar delete failed: $e');
      return false;
    }
  }

  /// Delete scan images from Firebase Storage
  static Future<bool> deleteScanImages(String scanId) async {
    try {
      developer.log('🗑️ [Storage] Deleting scan images for: $scanId');
      
      final safeScanId = _sanitizeScanId(scanId);
      final extensions = ['.jpg', '.jpeg', '.png', '.webp'];
      bool deleted = false;
      
      for (final ext in extensions) {
        try {
          final frontRef = _storage.ref().child('scans/$safeScanId/front$ext');
          final backRef = _storage.ref().child('scans/$safeScanId/back$ext');
          
          await Future.wait([
            frontRef.delete(),
            backRef.delete(),
          ]);
          deleted = true;
          developer.log('✅ [Storage] Deleted scan images with extension: $ext');
        } catch (e) {
          // Files with this extension don't exist, continue
        }
      }
      
      if (deleted) {
        developer.log('✅ [Storage] Scan images deleted successfully');
      } else {
        developer.log('⚠️ [Storage] No scan images found to delete');
      }
      
      return deleted;
    } catch (e) {
      developer.log('⚠️ [Storage] Scan delete failed: $e');
      return false;
    }
  }

  /// Get download URL for an existing avatar
  static Future<String?> getAvatarUrl(String userId) async {
    try {
      final safeUserId = _sanitizeScanId(userId);
      final extensions = ['.jpg', '.jpeg', '.png', '.webp'];
      
      for (final ext in extensions) {
        try {
          final ref = _storage.ref().child('avatars/$safeUserId$ext');
          final url = await ref.getDownloadURL();
          return url;
        } catch (e) {
          // Try next extension
        }
      }
      
      developer.log('⚠️ [Storage] Avatar not found for user: $userId');
      return null;
    } catch (e) {
      developer.log('⚠️ [Storage] Error getting avatar URL: $e');
      return null;
    }
  }

  /// Check if avatar exists for a user
  static Future<bool> avatarExists(String userId) async {
    try {
      final safeUserId = _sanitizeScanId(userId);
      final extensions = ['.jpg', '.jpeg', '.png', '.webp'];
      
      for (final ext in extensions) {
        try {
          final ref = _storage.ref().child('avatars/$safeUserId$ext');
          await ref.getMetadata();
          return true;
        } catch (e) {
          // Try next extension
        }
      }
      
      return false;
    } catch (e) {
      return false;
    }
  }

  /// Get metadata for uploaded avatar
  static Future<Map<String, dynamic>?> getAvatarMetadata(String userId) async {
    try {
      final safeUserId = _sanitizeScanId(userId);
      final extensions = ['.jpg', '.jpeg', '.png', '.webp'];
      
      for (final ext in extensions) {
        try {
          final ref = _storage.ref().child('avatars/$safeUserId$ext');
          final metadata = await ref.getMetadata();
          
          return {
            'size': metadata.size,
            'contentType': metadata.contentType,
            'timeCreated': metadata.timeCreated,
            'updated': metadata.updated,
            'downloadUrl': await ref.getDownloadURL(),
          };
        } catch (e) {
          // Try next extension
        }
      }
      
      developer.log('⚠️ [Storage] No avatar metadata found');
      return null;
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
        developer.log('🔑 [Auth] Has valid access token: ✅');
      } else {
        developer.log('⚠️ [Auth] Not authenticated - Anonymous uploads may be rejected');
        developer.log('💡 [Auth] Token missing: Make sure user is logged in');
      }
    } catch (e) {
      developer.log('❌ [Auth] Error checking auth status: $e');
    }
  }

  /// Helper to log Firebase Storage debugging information
  static Future<void> _logStorageDebugInfo() async {
    try {
      developer.log('🔍 [Debug] Firebase Storage Info:');
      developer.log('   Bucket: ${_storage.bucket}');
      developer.log('   Max Upload Retry: ${_storage.maxUploadRetryTime}');
      developer.log('   Max Download Retry: ${_storage.maxDownloadRetryTime}');
      developer.log('   Max Operation Retry: ${_storage.maxOperationRetryTime}');
    } catch (e) {
      developer.log('❌ [Debug] Could not retrieve storage info: $e');
    }
  }
}
