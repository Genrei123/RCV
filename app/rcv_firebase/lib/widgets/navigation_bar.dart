import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:rcv_firebase/themes/app_colors.dart' as app_colors;

enum NavBarRole { admin, user }

class AppBottomNavBar extends StatelessWidget {
  final int selectedIndex;
  final NavBarRole role;

  const AppBottomNavBar({
    super.key,
    required this.selectedIndex,
    required this.role,
  });

  void _onTabSelected(BuildContext context, int index) {
    // Define allowed routes based on role
    final routes = role == NavBarRole.admin
        ? [
            '/admin-home',
            '/admin-audit-trail',
            '/admin-scanning',
            '/admin-reports',
            '/user-profile', // Shared profile page
          ]
        : [
            '/user-home',
            '/user-audit-trail',
            '/user-scanning',
            '/user-reports',
            '/user-profile', // Shared profile page
          ];

    // Only navigate if the index is valid and within bounds
    if (index >= 0 && index < routes.length) {
      Navigator.pushReplacementNamed(context, routes[index]);
    }
  }

  @override
  Widget build(BuildContext context) {
    // Define navigation items based on role
    final items = role == NavBarRole.admin
        ? [
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
              label: 'Audit Trail',
            ),
            BottomNavigationBarItem(
              icon: Container(
                width: 66,
                height: 66,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: selectedIndex == 2
                      ? app_colors.AppColors.primary
                      : app_colors.AppColors.primary,
                ),
                padding: const EdgeInsets.all(12),
                child: Icon(LucideIcons.scan, color: Colors.white, size: 24),
              ),
              label: '',
            ),
            BottomNavigationBarItem(
              icon: Icon(
                Icons.flag,
                color: selectedIndex == 3
                    ? app_colors.AppColors.primary
                    : app_colors.AppColors.muted,
              ),
              label: 'Reports',
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
          ]
        : [
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
                  color: selectedIndex == 2
                      ? app_colors.AppColors.primary
                      : app_colors.AppColors.primary,
                ),
                padding: const EdgeInsets.all(12),
                child: Icon(LucideIcons.scan, color: Colors.white, size: 24),
              ),
              label: '',
            ),
            BottomNavigationBarItem(
              icon: Icon(
                Icons.flag,
                color: selectedIndex == 3
                    ? app_colors.AppColors.primary
                    : app_colors.AppColors.muted,
              ),
              label: 'Reports',
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
          ];

    return BottomNavigationBar(
      type: BottomNavigationBarType.fixed,
      selectedItemColor: app_colors.AppColors.primary,
      items: items,
      currentIndex: selectedIndex,
      onTap: (index) => _onTabSelected(context, index),
    );
  }
}
