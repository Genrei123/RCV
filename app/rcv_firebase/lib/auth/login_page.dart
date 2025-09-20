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

class LoginPage extends StatelessWidget {
  const LoginPage({super.key});

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
  Widget build(BuildContext context) {
    final emailController = TextEditingController();
    final passwordController = TextEditingController();
    return Scaffold(
      resizeToAvoidBottomInset: true,
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
          child: SingleChildScrollView(
            padding: EdgeInsets.symmetric(horizontal: 32),
            child: ConstrainedBox(
              constraints: BoxConstraints(
                minHeight: MediaQuery.of(context).size.height - MediaQuery.of(context).padding.top,
              ),
              child: IntrinsicHeight(
                child: Column(
                  children: [
                    // Flexible spacing for logo
                    Flexible(
                      flex: 2,
                      child: Container(
                        alignment: Alignment.center,
                        child: SvgPicture.asset(
                          'assets/landinglogo.svg',
                          width: 150,
                          height: 150,
                        ),
                      ),
                    ),
                    SizedBox(height: 20),
                    Text(
                      'LOG IN',
                      style: TextStyle(
                        fontSize: 22,
                        color: Colors.white,
                        fontWeight: FontWeight.w500,
                        letterSpacing: 1.2,
                      ),
                    ),
                    SizedBox(height: 20),
                    // Form section
                    Flexible(
                      flex: 3,
                      child: Column(
                        children: [
                          AnimatedFormField(
                            label: 'Email',
                            hint: 'Email',
                            controller: emailController,
                          ),
                          SizedBox(height: 16),
                          AnimatedFormField(
                            label: 'Password',
                            hint: 'Password',
                            controller: passwordController,
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
                          SizedBox(height: 16),
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
                    // Bottom spacing
                    SizedBox(height: 20),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
