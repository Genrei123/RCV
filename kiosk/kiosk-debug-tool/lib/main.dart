import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'screens/login_screen.dart';
import 'screens/kiosk_dashboard.dart';
import 'services/auth_service.dart';
import 'services/kiosk_service.dart';
import 'theme/app_theme.dart';

void main() {
  runApp(const KioskDebugApp());
}

class KioskDebugApp extends StatelessWidget {
  const KioskDebugApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthService()),
        ChangeNotifierProvider(create: (_) => KioskService()),
      ],
      child: MaterialApp(
        title: 'RCV Kiosk Debug Tool',
        theme: AppTheme.lightTheme,
        debugShowCheckedModeBanner: false,
        home: const AuthWrapper(),
      ),
    );
  }
}

class AuthWrapper extends StatelessWidget {
  const AuthWrapper({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<AuthService>(
      builder: (context, auth, _) {
        if (auth.isAuthenticated) {
          return const KioskDashboard();
        }
        return const LoginScreen();
      },
    );
  }
}
