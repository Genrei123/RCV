import 'package:flutter/material.dart';
import 'package:rcv_firebase/widgets/gradient_header_app_bar.dart';
import 'package:rcv_firebase/widgets/navigation_bar.dart';

class UserProfilePage extends StatelessWidget {
  final NavBarRole role;
  const UserProfilePage({super.key, required this.role});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const GradientHeaderAppBar(),
      body: Column(),
      bottomNavigationBar: AppBottomNavBar(
        selectedIndex: 4, // Profile tab
        role: role,
      ),
    );
  }
}
