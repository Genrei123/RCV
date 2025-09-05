import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:rcv_firebase/auth/reset_password.dart';
import '../widgets/app_buttons.dart';
import '../widgets/animated_form_field.dart'; // Your stateless animated form field
import 'package:rcv_firebase/themes/app_colors.dart' as app_colors;

// Define AppColors if not already defined elsewhere
class AppColors {
  static const Color primary = Color(
    0xFF00BA8E,
  ); // Use your desired primary color
}

class LoginPage extends StatelessWidget {
  const LoginPage({super.key});

  @override
  Widget build(BuildContext context) {
    final emailController = TextEditingController();
    final passwordController = TextEditingController();
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
                        // TODO: handle login
                      },
                    ),
                    SizedBox(height: 24),
                    GestureDetector(
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => ResetPasswordPage(),
                          ),
                        );
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
