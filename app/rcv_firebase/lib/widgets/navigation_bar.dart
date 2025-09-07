import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

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
      selectedItemColor: Color(0xFF005440),
      items: [
        BottomNavigationBarItem(
          icon: Icon(
            Icons.home,
            color: selectedIndex == 0 ? Color(0xFF005440) : Colors.grey,
          ),
          label: 'Home',
        ),
        BottomNavigationBarItem(
          icon: Icon(
            Icons.history,
            color: selectedIndex == 1 ? Color(0xFF005440) : Colors.grey,
          ),
          label: 'History',
        ),
        BottomNavigationBarItem(
          icon: Container(
            width: 66,
            height: 66,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: selectedIndex == 2 ? Color(0xFF005440) : Color(0xFF005440),
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
            color: selectedIndex == 3 ? Color(0xFF005440) : Colors.grey,
          ),
          label: 'Add',
        ),
        BottomNavigationBarItem(
          icon: Icon(
            Icons.person,
            color: selectedIndex == 4 ? Color(0xFF005440) : Colors.grey,
          ),
          label: 'Profile',
        ),
      ],
      currentIndex: selectedIndex,
      onTap: onTap,
    );
  }
}
