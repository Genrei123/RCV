import 'package:flutter/material.dart';
import '../widgets/gradient_header_app_bar.dart';
import 'package:rcv_firebase/themes/app_fonts.dart';
import '../widgets/navigation_bar.dart';

class AuditTrailPage extends StatefulWidget {
  const AuditTrailPage({Key? key}) : super(key: key);

  @override
  State<AuditTrailPage> createState() => _AuditTrailPageState();
}

class _AuditTrailPageState extends State<AuditTrailPage> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: GradientHeaderAppBar(
        greeting: 'Welcome back',
        user: 'Agent user',
        onBack: () => Navigator.of(context).maybePop(),
      ),
      body: Center(
        child: Text('Home Content Placeholder', style: AppFonts.titleStyle),
      ),
      bottomNavigationBar: AppBottomNavBar(
        selectedIndex: 1,
        role: NavBarRole.user,
      ),
    );
  }
}
