import 'package:flutter/material.dart';
import '../widgets/gradient_header_app_bar.dart';
import '../widgets/navigation_bar.dart';

class UserReportsPage extends StatefulWidget {
  const UserReportsPage({Key? key}) : super(key: key);

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
        onBack: () => Navigator.of(context).maybePop(),
      ),
      body: const Center(child: Text('This is the User Reports page.')),
      bottomNavigationBar: AppBottomNavBar(
        selectedIndex: 3,
        role: NavBarRole.user,
      ),
    );
  }
}
