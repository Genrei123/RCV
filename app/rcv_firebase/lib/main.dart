import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'firebase_options.dart';

// Import all your pages
import 'auth/landingPage.dart';
import 'auth/login_page.dart';
import 'widgets/navigation_bar.dart' as nav_bar;
import 'auth/otp_verification_page.dart';
import 'auth/reset_password.dart';
import 'auth/reset_new_password_page.dart';
import 'auth/user_profile.dart';
import 'user_page/agent_homePage.dart';
import 'user_page/scanning_Page.dart';
import 'user_page/agent_auditTrail.dart';
import 'user_page/agent_Reports.dart';
import 'pages/location_page.dart';
import 'widgets/connectivity_check_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ConnectivityCheckScreen(
      child: MaterialApp(
        title: 'RCV - Product Verification',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          scaffoldBackgroundColor: Colors.white,
          colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF005440)),
          primarySwatch: Colors.green,
        ),
        // Start with the landing page
        initialRoute: '/',
        routes: {
          //authentication
          '/': (context) => const LandingPage(),
          '/login': (context) => const LoginPage(),
          '/otp-verification': (context) => const OtpVerificationPage(),
          '/reset-password': (context) => ResetPasswordPage(),
          '/reset-new-password': (context) => const ResetN
          ewPasswordPage(),
          '/user-profile': (context) => UserProfilePage(
            role: nav_bar.NavBarRole.user.toString(),
          ),
          //User Pages
          '/user-home': (context) => const UserHomePage(),
          '/user-audit-trail': (context) => const AuditTrailPage(),
          '/user-reports': (context) => const UserReportsPage(),
          //Scanning Page
          '/scanning': (context) => const QRScannerPage(),
          //Location Page
          '/location': (context) => const LocationPage(),
        },
      ),
    );
  }
}
