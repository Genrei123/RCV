import 'package:flutter/material.dart';
import '../widgets/app_buttons.dart';
import '../widgets/animated_form_field.dart';
import 'package:rcv_firebase/auth/login_page.dart';

class ResetNewPasswordPage extends StatelessWidget {
  const ResetNewPasswordPage({super.key});

  @override
  Widget build(BuildContext context) {
    final newPasswordController = TextEditingController();
    final confirmPasswordController = TextEditingController();
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF00BA8E), Color(0xFF005440)],
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
                      color: Colors.white,
                      fontWeight: FontWeight.w500,
                      letterSpacing: 1.2,
                    ),
                  ),
                  SizedBox(height: 32),
                  AnimatedFormField(
                    label: 'New Password',
                    hint: 'New Password',
                    controller: newPasswordController,
                    obscureText: true,
                    suffixIcon: Icon(Icons.visibility),
                  ),
                  SizedBox(height: 16),
                  AnimatedFormField(
                    label: 'Confirm New Password',
                    hint: 'Confirm New Password',
                    controller: confirmPasswordController,
                    obscureText: true,
                    suffixIcon: Icon(Icons.visibility),
                  ),
                  SizedBox(height: 24),
                  AppButtons(
                    text: 'Submit',
                    size: 48,
                    textColor: Color(0xFF005440),
                    backgroundColor: Colors.white,
                    borderColor: Color(0xFF005440),
                    icon: Icon(Icons.check, color: Color(0xFF005440)),
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
