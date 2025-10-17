import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:location/location.dart';
import 'token_service.dart';

class FirestoreService {
  static final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  /// Write user data to Firestore using userId as document ID
  
  static Future<bool> writeUserData(String userId, Map<String, dynamic> userData) async {
    try {
      // Write to users collection with userId as document ID
      await _firestore.collection('users').doc(userId).set({
        ...userData,
        'timestamp': FieldValue.serverTimestamp(),
      });
      
      print('User data written successfully for ID: $userId');
      return true;
    } catch (e) {
      print('Failed to write user data: $e');
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
      print(' Attempting to save location: lat=$latitude, lng=$longitude');
      
      // Get current user ID
      String? userId = await TokenService.getUserId();
      print(' Current user ID: $userId');
      
      if (userId == null) {
        print(' No user logged in - cannot save location');
        return false;
      }

      // Get user data from JWT token
      String? token = await TokenService.getAccessToken();
      Map<String, dynamic>? tokenData = token != null ? TokenService.decodeTokenPayload(token) : null;

      Map<String, dynamic> userData = {
        if (tokenData != null) ...{
          '_id': tokenData['sub'],
          'role': tokenData['role'],
          'status': tokenData['status'],
          'avatarUrl': 'assets/avatar.png',
          'firstName': tokenData['firstName'],
          'middleName': null,
          'lastName': tokenData['lastName'],
          'extName': null,
          'fullName': tokenData['fullName'],
          'email': tokenData['email'],
          'location': null,
          'currentLocation': {
            'latitude': latitude,
            'longitude': longitude,
          },
          'dateOfBirth': null,
          'phoneNumber': null,
          'badgeId': tokenData['badgeId'],
          'createdAt': DateTime.now().toIso8601String(),
          'updatedAt': DateTime.now().toIso8601String(),
        }
      };

      print('Saving user data to Firestore...');
      bool result = await writeUserData(userId, userData);
      print('User data save result: $result');
      
      return result;
    } catch (e) {
      print('Failed to save user location: $e');
      return false;
    }
  }
}