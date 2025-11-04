import 'package:cloud_firestore/cloud_firestore.dart';
import 'token_service.dart';

class FirestoreService {
  static final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  /// Write user data to Firestore using userId as document ID
  
  static Future<bool> writeUserData(String userId, Map<String, dynamic> userData) async {
    try {
      print('📝 [Firestore] Writing user data for ID: $userId');
      print('📄 [Firestore] Collection: users');
      print('🔑 [Firestore] Document ID: $userId');
      
      // Write to users collection with userId as document ID
      await _firestore.collection('users').doc(userId).set({
        ...userData,
        'timestamp': FieldValue.serverTimestamp(),
      }, SetOptions(merge: true)); // Use merge to update existing data
      
      print('✅ [Firestore] User data written successfully for ID: $userId');
      return true;
    } catch (e, stackTrace) {
      print('❌ [Firestore] Failed to write user data: $e');
      print('📚 [Firestore] Stack trace: $stackTrace');
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
        print('User data read successfully for ID: $userId');
        return doc.data() as Map<String, dynamic>?;
      } else {
        print('User document does not exist for ID: $userId');
        return null;
      }
    } catch (e) {
      print('Failed to read user data: $e');
      return null;
    }
  }

  /// Firestore saving
  static Future<bool> saveUserLocation(double latitude, double longitude) async {
    try {
      print('🗺️ [Firestore] Attempting to save location: lat=$latitude, lng=$longitude');
      
      // Get current user ID
      String? userId = await TokenService.getUserId();
      print('🔑 [Firestore] Current user ID: $userId');
      
      if (userId == null || userId.isEmpty) {
        print('❌ [Firestore] No user logged in - cannot save location');
        return false;
      }

      // Get user data from JWT token
      String? token = await TokenService.getAccessToken();
      print('🎫 [Firestore] Access token exists: ${token != null}');
      
      if (token == null) {
        print('❌ [Firestore] No access token found');
        return false;
      }
      
      Map<String, dynamic>? tokenData = TokenService.decodeTokenPayload(token);
      print('📋 [Firestore] Token data decoded: ${tokenData != null}');
      
      if (tokenData == null) {
        print('❌ [Firestore] Failed to decode token data');
        return false;
      }

      print('👤 [Firestore] User info - Name: ${tokenData['fullName']}, Email: ${tokenData['email']}, Role: ${tokenData['role']}');

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

      print('💾 [Firestore] Saving user data to Firestore...');
      print('📍 [Firestore] Location: ${userData['currentLocation']}');
      
      bool result = await writeUserData(userId, userData);
      
      if (result) {
        print('✅ [Firestore] User location saved successfully!');
      } else {
        print('❌ [Firestore] Failed to save user location');
      }
      
      return result;
    } catch (e, stackTrace) {
      print('❌ [Firestore] Error saving user location: $e');
      print('📚 [Firestore] Stack trace: $stackTrace');
      return false;
    }
  }
}