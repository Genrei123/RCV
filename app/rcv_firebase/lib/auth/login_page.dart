import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../widgets/app_buttons.dart';
import '../widgets/animated_form_field.dart';
import 'package:rcv_firebase/themes/app_colors.dart' as app_colors;
import '../widgets/navigation_bar.dart';
import 'dart:convert';
import 'package:flutter/services.dart' show rootBundle;

// Define a global variable for appRole
NavBarRole? appRole;

// Define AppColors if not already defined elsewhere
class AppColors {
  static const Color primary = Color(0xFF00BA8E);
}

// Define the User class to hold account data
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

  // Function to load and parse the JSON file
  Future<List<User>> loadUsers() async {
    final String response = await rootBundle.loadString('assets/users.json');
    final List<dynamic> data = jsonDecode(response);
    return data.map((json) => User.fromJson(json)).toList();
  }

  // Function to validate login credentials
  Future<bool> validateLogin(
    String email,
    String password,
    BuildContext context,
  ) async {
    final users = await loadUsers();
    for (var user in users) {
      if (user.email == email && user.password == password) {
        appRole = user.role;
        Navigator.pushReplacementNamed(
          context,
          user.role == NavBarRole.admin ? '/admin-home' : '/user-home',
        );
        return true;
      }
    }
    // Show error if credentials are invalid
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text('Invalid email or password')));
    return false;
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
          child: Column(
            children: [
              Container(
                margin: EdgeInsets.only(
                  top: MediaQuery.of(context).size.height * 0.2,
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
                    ),
                    SizedBox(height: 16),
                    AnimatedFormField(
                      label: 'Password',
                      hint: 'Password',
                      controller: passwordController,
                      focusNode: passwordFocusNode,
                      obscureText: true,
                      suffixIcon: ValueListenableBuilder<TextEditingValue>(
                        valueListenable: passwordController,
                        builder: (context, value, child) {
                          return value.text.isNotEmpty
                              ? Icon(Icons.visibility)
                              : SizedBox.shrink();
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
                      icon: Icon(Icons.login, color: app_colors.AppColors.text),
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
    );
  }
}
