import 'package:flutter/material.dart';
import '../widgets/gradient_header_app_bar.dart';
import '../widgets/navigation_bar.dart';
import 'dart:convert';
import 'package:flutter/services.dart' show rootBundle;
import '../widgets/app_buttons.dart';
import '../widgets/audit_table.dart'; // Import centralized audit widget
import 'package:rcv_firebase/themes/app_colors.dart' as app_colors;

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(home: const HomePage());
  }
}

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  Map<String, dynamic>? userData;

  @override
  void initState() {
    super.initState();
    loadUserData();
  }

  Future<void> loadUserData() async {
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
          ), // Extra bottom padding
          child: Column(
            mainAxisAlignment: MainAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.only(bottom: 24.0),
                child: Text(
                  'Home',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                    fontFamily: 'Montserrat', // Use your app font here
                  ),
                ),
              ),
              AppButtons.main(
                text: 'Locations',
                subTitle: 'Tag the location',
                size: 80,
                textColor: app_colors.AppColors.white,
                color: app_colors.AppColors.primary,
                icon: Icon(
                  Icons.location_on,
                  color: app_colors.AppColors.white,
                ),
                onPressed: () {
                  // Navigate to location page
                },
              ),
              Padding(
                padding: const EdgeInsets.only(top: 16.0, bottom: 16.0),
                child: AppButtons.main(
                  text: 'Accounts',
                  subTitle: 'Manage User Accounts',
                  size: 80,
                  textColor: app_colors.AppColors.white,
                  color: app_colors.AppColors.primary,
                  icon: Icon(Icons.person, color: app_colors.AppColors.white),
                  onPressed: () {
                    // Navigate to location page
                  },
                ),
              ),

              // Your Recent Audits Section
              Padding(
                padding: const EdgeInsets.only(top: 16.0, bottom: 16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header with lines on both sides
                    Row(
                      children: [
                        Expanded(
                          child: Container(height: 1, color: Colors.black),
                        ),
                        const Padding(
                          padding: EdgeInsets.symmetric(horizontal: 8.0),
                          child: Text(
                            'Your Recent Audits',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: Colors.black87,
                            ),
                          ),
                        ),
                        Expanded(
                          child: Container(height: 1, color: Colors.black),
                        ),
                      ],
                    ),

                    const SizedBox(height: 16),

                    // Use the centralized CompleteAuditWidget for user-specific recent audits
                    CompleteAuditWidget(
                      filterByUserId:
                          userData?['id']
                              as String?, // Filter by current user ID
                      showRecentOnly: true, // Show only recent audits (first 5)
                      showPagination:
                          false, // No pagination for homepage recent audits
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
      //nav bar
      bottomNavigationBar: AppBottomNavBar(
        selectedIndex: 0,
        role: NavBarRole.admin,
      ),
    );
  }
}
