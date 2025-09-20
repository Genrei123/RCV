import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:rcv_firebase/themes/app_colors.dart' as app_colors;

class AdminBottomNavBar extends StatelessWidget {
  final int selectedIndex;
  const AdminBottomNavBar({super.key, required this.selectedIndex});

  void _onTabSelected(BuildContext context, int index) {
    switch (index) {
      case 0:
        Navigator.pushReplacementNamed(context, '/admin-home');
        break;
      case 1:
        Navigator.pushReplacementNamed(context, '/admin-audit-trail');
        break;
      case 2:
        Navigator.pushReplacementNamed(context, '/admin-scanning');
        break;
      case 3:
        Navigator.pushReplacementNamed(context, '/admin-reports');
        break;
      case 4:
        Navigator.pushReplacementNamed(context, '/user-profile');
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    return BottomNavigationBar(
      type: BottomNavigationBarType.fixed,
      selectedItemColor: app_colors.AppColors.primary,
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
            child: Icon(
              LucideIcons.scan,
              color: selectedIndex == 3 ? Colors.white : Colors.white,
              size: 24,
            ),
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
          label: 'User Reports',
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
      currentIndex: selectedIndex,
      onTap: (index) => _onTabSelected(context, index),
    );
  }
}
