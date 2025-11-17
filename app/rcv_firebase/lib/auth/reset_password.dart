import 'package:flutter/material.dart';
import '../widgets/app_buttons.dart';
import '/widgets/animated_form_field.dart';
import 'package:rcv_firebase/auth/otp_verification_page.dart';
import 'package:rcv_firebase/themes/app_colors.dart' as app_colors;

class ResetPasswordPage extends StatelessWidget {
  final TextEditingController emailController = TextEditingController();
  final FocusNode emailFocusNode = FocusNode();

  ResetPasswordPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [
              app_colors.AppColors.primaryLight,
              app_colors.AppColors.primary,
            ],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
        ),
        child: Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Top-aligned back button
                Align(
                  alignment: Alignment.topLeft,
                  child: Padding(
                    padding: const EdgeInsets.only(top: 48.0, left: 8.0),
                    child: IconButton(
                      icon: Icon(Icons.arrow_back, color: Colors.white),
                      onPressed: () {
                        Navigator.of(context).pop();
                      },
                    ),
                  ),
                ),
                // Centered content
                Expanded(
                  child: Center(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 32),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          SizedBox(height: 8),
                          Text(
                            'RESET YOUR PASSWORD',
                            style: TextStyle(
                              fontSize: 22,
                              color: app_colors.AppColors.white,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          SizedBox(height: 8),
                          Text(
                            "Enter your valid email address and we'll send you a one-time password (OTP).",
                            style: TextStyle(
                              color: app_colors.AppColors.white.withOpacity(
                                0.7,
                              ),
                            ),
                            textAlign: TextAlign.center,
                          ),
                          AnimatedFormField(
                            label: 'EMAIL',
                            hint: 'Email',
                            controller: emailController,
                            focusNode: emailFocusNode,
                          ),

                          SizedBox(height: 24),
                          AppButtons(
                            text: 'Submit',
                            size: 48,
                            textColor: app_colors.AppColors.primary,
                            backgroundColor: app_colors.AppColors.white,
                            borderColor: app_colors.AppColors.primary,
                            icon: Icon(
                              Icons.send,
                              color: app_colors.AppColors.primary,
                            ),
                            onPressed: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => OtpVerificationPage(),
                                ),
                              );
                            },
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
