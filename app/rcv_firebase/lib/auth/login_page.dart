import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../widgets/app_buttons.dart';
import '../widgets/animated_form_field.dart';
import 'package:rcv_firebase/themes/app_colors.dart' as app_colors;
import '../widgets/navigation_bar.dart';
import '../widgets/processing_modal.dart';
// Removed status modal usage per request
import 'dart:convert';
import 'package:flutter/services.dart' show rootBundle;
import '../services/token_service.dart';
import 'package:flutter/scheduler.dart';

NavBarRole? appRole;

class AppColors {
  static const Color primary = Color(0xFF00BA8E);
}

class User {
  final String _id;
  final String role;
  final String status;
  final String avatarUrl;
  final String firstName;
  final String? middleName;
  final String lastName;
  final String? extName;
  final String fullName;
  final String email;
  final String location;
  final Map<String, dynamic>? currentLocation;
  final String dateOfBirth;
  final String phoneNumber;
  final String password;
  final String createdAt;
  final String updatedAt;
  final String badgeId;

  User({
    required String id,
    required this.role,
    required this.status,
    required this.avatarUrl,
    required this.firstName,
    this.middleName,
    required this.lastName,
    this.extName,
    required this.fullName,
    required this.email,
    required this.location,
    this.currentLocation,
    required this.dateOfBirth,
    required this.phoneNumber,
    required this.password,
    required this.createdAt,
    required this.updatedAt,
    required this.badgeId,
  }) : _id = id;

  NavBarRole get navBarRole {
    switch (role) {
      case 'ADMIN':
        return NavBarRole.admin;
      case 'AGENT':
      case 'USER':
      default:
        return NavBarRole.user;
    }
  }

  // Getter for ID compatibility
  String get id => _id;

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['_id'],
      role: json['role'],
      status: json['status'],
      avatarUrl: json['avatarUrl'],
      firstName: json['firstName'],
      middleName: json['middleName'],
      lastName: json['lastName'],
      extName: json['extName'],
      fullName: json['fullName'],
      email: json['email'],
      location: json['location'],
      currentLocation: json['currentLocation'] as Map<String, dynamic>?,
      dateOfBirth: json['dateOfBirth'],
      phoneNumber: json['phoneNumber'],
      password: json['password'],
      createdAt: json['createdAt'],
      updatedAt: json['updatedAt'],
      badgeId: json['badgeId'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': _id,
      'role': role,
      'status': status,
      'avatarUrl': avatarUrl,
      'firstName': firstName,
      'middleName': middleName,
      'lastName': lastName,
      'extName': extName,
      'fullName': fullName,
      'email': email,
      'location': location,
      'currentLocation': currentLocation,
      'dateOfBirth': dateOfBirth,
      'phoneNumber': phoneNumber,
      'password': password,
      'createdAt': createdAt,
      'updatedAt': updatedAt,
      'badgeId': badgeId,
    };
  }
}

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final emailController = TextEditingController();
  final passwordController = TextEditingController();
  final emailFocusNode = FocusNode();
  final passwordFocusNode = FocusNode();

  String? emailError;
  String? passwordError;
  bool hasEmailError = false;
  bool hasPasswordError = false;

  bool obscureText = true;

  Future<List<User>> loadUsers() async {
    final String response = await rootBundle.loadString('assets/users.json');
    final List<dynamic> data = jsonDecode(response);
    return data.map((json) => User.fromJson(json)).toList();
  }

  Future<bool> validateLogin(
    String email,
    String password,
    BuildContext context,
  ) async {
    setState(() {
      emailError = null;
      passwordError = null;
      hasEmailError = false;
      hasPasswordError = false;
    });

    bool hasErrors = false;
    if (email.trim().isEmpty) {
      setState(() {
        emailError = 'Email is required';
        hasEmailError = true;
      });
      hasErrors = true;
    } else if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(email)) {
      setState(() {
        emailError = 'Please enter a valid email';
        hasEmailError = true;
      });
      hasErrors = true;
    }

    if (password.trim().isEmpty) {
      setState(() {
        passwordError = 'Password is required';
        hasPasswordError = true;
      });
      hasErrors = true;
    }

    if (hasErrors) {
      return false;
    }

    final users = await loadUsers();
    for (var user in users) {
      if (user.email == email && user.password == password) {
        String mockToken = await _createMockJwtToken(user.email);

        print(' Mock login successful');
        print(' Mock JWT Token: $mockToken');

        // Store the mock token
        await TokenService.saveTokens(mockToken, 'mock_refresh_token', 3600);

        // Set user role
        appRole = user.navBarRole;

        if (context.mounted) {
          Navigator.pushReplacementNamed(context, '/user-home');
        }
        return true;
      }
    }

    setState(() {
      emailError = 'Email not found';
      passwordError = 'Invalid password';
      hasEmailError = true;
      hasPasswordError = true;
    });

    return false;
  }

  // Create a mock JWT token for testing
  Future<String> _createMockJwtToken(String email) async {
    final users = await loadUsers();
    final user = users.firstWhere((u) => u.email == email);

    // Create mock JWT payload using new user structure
    final payload = {
      'sub': user.id, // UUID from new structure
      'email': user.email,
      'role': user.role, // ADMIN, AGENT, USER
      'isAdmin': user.role == 'ADMIN',
      'fullName': user.fullName,
      'firstName': user.firstName,
      'lastName': user.lastName,
      'badgeId': user.badgeId,
      'status': user.status,
      'iat': DateTime.now().millisecondsSinceEpoch ~/ 1000,
      'exp': (DateTime.now().millisecondsSinceEpoch ~/ 1000) + 3600,
    };

    final encodedPayload = base64Url.encode(utf8.encode(jsonEncode(payload)));
    return 'mock.$encodedPayload.mock';
  }

  @override
  void initState() {
    super.initState();
    emailController.addListener(() {
      if (hasEmailError) {
        setState(() {
          emailError = null;
          hasEmailError = false;
        });
      }
    });
    passwordController.addListener(() {
      if (hasPasswordError) {
        setState(() {
          passwordError = null;
          hasPasswordError = false;
        });
      }
    });
  }

  @override
  void dispose() {
    emailController.dispose();
    passwordController.dispose();
    emailFocusNode.dispose();
    passwordFocusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              app_colors.AppColors.primaryLight,
              app_colors.AppColors.primary,
            ],
          ),
        ),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.only(bottom: 24.0),
            child: ConstrainedBox(
              constraints: BoxConstraints(
                minHeight:
                    MediaQuery.of(context).size.height -
                    MediaQuery.of(context).padding.top -
                    MediaQuery.of(context).padding.bottom -
                    48,
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    margin: EdgeInsets.only(
                      top: MediaQuery.of(context).size.height * 0.1,
                    ),
                    alignment: Alignment.topCenter,
                    child: SvgPicture.asset(
                      'assets/landinglogo.svg',
                      width: 190,
                      height: 190,
                    ),
                  ),
                  SizedBox(height: 30),
                  Text(
                    'LOG IN',
                    style: TextStyle(
                      fontSize: 22,
                      color: Colors.white,
                      fontWeight: FontWeight.w500,
                      letterSpacing: 1.2,
                    ),
                  ),
                  SizedBox(height: 24),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 32),
                    child: Column(
                      children: [
                        AnimatedFormField(
                          label: 'Email',
                          hint: 'Email',
                          controller: emailController,
                          focusNode: emailFocusNode,
                          hasError: hasEmailError,
                          errorText: emailError,
                          errorTextColor: Colors.white,
                        ),
                        SizedBox(height: 16),
                        AnimatedFormField(
                          label: 'Password',
                          hint: 'Password',
                          controller: passwordController,
                          focusNode: passwordFocusNode,
                          obscureText: obscureText,
                          hasError: hasPasswordError,
                          errorText: passwordError,
                          errorTextColor: Colors.white,
                          suffixIcon: IconButton(
                            icon: Icon(
                              obscureText
                                  ? Icons.visibility_off
                                  : Icons.visibility,
                            ),
                            onPressed: () {
                              setState(() {
                                obscureText = !obscureText;
                              });
                            },
                          ),
                        ),
                        SizedBox(height: 24),
                        AppButtons(
                          text: 'Log In',
                          size: 48,
                          textColor: app_colors.AppColors.text,
                          backgroundColor: Colors.white,
                          borderColor: Color(0xFF005440),
                          icon: Icon(
                            Icons.login,
                            color: app_colors.AppColors.text,
                          ),
                          onPressed: () async {
                            // Show processing modal
                            showProcessingModal(
                              context,
                              message: 'Signing in...',
                            );

                            // Allow a frame to render so the processing dialog appears
                            await SchedulerBinding.instance.endOfFrame;
                            final ok = await validateLogin(
                              emailController.text,
                              passwordController.text,
                              context,
                            );

                            // Hide processing modal
                            hideProcessingModal(context);

                            // Wait a frame so the dialog has time to dismiss cleanly
                            await SchedulerBinding.instance.endOfFrame;

                            if (ok) {
                              // Direct navigation without status modal
                              if (mounted) {
                                Navigator.pushReplacementNamed(
                                  context,
                                  '/user-home',
                                );
                              }
                            } else {
                              // Show a lightweight SnackBar instead of a modal (optional)
                              if (mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text(
                                      'Login failed. Please check your credentials.',
                                    ),
                                  ),
                                );
                              }
                            }
                          },
                        ),
                        SizedBox(height: 24),
                        GestureDetector(
                          onTap: () {
                            Navigator.pushNamed(context, '/reset-password');
                          },
                          child: Text(
                            'Forgot your Password?',
                            style: TextStyle(
                              color: Colors.white,
                              fontStyle: FontStyle.italic,
                              decoration: TextDecoration.underline,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
