import 'package:flutter/material.dart';
import 'package:rcv_firebase/widgets/app_buttons.dart';
import 'package:rcv_firebase/widgets/gradient_header_app_bar.dart';
import 'package:rcv_firebase/widgets/navigation_bar.dart';

class UserProfilePage extends StatelessWidget {
  final NavBarRole role;
  const UserProfilePage({Key? key, required this.role}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const GradientHeaderAppBar(),
      body: Column(
        // children: [
        //   const SizedBox(height: 24),
        //   AppButtons(
        //     text: 'Edit Profile',
        //     size: 48,
        //     textColor: Colors.white,
        //     backgroundColor: Color(0xFF00A47D),
        //     borderColor: Color(0xFF00A47D),
        //     icon: Icon(Icons.edit, color: Colors.white, size: 24),
        //     onPressed: () {},
        //   ),
        //   const Spacer(),
        //   AppButtons(
        //     text: 'Log Out',
        //     size: 48,
        //     textColor: Colors.white,
        //     backgroundColor: Color(0xFFD9534F),
        //     borderColor: Color(0xFFD9534F),
        //     icon: Icon(Icons.logout, color: Colors.white, size: 24),
        //     onPressed: () {},
        //   ),
        //   const SizedBox(height: 24),
        // ],
      ),
      bottomNavigationBar: AppBottomNavBar(
        selectedIndex: 4, // Profile tab
        role: role,
      ),
    );
  }
}
