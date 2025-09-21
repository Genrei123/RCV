import 'package:flutter/material.dart';
import '../widgets/app_buttons.dart';
import 'package:rcv_firebase/auth/reset_new_password_page.dart';
import 'package:rcv_firebase/themes/app_colors.dart' as app_colors;

class OtpVerificationPage extends StatelessWidget {
  const OtpVerificationPage({super.key});

  @override
  Widget build(BuildContext context) {
    final otpControllers = List.generate(6, (_) => TextEditingController());
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
          child: Center(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 32),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    'ENTER VERIFICATION CODE',
                    style: TextStyle(
                      fontSize: 22,
                      color: app_colors.AppColors.white,
                      fontWeight: FontWeight.w500,
                      letterSpacing: 1.2,
                    ),
                  ),
                  SizedBox(height: 12),
                  Text(
                    "Enter your valid email address and we'll send you a one-time password (OTP).",
                    style: TextStyle(
                      color: app_colors.AppColors.white.withOpacity(0.7),
                    ),
                    textAlign: TextAlign.center,
                  ),
                  SizedBox(height: 32),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(6, (index) {
                      return Container(
                        width: 40,
                        height: 56,
                        margin: EdgeInsets.symmetric(horizontal: 6),
                        decoration: BoxDecoration(
                          color: app_colors.AppColors.white,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: TextField(
                          controller: otpControllers[index],
                          textAlign: TextAlign.center,
                          style: TextStyle(fontSize: 24),
                          maxLength: 1,
                          keyboardType: TextInputType.number,
                          decoration: InputDecoration(
                            counterText: '',
                            border: InputBorder.none,
                          ),
                        ),
                      );
                    }),
                  ),
                  SizedBox(height: 16),
                  Text.rich(
                    TextSpan(
                      text: "Didn't receive any OTP code? ",
                      style: TextStyle(
                        color: app_colors.AppColors.white.withOpacity(0.7),
                      ),
                      children: [
                        WidgetSpan(
                          child: GestureDetector(
                            onTap: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => ResetNewPasswordPage(),
                                ),
                              );
                            },
                            child: Text(
                              'Resend code',
                              style: TextStyle(
                                color: app_colors.AppColors.white,
                                decoration: TextDecoration.underline,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  SizedBox(height: 24),
                  AppButtons(
                    text: 'Submit',
                    size: 48,
                    textColor: app_colors.AppColors.primary,
                    backgroundColor: app_colors.AppColors.white,
                    borderColor: app_colors.AppColors.primary,
                    icon: Icon(
                      Icons.check,
                      color: app_colors.AppColors.primary,
                    ),
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => ResetNewPasswordPage(),
                        ),
                      );
                    },
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
