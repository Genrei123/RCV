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

      Map<String, dynamic> locationData = {
        'latitude': latitude,
        'longitude': longitude,
      };

      print('Saving location data to Firestore...');
      bool result = await writeUserData(userId, locationData);
      print('Location save result: $result');
      
      return result;
    } catch (e) {
      print('Failed to save user location: $e');
      return false;
    }
  }
}