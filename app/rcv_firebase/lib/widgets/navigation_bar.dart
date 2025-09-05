import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:rcv_firebase/themes/app_colors.dart' as app_colors;


class CustomBottomNavBar extends StatelessWidget {
  final int selectedIndex;
  final ValueChanged<int> onTap;
  const CustomBottomNavBar({
    super.key,
    required this.selectedIndex,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return BottomNavigationBar(
      type: BottomNavigationBarType.fixed,
      selectedItemColor: app_colors.AppColors.primary,
      items: [
        BottomNavigationBarItem(
          icon: Icon(
            Icons.home,
            color: selectedIndex == 0 ? app_colors.AppColors.primary : app_colors.AppColors.muted,
          ),
          label: 'Home',
        ),
        BottomNavigationBarItem(
          icon: Icon(
            Icons.history,
            color: selectedIndex == 1 ? app_colors.AppColors.primary : app_colors.AppColors.muted,
          ),
          label: 'History',
        ),
        BottomNavigationBarItem(
          icon: Container(
            width: 66,
            height: 66,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: selectedIndex == 2 ? app_colors.AppColors.primary : app_colors.AppColors.primary,
            ),
            padding: const EdgeInsets.all(12),
            child: Icon(
              LucideIcons.scan,
              color: selectedIndex == 2 ? Colors.white : Colors.white,
              size: 24,
            ),
          ),
          label: '',
        ),
        BottomNavigationBarItem(
          icon: Icon(
            Icons.add,
            color: selectedIndex == 3 ? app_colors.AppColors.primary : app_colors.AppColors.muted,
          ),
          label: 'Add',
        ),
        BottomNavigationBarItem(
          icon: Icon(
            Icons.person,
            color: selectedIndex == 4 ? app_colors.AppColors.primary : app_colors.AppColors.muted,
          ),
          label: 'Profile',
        ),
      ],
      currentIndex: selectedIndex,
      onTap: onTap,
    );
  }
}
