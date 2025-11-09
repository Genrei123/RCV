import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'config/firebase_config.dart'; // Updated to use config
import 'services/remote_config_service.dart';

// Import all your pages
import 'auth/landingPage.dart';
import 'auth/login_page.dart';
import 'auth/otp_verification_page.dart';
import 'auth/reset_password.dart';
import 'auth/reset_new_password_page.dart';
import 'pages/user_profile_page.dart';
import 'user_page/agent_homePage.dart';
import 'user_page/scanning_Page.dart';
import 'pages/audit_trail_page.dart';
import 'user_page/agent_Reports.dart';
import 'pages/location_page.dart';
import 'widgets/connectivity_check_screen.dart';
import 'pages/crop_label.dart';
import 'pages/splash_page.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Load environment variables from .env file
  await dotenv.load(fileName: ".env");
  
  // Initialize Firebase with environment-based configuration
  await Firebase.initializeApp(options: FirebaseConfig.currentPlatform);

  // Initialize Remote Config
  await RemoteConfigService.initialize();

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
        // Start with a splash page
        initialRoute: '/splash',
        routes: {
          '/splash': (context) => const SplashPage(),
          //authentication
          '/': (context) => const LandingPage(),
          '/login': (context) => const LoginPage(),
          '/otp-verification': (context) => const OtpVerificationPage(),
          '/reset-password': (context) => ResetPasswordPage(),
          '/reset-new-password': (context) => const ResetNewPasswordPage(),
          '/user-profile': (context) => const UserProfilePage(),
          //User Pages
          '/user-home': (context) => const UserHomePage(),
          '/user-audit-trail': (context) => const AuditTrailPage(),
          '/user-reports': (context) => const UserReportsPage(),
          //Scanning Page
          '/scanning': (context) => const QRScannerPage(),
          //Location Page
          '/location': (context) => const LocationPage(),
          // Crop Label Page (image cropping before OCR)
          '/crop-label': (context) => const CropLabelPage(),
        },
      ),
    );
  }
}
