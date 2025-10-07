import 'package:location/location.dart';
import 'dart:developer' as developer;

class GpsService {
  final Location _location = Location();
  
  Future<bool> isLocationServiceEnabled() async {
    bool serviceEnabled = await _location.serviceEnabled();
    if (!serviceEnabled) {
      serviceEnabled = await _location.requestService();
    }
    return serviceEnabled;
  }
  
  Future<bool> hasLocationPermission() async {
    PermissionStatus permissionGranted = await _location.hasPermission();
    
    if (permissionGranted == PermissionStatus.denied) {
      permissionGranted = await _location.requestPermission();
    }
    
    return permissionGranted == PermissionStatus.granted;
  }
  
  Future<LocationData?> getCurrentLocation() async {
    try {
      bool serviceEnabled = await isLocationServiceEnabled();
      if (!serviceEnabled) {
        developer.log('Location service is not enabled');
        return null;
      }
      
      bool hasPermission = await hasLocationPermission();
      if (!hasPermission) {
        developer.log('Location permission denied');
        return null;
      }
      
      LocationData locationData = await _location.getLocation();
      developer.log('Location: ${locationData.latitude}, ${locationData.longitude}');
      
      return locationData;
    } catch (e) {
      developer.log('Error getting location: $e');
      return null;
    }
  }
  
  Stream<LocationData> getLocationStream() {
    return _location.onLocationChanged;
  }
}