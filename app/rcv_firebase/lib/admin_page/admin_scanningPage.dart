import 'package:flutter/material.dart';
import '../widgets/gradient_header_app_bar.dart';
import '../widgets/navigation_bar.dart';

class AdminScanningPage extends StatefulWidget {
  const AdminScanningPage({super.key});

  @override
  _AdminScanningPageState createState() => _AdminScanningPageState();
}

class _AdminScanningPageState extends State<AdminScanningPage> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: GradientHeaderAppBar(
        greeting: 'Welcome back',
        user: 'Admin user',
        onBack: () => Navigator.of(context).maybePop(),
      ),
      body: const Center(child: Text('Welcome to the Admin Scanning Page')),
      bottomNavigationBar: AppBottomNavBar(
        selectedIndex: 2,
        role: NavBarRole.admin,
      ),
    );
  }
}
