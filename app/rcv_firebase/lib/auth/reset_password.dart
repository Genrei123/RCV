import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../widgets/app_buttons.dart';
import '/widgets/animated_form_field.dart';
import 'package:rcv_firebase/auth/otp_verification_page.dart';

class ResetPasswordPage extends StatelessWidget {
  final TextEditingController emailController = TextEditingController();

  ResetPasswordPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF00BA8E), Color(0xFF005440)],
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
                              color: Colors.white,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          SizedBox(height: 8),
                          Text(
                            "Enter your valid email address and we'll send you a one-time password (OTP).",
                            style: TextStyle(color: Colors.white70),
                            textAlign: TextAlign.center,
                          ),
                          SizedBox(height: 32),
                          AnimatedFormField(
                            label: 'EMAIL',
                            hint: 'Email',
                            controller: emailController,
                          ),
                          SizedBox(height: 24),
                          AppButtons(
                            text: 'Submit',
                            size: 48,
                            textColor: Color(0xFF005440),
                            backgroundColor: Colors.white,
                            borderColor: Color(0xFF005440),
                            icon: Icon(Icons.send, color: Color(0xFF005440)),
                            onPressed: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(builder: (context) => OtpVerificationPage()),
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
