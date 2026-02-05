import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class NavBarHelperOverlay extends StatefulWidget {
  final VoidCallback onComplete;

  const NavBarHelperOverlay({
    super.key,
    required this.onComplete,
  });

  @override
  State<NavBarHelperOverlay> createState() => _NavBarHelperOverlayState();

  // Check if this is first launch
  static Future<bool> isFirstLaunch() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool('has_seen_nav_helper') ?? true;
  }

  // Mark as seen
  static Future<void> markAsSeen() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('has_seen_nav_helper', false);
  }
}

class _NavBarHelperOverlayState extends State<NavBarHelperOverlay> {
  int _currentStep = 0;

  final List<NavBarItem> navBarItems = [
    NavBarItem(
      label: 'Home',
      description: 'View your dashboard and recent activities',
      index: 0,
    ),
    NavBarItem(
      label: 'Audit Trail',
      description: 'Check your verification history and logs',
      index: 1,
    ),
    NavBarItem(
      label: 'Scan',
      description: 'Scan QR codes to verify products',
      index: 2,
    ),
    NavBarItem(
      label: 'Reports',
      description: 'View and download your verification reports',
      index: 3,
    ),
    NavBarItem(
      label: 'Profile',
      description: 'Manage your account settings',
      index: 4,
    ),
  ];

  @override
  void initState() {
    super.initState();
  }

  @override
  void dispose() {
    super.dispose();
  }

  void _nextStep() async {
    if (_currentStep < navBarItems.length - 1) {
      setState(() {
        _currentStep++;
      });
    } else {
      // Mark as seen and complete
      await NavBarHelperOverlay.markAsSeen();
      widget.onComplete();
    }
  }

  void _skip() async {
    await NavBarHelperOverlay.markAsSeen();
    widget.onComplete();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        // Semi-transparent overlay - clicking advances tutorial
        GestureDetector(
          onTap: _nextStep,
          child: Container(
            color: Colors.black54,
          ),
        ),
        // Skip button positioned near Home Dashboard
        Positioned(
          top: 60,
          right: 20,
          child: _buildSkipButton(),
        ),
        // Everything with proper positioning
        Positioned.fill(
          child: Column(
            children: [
              // Top space
              const Spacer(flex: 2),
              // More space - removed control buttons
              const Spacer(flex: 2),
              // Tooltip positioned above navbar
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 8),
                child: _buildTooltip(navBarItems[_currentStep]),
              ),
              const SizedBox(height: 40),
              // Circle positioned exactly on navbar
              SizedBox(
                height: 80,
                child: _buildSpotlight(navBarItems[_currentStep]),
              ),
              const SizedBox(height: 40),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSpotlight(NavBarItem item) {
    return LayoutBuilder(
      builder: (context, constraints) {
        return Container(
          width: double.infinity,
          height: 80,
          child: Stack(
            children: [
              Positioned(
                left: _getButtonXPosition(constraints.maxWidth),
                top: 0,
                child: Container(
                  width: 70,
                  height: 70,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    // ignore: deprecated_member_use
                    color: Colors.white.withOpacity(0.1),
                    border: Border.all(
                      color: Colors.white,
                      width: 3,
                    ),
                  ),
                  child: Center(
                    child: Icon(
                      _getIconForStep(),
                      size: 28,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  double _getButtonXPosition(double screenWidth) {
    switch (_currentStep) {
      case 0: // Home - left
        return screenWidth * 0.1 - 35;
      case 1: // Audit - middle-left
        return screenWidth * 0.3 - 35;
      case 2: // Scan - center
        return screenWidth * 0.5 - 35;
      case 3: // Reports - middle-right
        return screenWidth * 0.7 - 35;
      case 4: // Profile - right
        return screenWidth * 0.9 - 35;
      default:
        return screenWidth * 0.5 - 35;
    }
  }

  IconData _getIconForStep() {
    switch (_currentStep) {
      case 0: // Home
        return Icons.home;
      case 1: // Audit Trail
        return Icons.history;
      case 2: // Scan
        return Icons.qr_code_scanner;
      case 3: // Reports
        return Icons.bar_chart;
      case 4: // Profile
        return Icons.person;
      default:
        return Icons.home;
    }
  }

  Widget _buildTooltip(NavBarItem item) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Simple speech bubble
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                item.label,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                  color: Colors.black87,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                item.description,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 13,
                  color: Colors.black54,
                  height: 1.4,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSkipButton() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.black54,
        borderRadius: BorderRadius.circular(20),
      ),
      child: TextButton(
        onPressed: _skip,
        child: const Text(
          'Skip',
          style: TextStyle(
            color: Colors.white,
            fontSize: 14,
            fontWeight: FontWeight.w500,
          ),
        ),
      ),
    );
  }
}

class NavBarItem {
  final String label;
  final String description;
  final int index;

  NavBarItem({
    required this.label,
    required this.description,
    required this.index,
  });
}
