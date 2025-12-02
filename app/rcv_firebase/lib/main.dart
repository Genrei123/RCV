import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/services.dart';
import 'firebase_options.dart';
import 'services/remote_config_service.dart';
import 'services/update_service.dart';

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
      
      try {
        await Firebase.initializeApp(
          options: DefaultFirebaseOptions.currentPlatform,
        );
      } catch (e) {
        if (e.toString().contains('duplicate-app')) {
        } else {
          rethrow; // Re-throw if it's a different error
        }
      }

      // Initialize Remote Config
      await RemoteConfigService.initialize();
    } catch (e) {
      print('Initialization error: $e');
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
  bool _showUpdateModal = false; // Control update modal visibility
  bool _isForceUpdate = false;
  String _updateTitle = '';
  String _updateMessage = '';

  void _handleUpdateNow() {
    try {
      UpdateService.redirectToUpdate();
    } catch (e) {
      print('Error launching app store: $e');
    }
  }

  Future<void> _performUpdateCheck() async {
    try {
      await RemoteConfigService.ensureInitialized();
      bool configRefreshed = await RemoteConfigService.refresh();
      
      if (mounted) {
        bool updateAvailable = await UpdateService.checkForUpdates();
        
        if (updateAvailable) {
          bool isForceUpdate = await UpdateService.isForceUpdateRequired();
          
          setState(() {
            _isForceUpdate = isForceUpdate;
            _updateTitle = isForceUpdate ? 'Update Required' : 'Update Available';
            _updateMessage = isForceUpdate
                ? 'This update is required to continue using the app. Please update now.'
                : 'A new version of the app is available. Would you like to update now?';
            _showUpdateModal = true;
          });
        }
      }
    } catch (e) {
      print('Error during update check: $e');
    }
  }

  @override
  void initState() {
    super.initState();
    _hasConnection = widget.hasConnection;
    
    // Show modal if no initial connection
    if (!_hasConnection) {
      _showModal = true;
    }
    
    // Check for app updates after a short delay
    WidgetsBinding.instance.addPostFrameCallback((_) {
      // Wait for the MaterialApp to be built before checking for updates
      Future.delayed(Duration(seconds: 8), () async {
        // Check for updates
        try {
          bool forceUpdateRequired = await UpdateService.isForceUpdateRequired();
          bool updateAvailable = await UpdateService.checkForUpdates();
          bool forceUpdateFromConfig = RemoteConfigService.isForceUpdateRequired();
          
          if (mounted && (forceUpdateRequired || updateAvailable)) {
            setState(() {
              _showUpdateModal = true;
              _isForceUpdate = forceUpdateRequired || forceUpdateFromConfig;
              
              if (forceUpdateRequired) {
                _updateTitle = 'Critical Update Required';
                _updateMessage = 'Your app version is too old. Please update to continue using the app.';
              } else if (updateAvailable && forceUpdateFromConfig) {
                _updateTitle = 'Important Update Available';
                _updateMessage = 'A critical update is available. Please update for the best experience.';
              } else if (updateAvailable) {
                _updateTitle = 'New Version Available';
                _updateMessage = 'Update now for new features and improvements!';
              }
            });
          }
        } catch (e) {
          print('Error checking for updates: $e');
        }
      });
    });
    
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
      // Simplified routing - always provide full routes but control initial route
      initialRoute: _hasConnection ? '/splash' : '/login',
      routes: {
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
      },
      builder: (context, child) {
        return Stack(
          children: [
            child ?? const SizedBox.shrink(),
            // Update banner at the top
            // Removed loading text - no longer needed
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
                          mainAxisAlignment: _isForceUpdate 
                              ? MainAxisAlignment.center 
                              : MainAxisAlignment.spaceEvenly,
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
            // Update Modal
            if (_showUpdateModal)
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
                          _updateTitle,
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
                          _updateMessage,
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
                          mainAxisAlignment: _isForceUpdate 
                              ? MainAxisAlignment.center 
                              : MainAxisAlignment.spaceEvenly,
                          children: [
                            if (!_isForceUpdate)
                              TextButton(
                                onPressed: () {
                                  setState(() {
                                    _showUpdateModal = false;
                                  });
                                },
                                style: TextButton.styleFrom(
                                  foregroundColor: const Color(0xFF005440),
                                ),
                                child: const Text(
                                  'Later',
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ),
                            TextButton(
                              onPressed: _handleUpdateNow,
                              style: TextButton.styleFrom(
                                foregroundColor: const Color(0xFF005440),
                              ),
                              child: const Text(
                                'Update Now',
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
