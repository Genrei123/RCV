import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:rcv_firebase/themes/app_colors.dart' as app_colors;
import '../admin_page/admin-profile.dart';
import '../admin_page/homePage.dart';
import '../user_page/profilePage.dart';
import '../user_page/home_page.dart';

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
    // Handle navigation based on role and index
    if (role == NavBarRole.user) {
      switch (index) {
        case 0:
          // Home - navigate to user home page
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(builder: (context) => const UserHomePage()),
          );
          break;
        case 1:
          // Audit Trail - navigate to audit trail page
          Navigator.pushNamed(context, '/user-audit-trail');
          break;
        case 2:
          // Scan - navigate to QR scanner
          Navigator.pushNamed(context, '/qr-scanner');
          break;
        case 3:
          // Reports - navigate to reports page
          Navigator.pushNamed(context, '/user-reports');
          break;
        case 4:
          // Profile - navigate to profile page
          Navigator.push(
            context,
            MaterialPageRoute(builder: (context) => const ProfilePage()),
          );
          break;
      }
    } else if (role == NavBarRole.admin) {
      switch (index) {
        case 0:
          // Home - navigate to admin home page
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(builder: (context) => const HomePage()),
          );
          break;
        case 1:
          // Audit Trail - navigate to admin audit trail
          Navigator.pushNamed(context, '/admin-audit-trail');
          break;
        case 2:
          // Scan - navigate to admin scanning page
          Navigator.pushNamed(context, '/admin-scanning');
          break;
        case 3:
          // Reports - navigate to admin reports page
          Navigator.pushNamed(context, '/admin-reports');
          break;
        case 4:
          // Profile - navigate to admin profile page
          Navigator.push(
            context,
            MaterialPageRoute(builder: (context) => const AdminProfilePage()),
          );
          break;
      }
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
                  color: app_colors.AppColors.primary,
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
                  color: app_colors.AppColors.primary,
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
