import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:rcv_firebase/themes/app_colors.dart' as app_colors;
import '../utils/tab_history.dart';

enum NavBarRole { admin, user }

class AppBottomNavBar extends StatelessWidget {
  final int selectedIndex;
  final NavBarRole role;

  const AppBottomNavBar({
    super.key,
    required this.selectedIndex,
    required this.role,
  });

  // Simplified to user-only routes with Google Maps
  static const List<String> routes = [
    '/user-home',
    '/user-audit-trail',
    '/scanning',
    '/location', // Google Maps
    '/user-profile',
  ];

  void _onTabSelected(BuildContext context, int index) {
    // Only navigate if the index is valid and within bounds
    if (index >= 0 && index < routes.length) {
      final targetRoute = routes[index];
      final currentRoute = ModalRoute.of(context)?.settings.name;

      // Only navigate if we're not already on the target route
      if (currentRoute != targetRoute) {
        TabHistory.instance.visit(index);
        Navigator.pushReplacementNamed(context, targetRoute);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    // Keep a simple history of visited tabs for back button handling
    TabHistory.instance.visit(selectedIndex);
    return BottomNavigationBar(
      type: BottomNavigationBarType.fixed,
      selectedItemColor: app_colors.AppColors.primary,
      unselectedItemColor: app_colors.AppColors.muted,
      currentIndex: selectedIndex,
      onTap: (index) => _onTabSelected(context, index),
      items: [
        BottomNavigationBarItem(
          icon: Icon(
            Icons.home,
            color: selectedIndex == 0
                ? app_colors.AppColors.primary
                : app_colors.AppColors.muted,
          ),
          label: 'Home',
        ),
        BottomNavigationBarItem(
          icon: Icon(
            Icons.history,
            color: selectedIndex == 1
                ? app_colors.AppColors.primary
                : app_colors.AppColors.muted,
          ),
          label: 'Audit',
        ),
        BottomNavigationBarItem(
          icon: Container(
            width: 66,
            height: 66,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: app_colors.AppColors.primary,
            ),
            padding: const EdgeInsets.all(12),
            child: Icon(LucideIcons.scan, color: Colors.white, size: 24),
          ),
          label: '',
        ),
        BottomNavigationBarItem(
          icon: Icon(
            Icons.map,
            color: selectedIndex == 3
                ? app_colors.AppColors.primary
                : app_colors.AppColors.muted,
          ),
          label: 'Maps',
        ),
        BottomNavigationBarItem(
          icon: Icon(
            Icons.person,
            color: selectedIndex == 4
                ? app_colors.AppColors.primary
                : app_colors.AppColors.muted,
          ),
          label: 'Profile',
        ),
      ],
    );
  }
}
