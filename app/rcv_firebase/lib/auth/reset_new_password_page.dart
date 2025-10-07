import 'package:flutter/material.dart';
import '../widgets/app_buttons.dart';
import '../widgets/animated_form_field.dart';
import 'package:rcv_firebase/auth/login_page.dart';
import 'package:rcv_firebase/themes/app_colors.dart' as app_colors;

class ResetNewPasswordPage extends StatelessWidget {
  const ResetNewPasswordPage({super.key});

  @override
  Widget build(BuildContext context) {
    final newPasswordController = TextEditingController();
    final confirmPasswordController = TextEditingController();
    final newPasswordFocusNode = FocusNode();
    final confirmPasswordFocusNode = FocusNode();
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
        child: SafeArea(
          child: Center(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 32),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    'RESET YOUR PASSWORD',
                    style: TextStyle(
                      fontSize: 22,
                      color: app_colors.AppColors.white,
                      fontWeight: FontWeight.w500,
                      letterSpacing: 1.2,
                    ),
                  ),
                  SizedBox(height: 24),
                  AnimatedFormField(
                    label: 'New Password',
                    hint: 'New Password',
                    controller: newPasswordController,
                    focusNode: newPasswordFocusNode,
                    obscureText: true,
                    suffixIcon: Icon(
                      Icons.visibility,
                      color: app_colors.AppColors.muted,
                    ),
                  ),
                  SizedBox(height: 16),
                  AnimatedFormField(
                    label: 'Confirm New Password',
                    hint: 'Confirm New Password',
                    controller: confirmPasswordController,
                    focusNode: confirmPasswordFocusNode,
                    obscureText: true,
                    suffixIcon: Icon(
                      Icons.visibility,
                      color: app_colors.AppColors.muted,
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
                        MaterialPageRoute(builder: (context) => LoginPage()),
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
