import 'package:flutter/material.dart';
import '../widgets/gradient_header_app_bar.dart';
import 'package:rcv_firebase/themes/app_fonts.dart';
import '../widgets/navigation_bar.dart';

class AgentScanningPage extends StatefulWidget {
  const AgentScanningPage({super.key});

  @override
  _AgentScanningPageState createState() => _AgentScanningPageState();
}

class _AgentScanningPageState extends State<AgentScanningPage> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: GradientHeaderAppBar(
        greeting: 'Welcome back',
        user: 'Agent user',
        onBack: () => Navigator.of(context).maybePop(),
      ),
      body: Center(
        child: Text(
          'Welcome to Agent Scanning Page',
          style: AppFonts.titleStyle,
        ),
      ),
      bottomNavigationBar: AppBottomNavBar(
        selectedIndex: 2,
        role: NavBarRole.user,
      ),
    );
  }
}
