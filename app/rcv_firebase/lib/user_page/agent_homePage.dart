import 'package:flutter/material.dart';
import 'package:location/location.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../widgets/gradient_header_app_bar.dart';
import '../widgets/navigation_bar.dart';
import '../services/gps_service.dart';
import '../services/firestore_service.dart';
import 'dart:async';
import 'dart:io';
import '../services/remote_config_service.dart';
import '../widgets/feature_disabled_screen.dart';

class UserHomePage extends StatefulWidget {
  const UserHomePage({super.key});

  @override
  State<UserHomePage> createState() => _UserHomePageState();
}

class _UserHomePageState extends State<UserHomePage> {
  final int _selectedIndex = 0;

  final List<Widget> _pages = [const HomeContent()];

  @override
  
  Widget build(BuildContext context) {

    //Feature disable checker
    if (RemoteConfigService.isFeatureDisabled('disable_home_page')) {
      return FeatureDisabledScreen(
        featureName: 'Home',
        icon: Icons.home,
        selectedNavIndex: _selectedIndex,
        navBarRole: NavBarRole.user,
      );
    }
    return Scaffold(
      appBar: GradientHeaderAppBar(
        showBackButton: false,
        showBranding: true, // Show simplified branding
      ),
      body: _pages[_selectedIndex],
      bottomNavigationBar: AppBottomNavBar(
        selectedIndex: _selectedIndex,
        role: NavBarRole.user,
      ),
    );
  }
}

// Home Content Widget - Now displays Maps
class HomeContent extends StatefulWidget {
  const HomeContent({super.key});

  @override
  State<HomeContent> createState() => _HomeContentState();
}

class _HomeContentState extends State<HomeContent> {
  final GpsService _gpsService = GpsService();
  GoogleMapController? _mapController;
  
  // Location state
  LocationData? _currentLocation;
  bool _isConnected = true;
  bool _isChecking = true;

  @override
  void initState() {
    super.initState();
    _checkInternetConnection();
    _getCurrentLocation();
  }

  Future<void> _checkInternetConnection() async {
    setState(() => _isChecking = true);
    
    try {
      final result = await InternetAddress.lookup('google.com')
          .timeout(const Duration(seconds: 5));
      setState(() {
        _isConnected = result.isNotEmpty && result[0].rawAddress.isNotEmpty;
        _isChecking = false;
      });
    } catch (e) {
      setState(() {
        _isConnected = false;
        _isChecking = false;
      });
    }
  }

  // Get current location
  void _getCurrentLocation() async {
    try {
      LocationData? location = await _gpsService.getCurrentLocation();
      
      if (location != null) {
        setState(() {
          _currentLocation = location;
        });
        
        // Move map to current location
        if (_mapController != null && location.latitude != null && location.longitude != null) {
          _mapController!.animateCamera(
            CameraUpdate.newCameraPosition(
              CameraPosition(
                target: LatLng(location.latitude!, location.longitude!),
                zoom: 15.0,
              ),
            ),
          );
        }
        
        // Save location to Firestore
        if (location.latitude != null && location.longitude != null) {
          await FirestoreService.saveUserLocation(
            location.latitude!, 
            location.longitude!
          );
        }
      }
    } catch (e) {
      // Silently handle location errors
    }
  }

  @override
  void dispose() {
    _mapController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Internet Connection Status Card
        Padding(
          padding: const EdgeInsets.all(16.0),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 300),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: _isChecking
                  ? Colors.grey[200]
                  : _isConnected
                      ? Colors.green[50]
                      : Colors.red[50],
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: _isChecking
                    ? Colors.grey[300]!
                    : _isConnected
                        ? Colors.green
                        : Colors.red,
                width: 1,
              ),
            ),
            child: Row(
              children: [
                Icon(
                  _isChecking
                      ? Icons.wifi_find
                      : _isConnected
                          ? Icons.wifi
                          : Icons.wifi_off,
                  color: _isChecking
                      ? Colors.grey[600]
                      : _isConnected
                          ? Colors.green
                          : Colors.red,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    _isChecking
                        ? 'Checking connection...'
                        : _isConnected
                            ? 'Connected to Internet'
                            : 'No Internet Connection',
                    style: TextStyle(
                      fontWeight: FontWeight.w500,
                      color: _isChecking
                          ? Colors.grey[700]
                          : _isConnected
                              ? Colors.green[800]
                              : Colors.red[800],
                    ),
                  ),
                ),
                if (!_isConnected && !_isChecking)
                  TextButton.icon(
                    onPressed: _checkInternetConnection,
                    icon: const Icon(Icons.refresh, size: 18),
                    label: const Text('Retry'),
                    style: TextButton.styleFrom(
                      foregroundColor: Colors.red[700],
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
        
        // Google Maps Widget
        Expanded(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: GoogleMap(
                initialCameraPosition: const CameraPosition(
                  target: LatLng(14.5995, 120.9842), // Default to Philippines center
                  zoom: 6.0,
                ),
                onMapCreated: (GoogleMapController controller) {
                  _mapController = controller;
                  
                  // If we already have location when map is created, move to it
                  if (_currentLocation != null && 
                      _currentLocation!.latitude != null && 
                      _currentLocation!.longitude != null) {
                    Future.delayed(const Duration(milliseconds: 500), () {
                      controller.animateCamera(
                        CameraUpdate.newCameraPosition(
                          CameraPosition(
                            target: LatLng(
                              _currentLocation!.latitude!,
                              _currentLocation!.longitude!,
                            ),
                            zoom: 15.0,
                          ),
                        ),
                      );
                    });
                  }
                },
                markers: _currentLocation != null &&
                    _currentLocation!.latitude != null &&
                    _currentLocation!.longitude != null
                    ? {
                        Marker(
                          markerId: const MarkerId('current_location'),
                          position: LatLng(
                            _currentLocation!.latitude!,
                            _currentLocation!.longitude!,
                          ),
                          infoWindow: InfoWindow(
                            title: 'Your Location',
                            snippet: 'Lat: ${_currentLocation!.latitude?.toStringAsFixed(6)}, Lng: ${_currentLocation!.longitude?.toStringAsFixed(6)}',
                          ),
                          icon: BitmapDescriptor.defaultMarkerWithHue(
                            BitmapDescriptor.hueGreen,
                          ),
                        ),
                      }
                    : {},
                myLocationEnabled: true,
                myLocationButtonEnabled: true,
                zoomControlsEnabled: true,
                mapType: MapType.normal,
                compassEnabled: true,
                tiltGesturesEnabled: true,
                scrollGesturesEnabled: true,
                zoomGesturesEnabled: true,
                rotateGesturesEnabled: true,
              ),
            ),
          ),
        ),
      ],
    );
  }
}
