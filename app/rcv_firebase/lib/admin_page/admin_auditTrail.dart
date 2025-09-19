import 'package:flutter/material.dart';
import '../widgets/gradient_header_app_bar.dart';
import '../widgets/navigation_bar.dart'; // Import AdminBottomNavBar

class AdminAuditTrail extends StatefulWidget {
  const AdminAuditTrail({Key? key}) : super(key: key);

  @override
  _AdminAuditTrailState createState() => _AdminAuditTrailState();
}

class _AdminAuditTrailState extends State<AdminAuditTrail> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: GradientHeaderAppBar(
        greeting: 'Welcome back',
        user: 'Admin user',
        onBack: () => Navigator.of(context).maybePop(),
      ),
      body: const Center(child: Text('Audit Trail Content Goes Here')),
      bottomNavigationBar: AppBottomNavBar(
        selectedIndex: 1,
        role: NavBarRole.admin,
      ),
      // Add AdminBottomNavBar
    );
  }
}
