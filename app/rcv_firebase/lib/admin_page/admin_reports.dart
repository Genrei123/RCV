import 'package:flutter/material.dart';
import '../widgets/gradient_header_app_bar.dart';
import '../widgets/admin_bottom_nav_bar.dart';

class AdminReportsPage extends StatefulWidget {
  const AdminReportsPage({Key? key}) : super(key: key);

  @override
  _AdminReportsPageState createState() => _AdminReportsPageState();
}

class _AdminReportsPageState extends State<AdminReportsPage> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: GradientHeaderAppBar(
        greeting: 'Welcome back',
        user: 'Admin user',
        onBack: () => Navigator.of(context).maybePop(),
      ),
      body: const Center(child: Text('Admin Reports Page')),
      bottomNavigationBar: AdminBottomNavBar(selectedIndex: 3),
    );
  }
}
