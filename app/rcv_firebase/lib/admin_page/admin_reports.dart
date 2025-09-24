import 'package:flutter/material.dart';
import '../widgets/gradient_header_app_bar.dart';
import '../widgets/navigation_bar.dart';
import 'dart:convert';
import 'package:flutter/services.dart' show rootBundle;

class AdminReportsPage extends StatefulWidget {
  const AdminReportsPage({super.key});

  @override
  _AdminReportsPageState createState() => _AdminReportsPageState();
}

class _AdminReportsPageState extends State<AdminReportsPage> {
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
      body: const Center(child: Text('Admin Reports Page')),
      bottomNavigationBar: AppBottomNavBar(
        selectedIndex: 3,
        role: NavBarRole.admin,
      ),
    );
  }
}
