import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:rcv_firebase/themes/app_colors.dart' as app_colors;
import '../widgets/gradient_header_app_bar.dart';
import '../widgets/app_buttons.dart';
import '../widgets/navigation_bar.dart';
import 'package:rcv_firebase/pages/qr_scanner_page.dart';
import 'scanning_Page.dart';

class UserHomePage extends StatefulWidget {
  const UserHomePage({super.key});

  @override
  State<UserHomePage> createState() => _UserHomePageState();
}

class _UserHomePageState extends State<UserHomePage> {
  final int _selectedIndex = 0;

  final List<Widget> _pages = [const HomeContent()];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: GradientHeaderAppBar(
        greeting: 'Welcome back',
        user: 'Agent user',
        onBack: () => Navigator.of(context).maybePop(),
      ),
      body: _pages[_selectedIndex],
      bottomNavigationBar: AppBottomNavBar(
        selectedIndex: _selectedIndex,
        role: NavBarRole.user,
      ),
    );
  }
}

// Home Content Widget
class HomeContent extends StatelessWidget {
  const HomeContent({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AppButtons.main(
            text: 'My Location',
            subTitle: 'Tag the location',
            size: 80,
            textColor: app_colors.AppColors.white,
            color: app_colors.AppColors.primary,
            icon: Icon(LucideIcons.mapPin, color: app_colors.AppColors.white),
            onPressed: () {
              // Navigate to location page
            },
          ),
          const SizedBox(height: 12),
          Card(
            child: ListTile(
              leading: Icon(
                LucideIcons.scan,
                color: app_colors.AppColors.primary,
              ),
              title: const Text('Scan Product'),
              subtitle: const Text('Verify product authenticity'),
              trailing: const Icon(Icons.arrow_forward_ios),
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => QRScannerPage()),
                );
              },
            ),
          ),
          const SizedBox(height: 12),
          Card(
            child: ListTile(
              leading: Icon(Icons.history, color: app_colors.AppColors.primary),
              title: const Text('Scan History'),
              subtitle: const Text('View your previous scans'),
              trailing: const Icon(Icons.arrow_forward_ios),
              onTap: () {
                // Navigate to history
              },
            ),
          ),
        ],
      ),
    );
  }
}
