import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';

class ProfileService {
  static const String _profileDataPath = 'profile_data.json';
  
  // Load profile data from JSON file
  static Future<Map<String, dynamic>> loadProfileData() async {
    try {
      final Directory appDir = await getApplicationDocumentsDirectory();
      final File file = File('${appDir.path}/$_profileDataPath');
      
      if (await file.exists()) {
        final String jsonString = await file.readAsString();
        if (jsonString.isNotEmpty) {
          final Map<String, dynamic> data = json.decode(jsonString);
          return data['profile'] ?? {};
        }
      }
      return _getDefaultProfileData();
    } catch (e) {
      debugPrint('Error loading profile data: $e');
      return _getDefaultProfileData();
    }
  }
  
  // Save profile data to JSON file
  static Future<bool> saveProfileData(Map<String, dynamic> profileData) async {
    try {
      final Map<String, dynamic> data = {
        'profile': {
          ...profileData,
          'lastUpdated': DateTime.now().toIso8601String(),
        }
      };
      
      final String jsonString = json.encode(data);
      final Directory appDir = await getApplicationDocumentsDirectory();
      final File file = File('${appDir.path}/$_profileDataPath');
      
      // Ensure directory exists
      if (!await appDir.exists()) {
        await appDir.create(recursive: true);
      }
      
      await file.writeAsString(jsonString);
      return true;
    } catch (e) {
      debugPrint('Error saving profile data: $e');
      return false;
    }
  }
  
  // Get default profile data structure
  static Map<String, dynamic> _getDefaultProfileData() {
    return {
      'fullName': '',
      'email': '',
      'phoneNumber': '',
      'dateOfBirth': '',
      'role': 'User',
      'password': '',
      'confirmPassword': '',
      'profileImagePath': '',
      'lastUpdated': '',
    };
  }
  
  // Update specific profile field
  static Future<bool> updateProfileField(String field, dynamic value) async {
    try {
      final Map<String, dynamic> currentData = await loadProfileData();
      currentData[field] = value;
      return await saveProfileData(currentData);
    } catch (e) {
      debugPrint('Error updating profile field: $e');
      return false;
    }
  }
  
  // Clear all profile data
  static Future<bool> clearProfileData() async {
    try {
      return await saveProfileData(_getDefaultProfileData());
    } catch (e) {
      debugPrint('Error clearing profile data: $e');
      return false;
    }
  }
  
  // Check if profile data exists
  static Future<bool> hasProfileData() async {
    try {
      final Directory appDir = await getApplicationDocumentsDirectory();
      final File file = File('${appDir.path}/$_profileDataPath');
      return await file.exists();
    } catch (e) {
      debugPrint('Error checking profile data: $e');
      return false;
    }
  }
  
  // Get profile data file path
  static Future<String?> getProfileDataPath() async {
    try {
      final Directory appDir = await getApplicationDocumentsDirectory();
      return '${appDir.path}/$_profileDataPath';
    } catch (e) {
      debugPrint('Error getting profile data path: $e');
      return null;
    }
  }
  
  // Delete profile data file
  static Future<bool> deleteProfileData() async {
    try {
      final Directory appDir = await getApplicationDocumentsDirectory();
      final File file = File('${appDir.path}/$_profileDataPath');
      if (await file.exists()) {
        await file.delete();
        return true;
      }
      return false;
    } catch (e) {
      debugPrint('Error deleting profile data: $e');
      return false;
    }
  }
}
