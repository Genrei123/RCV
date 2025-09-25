import 'package:flutter/material.dart';
import '../widgets/gradient_header_app_bar.dart';
import '../widgets/navigation_bar.dart';
import '../widgets/audit_table.dart'; // Import the centralized audit widget
import 'dart:convert';
import 'package:flutter/services.dart' show rootBundle;

class AdminAuditTrail extends StatefulWidget {
  const AdminAuditTrail({super.key});

  @override
  _AdminAuditTrailState createState() => _AdminAuditTrailState();
}

class _AdminAuditTrailState extends State<AdminAuditTrail> {
  Map<String, dynamic>? userData;

  @override
  void initState() {
    super.initState();
    _loadUserData();
  }

  Future<void> _loadUserData() async {
    final String jsonString = await rootBundle.loadString('assets/users.json');
    final List<dynamic> dataList = json.decode(jsonString);
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
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(
            16.0,
            16.0,
            16.0,
            24.0,
          ), // Extra bottom padding - same as homepage
          child: Column(
            children: [
              const Padding(
                padding: EdgeInsets.only(bottom: 16.0),
                child: Text(
                  'Audit Trail',
                  style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                ),
              ),
              CompleteAuditWidget(showPagination: true, entriesPerPage: 10),
            ],
          ),
        ),
      ),
      bottomNavigationBar: AppBottomNavBar(
        selectedIndex: 1,
        role: NavBarRole.admin,
      ),
    );
  }
}
