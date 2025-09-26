import 'package:flutter/material.dart';
import 'package:location/location.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../services/gps_service.dart';
import '../themes/app_colors.dart' as app_colors;
import '../widgets/app_buttons.dart';
import '../widgets/gradient_header_app_bar.dart';

class LocationPage extends StatefulWidget {
  const LocationPage({Key? key}) : super(key: key);

  @override
  State<LocationPage> createState() => _LocationPageState();
}

class _LocationPageState extends State<LocationPage> {
  final GpsService _gpsService = GpsService();
  
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
        _locationStatus = 'Location service is disabled. Please enable it in settings.';
      });
    } else if (!hasPermission) {
      setState(() {
        _locationStatus = 'Location permission denied. Please grant permission.';
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
      } else {
        setState(() {
          _locationStatus = 'Failed to get location. Check permissions and GPS.';
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
    return '${type}: ${coord.toStringAsFixed(6)}°';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: GradientHeaderAppBar(
        greeting: 'My Location',
        user: 'GPS Service',
        onBack: () => Navigator.of(context).pop(),
      ),
      body: Padding(
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
              text: _isLoading ? 'Getting Location...' : 'Get Current Location',
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

            const Spacer(),

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
    );
  }

  Widget _buildLocationDetail(String label, String value, IconData icon) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        children: [
          Icon(
            icon,
            size: 20,
            color: app_colors.AppColors.primary,
          ),
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