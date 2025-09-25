import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../widgets/app_buttons.dart';
import '../widgets/animated_form_field.dart';
import 'package:rcv_firebase/themes/app_colors.dart' as app_colors;
import '../widgets/navigation_bar.dart';
import 'dart:convert';
import 'package:flutter/services.dart' show rootBundle;

NavBarRole? appRole;

class AppColors {
  static const Color primary = Color(0xFF00BA8E);
}

class User {
  final String email;
  final String password;
  final NavBarRole role;

  User({required this.email, required this.password, required this.role});

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      email: json['email'],
      password: json['password'],
      role: json['role'] == 'admin' ? NavBarRole.admin : NavBarRole.user,
    );
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
        appRole = user.role;
        if (context.mounted) {
          Navigator.pushReplacementNamed(
            context,
            user.role == NavBarRole.admin ? '/admin-home' : '/user-home',
          );
        }
        return true;
      }
    }

    setState(() {
      emailError = 'email not found';
      passwordError = 'Invalid password';
      hasEmailError = true;
      hasPasswordError = true;
    });

    return false;
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
                          onPressed: () {
                            validateLogin(
                              emailController.text,
                              passwordController.text,
                              context,
                            );
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
