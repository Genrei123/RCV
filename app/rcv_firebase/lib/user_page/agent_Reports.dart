import 'package:flutter/material.dart';
import '../widgets/gradient_header_app_bar.dart';
import 'package:rcv_firebase/themes/app_fonts.dart';
import '../widgets/navigation_bar.dart';

class UserReportsPage extends StatefulWidget {
  const UserReportsPage({super.key});

  @override
  _UserReportsPageState createState() => _UserReportsPageState();
}

class _UserReportsPageState extends State<UserReportsPage> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: GradientHeaderAppBar(
        greeting: 'Welcome back',
        user: 'Agent user',
        showBackButton: false, // Remove back button
      ),
      body: Center(
        child: Text(
          'This is the User Reports page.',
          style: AppFonts.titleStyle,
        ),
      ),
      bottomNavigationBar: AppBottomNavBar(
        selectedIndex: 3,
        role: NavBarRole.user,
      ),
    );
  }
}
