import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/services.dart';
import 'firebase_options.dart';
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
import 'pages/crop_label.dart';
import 'pages/splash_page.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Check connectivity first
  final connectivityResult = await Connectivity().checkConnectivity();
  final hasConnection = connectivityResult.isNotEmpty && 
      !connectivityResult.contains(ConnectivityResult.none);
  
  if (hasConnection) {
    try {
      // Load environment variables from .env file
      await dotenv.load(fileName: ".env");
      
      // Initialize Firebase with google-services.json configuration
      await Firebase.initializeApp(
        options: DefaultFirebaseOptions.currentPlatform,
      );

      // Initialize Remote Config
      await RemoteConfigService.initialize();
    } catch (e) {
      // If Firebase fails, treat as no connection
      runApp(const MyApp(hasConnection: false));
      return;
    }
  }

  runApp(MyApp(hasConnection: hasConnection));
}

class MyApp extends StatefulWidget {
  final bool hasConnection;
  
  const MyApp({super.key, this.hasConnection = true});

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  late bool _hasConnection;
  bool _showModal = false; // Control modal visibility manually
  bool _isRetrying = false; // Loading state for retry button

  @override
  void initState() {
    super.initState();
    _hasConnection = widget.hasConnection;
    
    // Show modal if no initial connection
    if (!_hasConnection) {
      _showModal = true;
    }
    
    // Monitor connectivity changes but don't auto-hide modal
    Connectivity().onConnectivityChanged.listen((List<ConnectivityResult> results) {
      if (mounted) {
        setState(() {
          _hasConnection = results.isNotEmpty && 
              !results.contains(ConnectivityResult.none);
          
          // Show modal when connection is lost
          if (!_hasConnection) {
            _showModal = true;
          }
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'RCV - Product Verification',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        scaffoldBackgroundColor: Colors.white,
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF005440)),
        primarySwatch: Colors.green,
      ),
      // Show login page as home when no connection, otherwise use normal routing
      home: !_hasConnection ? const LoginPage() : null,
      initialRoute: _hasConnection ? '/splash' : null,
      routes: _hasConnection ? {
        '/splash': (context) => const SplashPage(),
        '/': (context) => const LandingPage(),
        '/login': (context) => const LoginPage(),
        '/otp-verification': (context) => const OtpVerificationPage(),
        '/reset-password': (context) => ResetPasswordPage(),
        '/reset-new-password': (context) => const ResetNewPasswordPage(),
        '/user-profile': (context) => const UserProfilePage(),
        '/user-home': (context) => const UserHomePage(),
        '/user-audit-trail': (context) => const AuditTrailPage(),
        '/user-reports': (context) => const UserReportsPage(),
        '/scanning': (context) => const QRScannerPage(),
        '/location': (context) => const LocationPage(),
        '/crop-label': (context) => const CropLabelPage(),
      } : {
        '/login': (context) => const LoginPage(),
      },
      builder: (context, child) {
        return Stack(
          children: [
            child ?? const SizedBox.shrink(),
            if (_showModal)
              Container(
                color: Colors.black26,
                child: Center(
                  child: Container(
                    margin: const EdgeInsets.all(20),
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'Connection error',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w600,
                            color: Colors.black87,
                            decoration: TextDecoration.none,
                            fontFamily: 'SF Pro Text',
                          ),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'Unable to connect with the server. Check your internet connection and try again.',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w400,
                            color: Colors.black54,
                            decoration: TextDecoration.none,
                            fontFamily: 'SF Pro Text',
                            height: 1.4,
                          ),
                        ),
                        const SizedBox(height: 24),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                          children: [
                            TextButton(
                              onPressed: _isRetrying ? null : () async {
                                setState(() {
                                  _isRetrying = true;
                                });
                                
                                // Wait 2 seconds to simulate checking
                                await Future.delayed(Duration(seconds: 2));
                                
                                // Check connectivity
                                final result = await Connectivity().checkConnectivity();
                                setState(() {
                                  _hasConnection = result.isNotEmpty && 
                                      !result.contains(ConnectivityResult.none);
                                  _isRetrying = false;
                                  
                                  // Only hide modal if connection is restored
                                  if (_hasConnection) {
                                    _showModal = false;
                                  }
                                });
                              },
                              style: TextButton.styleFrom(
                                foregroundColor: const Color(0xFF005440),
                              ),
                              child: _isRetrying 
                                ? SizedBox(
                                    width: 20,
                                    height: 20,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      valueColor: AlwaysStoppedAnimation<Color>(
                                        Color(0xFF005440),
                                      ),
                                    ),
                                  )
                                : Text(
                                    'Retry',
                                    style: TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                            ),
                            TextButton(
                              onPressed: () {
                                SystemNavigator.pop();
                              },
                              style: TextButton.styleFrom(
                                foregroundColor: const Color(0xFF005440),
                              ),
                              child: const Text(
                                'Close App',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ),
          ],
        );
      },
    );
  }
}
