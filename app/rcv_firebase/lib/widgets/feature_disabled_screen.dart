import 'package:flutter/material.dart';
import 'navigation_bar.dart';
import 'gradient_header_app_bar.dart';

class FeatureDisabledScreen extends StatelessWidget {
  final String featureName;
  final String? message;
  final IconData? icon;
  final int? selectedNavIndex;
  final NavBarRole? navBarRole;

  const FeatureDisabledScreen({
    super.key,
    required this.featureName,
    this.message,
    this.icon,
    this.selectedNavIndex,
    this.navBarRole,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: GradientHeaderAppBar(showBackButton: false, showBranding: true),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon ?? Icons.block, size: 80, color: Colors.grey[400]),
              const SizedBox(height: 24),
              Text(
                'Feature Temporarily Disabled',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: Colors.grey[800],
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              Text(
                featureName,
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  color: const Color(0xFF005440),
                  fontWeight: FontWeight.w600,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              Text(
                message ??
                    'This feature is currently unavailable for maintenance. Please check back later or contact support if you need assistance.',
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: Colors.grey[600],
                  height: 1.5,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
      bottomNavigationBar: (selectedNavIndex != null && navBarRole != null)
          ? AppBottomNavBar(selectedIndex: selectedNavIndex!, role: navBarRole!)
          : null,
    );
  }
}
