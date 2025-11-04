import 'package:flutter/material.dart';
import 'package:location/location.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../services/gps_service.dart';
import '../themes/app_colors.dart' as app_colors;
import '../widgets/app_buttons.dart';
import '../widgets/gradient_header_app_bar.dart';
import '../widgets/navigation_bar.dart';
import '../services/firestore_service.dart';
import '../services/remote_config_service.dart';
import '../widgets/feature_disabled_screen.dart';
import '../utils/tab_history.dart';

class LocationPage extends StatefulWidget {
  const LocationPage({super.key});

  @override
  State<LocationPage> createState() => _LocationPageState();
}

class _LocationPageState extends State<LocationPage> {
  final GpsService _gpsService = GpsService();
  GoogleMapController? _mapController;

  // Location state
  LocationData? _currentLocation;
  String _locationStatus = 'Location not available';
  bool _isLoading = false;
  bool _isTrackingLocation = false;

  @override
  void initState() {
    super.initState();
    _checkLocationPermissions();
  }

  // Check initial permissions and services
  void _checkLocationPermissions() async {
    setState(() {
      _locationStatus = 'Checking permissions...';
    });

    bool serviceEnabled = await _gpsService.isLocationServiceEnabled();
    bool hasPermission = await _gpsService.hasLocationPermission();

    if (!serviceEnabled) {
      setState(() {
        _locationStatus =
            'Location service is disabled. Please enable it in settings.';
      });
    } else if (!hasPermission) {
      setState(() {
        _locationStatus =
            'Location permission denied. Please grant permission.';
      });
    } else {
      setState(() {
        _locationStatus = 'Ready to get location';
      });
    }
  }

  // Get current location once
  void _getCurrentLocation() async {
    setState(() {
      _isLoading = true;
      _locationStatus = 'Getting current location...';
    });

    try {
      LocationData? location = await _gpsService.getCurrentLocation();

      if (location != null) {
        setState(() {
          _currentLocation = location;
          _locationStatus = 'Location updated successfully!';
          _isLoading = false;
        });

        // Move map to current location
        if (_mapController != null &&
            location.latitude != null &&
            location.longitude != null) {
          _mapController!.animateCamera(
            CameraUpdate.newCameraPosition(
              CameraPosition(
                target: LatLng(location.latitude!, location.longitude!),
                zoom: 15.0,
              ),
            ),
          );
        }
        await FirestoreService.saveUserLocation(
          location.latitude!,
          location.longitude!,
        );
      } else {
        setState(() {
          _locationStatus =
              'Failed to get location. Check permissions and GPS.';
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _locationStatus = 'Error: $e';
        _isLoading = false;
      });
    }
  }

  // Start/stop real-time location tracking
  void _toggleLocationTracking() {
    setState(() {
      _isTrackingLocation = !_isTrackingLocation;
    });

    if (_isTrackingLocation) {
      _startLocationTracking();
    } else {
      _stopLocationTracking();
    }
  }

  void _startLocationTracking() {
    setState(() {
      _locationStatus = 'Tracking location in real-time...';
    });

    _gpsService.getLocationStream().listen((LocationData location) {
      setState(() {
        _currentLocation = location;
        _locationStatus = 'Location tracking active';
      });

      // Update map camera when we get new location
      if (_mapController != null &&
          location.latitude != null &&
          location.longitude != null) {
        _mapController!.animateCamera(
          CameraUpdate.newLatLng(
            LatLng(location.latitude!, location.longitude!),
          ),
        );
      }
    });
  }

  void _stopLocationTracking() {
    setState(() {
      _locationStatus = 'Location tracking stopped';
    });
  }

  // Format coordinates for display
  String _formatCoordinate(double? coord, String type) {
    if (coord == null) return 'N/A';
    return '$type: ${coord.toStringAsFixed(6)}°';
  }

  @override
  Widget build(BuildContext context) {
    //Feature disable checker
    if (RemoteConfigService.isFeatureDisabled('disable_maps_page')) {
      return FeatureDisabledScreen(
        featureName: 'Maps',
        icon: Icons.navigation,
        selectedNavIndex: 3,
        navBarRole: NavBarRole.user,
      );
    }

    return WillPopScope(
      onWillPop: () async {
        final prev = TabHistory.instance.popAndGetPrevious();
        if (prev != null && prev >= 0 && prev < AppBottomNavBar.routes.length) {
          Navigator.pushReplacementNamed(context, AppBottomNavBar.routes[prev]);
          return false;
        }
        return true;
      },
      child: Scaffold(
        appBar: GradientHeaderAppBar(
          showBackButton: false,
          showBranding: true, // Show simplified branding
        ),
        body: SingleChildScrollView(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Location Status Card
              Card(
                elevation: 4,
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    children: [
                      Icon(
                        _currentLocation != null
                            ? LucideIcons.mapPin
                            : LucideIcons.mapPinOff,
                        size: 48,
                        color: _currentLocation != null
                            ? app_colors.AppColors.success
                            : app_colors.AppColors.muted,
                      ),
                      const SizedBox(height: 12),
                      Text(
                        _locationStatus,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 16,
                          color: _currentLocation != null
                              ? app_colors.AppColors.success
                              : app_colors.AppColors.text,
                        ),
                      ),
                      if (_isLoading)
                        const Padding(
                          padding: EdgeInsets.only(top: 16),
                          child: CircularProgressIndicator(),
                        ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 20),

              // Google Maps Widget
              Card(
                elevation: 3,
                child: Container(
                  height: 250,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: GoogleMap(
                      initialCameraPosition: CameraPosition(
                        target: LatLng(
                          14.5995,
                          120.9842,
                        ), // Default to Philippines center
                        zoom: 6.0,
                      ),
                      onMapCreated: (GoogleMapController controller) {
                        _mapController = controller;

                        // If we already have location when map is created, move to it
                        if (_currentLocation != null &&
                            _currentLocation!.latitude != null &&
                            _currentLocation!.longitude != null) {
                          Future.delayed(Duration(milliseconds: 500), () {
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
                      markers:
                          _currentLocation != null &&
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
                                  title: 'Current Location',
                                  snippet:
                                      'Lat: ${_currentLocation!.latitude?.toStringAsFixed(6)}, Lng: ${_currentLocation!.longitude?.toStringAsFixed(6)}',
                                ),
                                icon: BitmapDescriptor.defaultMarkerWithHue(
                                  BitmapDescriptor.hueRed,
                                ),
                              ),
                            }
                          : {},
                      myLocationEnabled: false, // Disable to avoid conflicts
                      myLocationButtonEnabled:
                          false, // We'll use our own buttons
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

              const SizedBox(height: 20),

              // Location Details Card
              if (_currentLocation != null) ...[
                Card(
                  elevation: 2,
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Current Location',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: app_colors.AppColors.primary,
                          ),
                        ),
                        const SizedBox(height: 16),
                        _buildLocationDetail(
                          'Latitude',
                          _formatCoordinate(_currentLocation!.latitude, 'Lat'),
                          LucideIcons.navigation,
                        ),
                        const Divider(),
                        _buildLocationDetail(
                          'Longitude',
                          _formatCoordinate(_currentLocation!.longitude, 'Lng'),
                          LucideIcons.navigation,
                        ),
                        if (_currentLocation!.accuracy != null) ...[
                          const Divider(),
                          _buildLocationDetail(
                            'Accuracy',
                            '±${_currentLocation!.accuracy!.toStringAsFixed(1)}m',
                            LucideIcons.target,
                          ),
                        ],
                        if (_currentLocation!.altitude != null) ...[
                          const Divider(),
                          _buildLocationDetail(
                            'Altitude',
                            '${_currentLocation!.altitude!.toStringAsFixed(1)}m',
                            LucideIcons.mountain,
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 20),
              ],

              // Action Buttons
              AppButtons.main(
                text: _isLoading
                    ? 'Getting Location...'
                    : 'Get Current Location',
                size: 54,
                textColor: app_colors.AppColors.white,
                color: app_colors.AppColors.primary,
                icon: Icon(
                  _isLoading ? Icons.hourglass_empty : LucideIcons.crosshair,
                  color: app_colors.AppColors.white,
                ),
                onPressed: _isLoading ? null : _getCurrentLocation,
              ),

              const SizedBox(height: 12),

              AppButtons.outline(
                text: _isTrackingLocation
                    ? 'Stop Location Tracking'
                    : 'Start Location Tracking',
                size: 54,
                textColor: _isTrackingLocation
                    ? app_colors.AppColors.error
                    : app_colors.AppColors.primary,
                outlineColor: _isTrackingLocation
                    ? app_colors.AppColors.error
                    : app_colors.AppColors.primary,
                icon: Icon(
                  _isTrackingLocation ? LucideIcons.square : LucideIcons.play,
                  color: _isTrackingLocation
                      ? app_colors.AppColors.error
                      : app_colors.AppColors.primary,
                ),
                onPressed: _toggleLocationTracking,
              ),

              const SizedBox(height: 40),

              // Info Card
              Card(
                color: app_colors.AppColors.neutral,
                child: Padding(
                  padding: const EdgeInsets.all(12.0),
                  child: Row(
                    children: [
                      Icon(
                        LucideIcons.info,
                        color: app_colors.AppColors.primary,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'Make sure GPS is enabled and you have granted location permissions for accurate results.',
                          style: TextStyle(
                            fontSize: 14,
                            color: app_colors.AppColors.text,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
        bottomNavigationBar: AppBottomNavBar(
          selectedIndex: 3, // Maps is at index 3
          role: NavBarRole.user,
        ),
      ),
    );
  }

  Widget _buildLocationDetail(String label, String value, IconData icon) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        children: [
          Icon(icon, size: 20, color: app_colors.AppColors.primary),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 14,
                    color: app_colors.AppColors.muted,
                  ),
                ),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
