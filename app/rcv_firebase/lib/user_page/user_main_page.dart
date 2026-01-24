import 'package:flutter/material.dart';
import 'package:rcv_firebase/services/remote_config_service.dart';
import 'package:rcv_firebase/utils/tab_history.dart';
import 'package:rcv_firebase/widgets/navigation_bar.dart';
import 'agent_home_page.dart';
import '../pages/audit_trail_page.dart';
import 'scanning_category_page.dart';
import 'agent_reports.dart';
import '../pages/user_profile_page.dart';
import '../widgets/feature_disabled_screen.dart';

class UserMainPage extends StatefulWidget {
  final int initialIndex;

  const UserMainPage({
    super.key,
    this.initialIndex = 0,
  });

  @override
  State<UserMainPage> createState() => _UserMainPageState();
}

class _UserMainPageState extends State<UserMainPage> {
  late int _selectedIndex;

  // List of pages for each tab
  late final List<Widget> _pages;

  @override
  void initState() {
    super.initState();
    _selectedIndex = widget.initialIndex;
    _pages = [
      const HomeContent(), // Home
      AuditTrailPage(), // Audit Trail
      const ScanningCategoryPage(), // Scanning
      const UserReportsPage(), // Reports
      const UserProfilePage(), // Profile
    ];
  }

  void _onTabSelected(int index) {
    if (index >= 0 && index < _pages.length) {
      TabHistory.instance.visit(index);
      setState(() {
        _selectedIndex = index;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    // Check if current tab is disabled and show feature disabled screen
    if (_selectedIndex == 0 && RemoteConfigService.isFeatureDisabled('disable_home_page')) {
      return Scaffold(
        body: FeatureDisabledScreen(
          featureName: 'Home',
          icon: Icons.home,
          selectedNavIndex: _selectedIndex,
          navBarRole: NavBarRole.user,
        ),
        bottomNavigationBar: AppBottomNavBar(
          selectedIndex: _selectedIndex,
          role: NavBarRole.user,
          onTabSelected: _onTabSelected,
        ),
      );
    }

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        final prev = TabHistory.instance.popAndGetPrevious();
        if (prev != null && prev >= 0 && prev < _pages.length) {
          _onTabSelected(prev);
        } else {
          Navigator.maybePop(context);
        }
      },
      child: Scaffold(
        appBar: null, // AppBar will be managed by each page if needed
        body: _pages[_selectedIndex],
        bottomNavigationBar: AppBottomNavBar(
          selectedIndex: _selectedIndex,
          role: NavBarRole.user,
          onTabSelected: _onTabSelected,
        ),
      ),
    );
  }
}
