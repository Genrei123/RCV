import 'package:flutter/material.dart';
import '../widgets/gradient_header_app_bar.dart';
import '../widgets/navigation_bar.dart';
import 'dart:convert';
import 'package:flutter/services.dart' show rootBundle;

class AdminScanningPage extends StatefulWidget {
  const AdminScanningPage({super.key});

  @override
  _AdminScanningPageState createState() => _AdminScanningPageState();
}

class _AdminScanningPageState extends State<AdminScanningPage> {
  Map<String, dynamic>? userData;

  @override
  void initState() {
    super.initState();
    loadUserData();
  }

  Future<void> loadUserData() async {
    final String jsonString = await rootBundle.loadString('assets/users.json');
    final List<dynamic> dataList = json.decode(jsonString);
    // For demonstration, use the first user in the list
    final Map<String, dynamic> data = dataList.isNotEmpty
        ? dataList[0] as Map<String, dynamic>
        : {};
    setState(() {
      userData = data;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (userData == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    return Scaffold(
      appBar: GradientHeaderAppBar(
        greeting: 'Welcome back',
        user: (userData!['name'] ?? '').toString().split(' ').first,
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
