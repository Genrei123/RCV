import 'package:flutter/material.dart';
import '../widgets/gradient_header_app_bar.dart';
import '../widgets/navigation_bar.dart';

class AgentScanningPage extends StatefulWidget {
  const AgentScanningPage({Key? key}) : super(key: key);

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
      body: const Center(child: Text('Welcome to Agent Scanning Page')),
      bottomNavigationBar: AppBottomNavBar(
        selectedIndex: 2,
        role: NavBarRole.user,
      ),
    );
  }
}
