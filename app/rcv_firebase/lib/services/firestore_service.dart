import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';
import 'token_service.dart';

class FirestoreService {
  static final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  /// Write user data to Firestore using userId as document ID
  
  static Future<bool> writeUserData(String userId, Map<String, dynamic> userData) async {
    try {
      debugPrint('📝 [Firestore] Writing user data for ID: $userId');
      debugPrint('📄 [Firestore] Collection: users');
      debugPrint('🔑 [Firestore] Document ID: $userId');
      
      // Write to users collection with userId as document ID
      await _firestore.collection('users').doc(userId).set({
        ...userData,
        'timestamp': FieldValue.serverTimestamp(),
      }, SetOptions(merge: true)); // Use merge to update existing data
      
      debugPrint('✅ [Firestore] User data written successfully for ID: $userId');
      return true;
    } catch (e, stackTrace) {
      debugPrint('❌ [Firestore] Failed to write user data: $e');
      debugPrint('📚 [Firestore] Stack trace: $stackTrace');
      return false;
    }
  }

  /// Read user data from Firestore using userId
  static Future<Map<String, dynamic>?> readUserData(String userId) async {
    try {
      DocumentSnapshot doc = await _firestore
          .collection('users')
          .doc(userId)
          .get();
      
      if (doc.exists) {
        debugPrint('User data read successfully for ID: $userId');
        return doc.data() as Map<String, dynamic>?;
      } else {
        debugPrint('User document does not exist for ID: $userId');
        return null;
      }
    } catch (e) {
      debugPrint('Failed to read user data: $e');
      return null;
    }
  }

  /// Firestore saving
  static Future<bool> saveUserLocation(double latitude, double longitude) async {
    try {
      debugPrint('🗺️ [Firestore] Attempting to save location: lat=$latitude, lng=$longitude');
      
      // Get current user ID
      String? userId = await TokenService.getUserId();
      debugPrint('🔑 [Firestore] Current user ID: $userId');
      
      if (userId == null || userId.isEmpty) {
        debugPrint('❌ [Firestore] No user logged in - cannot save location');
        return false;
      }

      // Get user data from JWT token
      String? token = await TokenService.getAccessToken();
      debugPrint('🎫 [Firestore] Access token exists: ${token != null}');
      
      if (token == null) {
        debugPrint('❌ [Firestore] No access token found');
        return false;
      }
      
      Map<String, dynamic>? tokenData = TokenService.decodeTokenPayload(token);
      debugPrint('📋 [Firestore] Token data decoded: ${tokenData != null}');
      
      if (tokenData == null) {
        debugPrint('❌ [Firestore] Failed to decode token data');
        return false;
      }

      debugPrint('👤 [Firestore] User info - Name: ${tokenData['fullName']}, Email: ${tokenData['email']}, Role: ${tokenData['role']}');

      Map<String, dynamic> userData = {
        '_id': tokenData['sub'],
        'role': tokenData['role'],
        'status': tokenData['status'],
        'avatarUrl': tokenData['avatarUrl'] ?? 'assets/avatar.png',
        'firstName': tokenData['firstName'],
        'middleName': tokenData['middleName'],
        'lastName': tokenData['lastName'],
        'extName': tokenData['extName'],
        'fullName': tokenData['fullName'],
        'email': tokenData['email'],
        'location': tokenData['location'],
        'currentLocation': {
          'latitude': latitude,
          'longitude': longitude,
        },
        'dateOfBirth': tokenData['dateOfBirth'],
        'phoneNumber': tokenData['phoneNumber'],
        'badgeId': tokenData['badgeId'],
        'createdAt': tokenData['createdAt'] ?? DateTime.now().toIso8601String(),
        'updatedAt': DateTime.now().toIso8601String(),
      };

      debugPrint('💾 [Firestore] Saving user data to Firestore...');
      debugPrint('📍 [Firestore] Location: ${userData['currentLocation']}');
      
      bool result = await writeUserData(userId, userData);
      
      if (result) {
        debugPrint('✅ [Firestore] User location saved successfully!');
      } else {
        debugPrint('❌ [Firestore] Failed to save user location');
      }
      
      return result;
    } catch (e, stackTrace) {
      debugPrint('❌ [Firestore] Error saving user location: $e');
      debugPrint('📚 [Firestore] Stack trace: $stackTrace');
      return false;
    }
  }

  /// Check Firestore connectivity by attempting a simple read
  static Future<bool> checkFirestoreConnection() async {
    try {
      debugPrint('🔍 [Firestore] Checking connection...');
      // Try to access Firestore with a timeout
      await _firestore
          .collection('_test')
          .doc('_ping')
          .get()
          .timeout(const Duration(seconds: 5));
      debugPrint('✅ [Firestore] Connection check successful');
      return true;
    } catch (e) {
      debugPrint('❌ [Firestore] Connection check failed: $e');
      rethrow;
    }
  }
}
