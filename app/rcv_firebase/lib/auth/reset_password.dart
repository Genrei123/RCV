import 'package:flutter/material.dart';
import '../widgets/app_buttons.dart';
import '../widgets/animated_form_field.dart';
import 'package:rcv_firebase/themes/app_colors.dart' as app_colors;
import '../services/auth_service.dart';
import '../widgets/processing_modal.dart';
import 'package:flutter/scheduler.dart';

class ResetPasswordPage extends StatefulWidget {
  const ResetPasswordPage({super.key});

  @override
  State<ResetPasswordPage> createState() => _ResetPasswordPageState();
}

class _ResetPasswordPageState extends State<ResetPasswordPage> {
  final TextEditingController emailController = TextEditingController();
  final FocusNode emailFocusNode = FocusNode();
  final AuthService _authService = AuthService();

  String? emailError;
  bool hasEmailError = false;
  bool isSubmitting = false;

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
  }

  @override
  void dispose() {
    emailController.dispose();
    emailFocusNode.dispose();
    super.dispose();
  }

  Future<void> handleSubmit() async {
    final email = emailController.text.trim();

    // Validate email
    setState(() {
      emailError = null;
      hasEmailError = false;
    });

    if (email.isEmpty) {
      setState(() {
        emailError = 'Email is required';
        hasEmailError = true;
      });
      return;
    }

    if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(email)) {
      setState(() {
        emailError = 'Please enter a valid email';
        hasEmailError = true;
      });
      return;
    }

    setState(() => isSubmitting = true);

    try {
      // Show processing modal
      showProcessingModal(context, message: 'Sending reset link...');

      final result = await _authService.sendPasswordResetEmail(email);

      // Hide processing modal
      if (!mounted) return;
      hideProcessingModal(context);

      if (result['success'] == true) {
        // Show success dialog
        if (!mounted) return;
        await showDialog(
          context: context,
          barrierDismissible: false,
          builder: (context) => AlertDialog(
            title: Row(
              children: [
                Icon(Icons.check_circle, color: app_colors.AppColors.primary, size: 28),
                SizedBox(width: 12),
                Text('Email Sent!'),
              ],
            ),
            content: Text(
              'We\'ve sent a password reset link to $email. Please check your inbox and follow the instructions.',
              style: TextStyle(fontSize: 16),
            ),
            actions: [
              TextButton(
                onPressed: () {
                  Navigator.of(context).pop(); // Close dialog
                },
                child: Text(
                  'OK',
                  style: TextStyle(
                    color: app_colors.AppColors.primary,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
        );
        
        // After dialog closes, go back to login
        if (!mounted) return;
        Navigator.of(context).pop();
      } else {
        // Show error message
        setState(() {
          emailError = result['message'] ?? 'Failed to send reset email';
          hasEmailError = true;
        });

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(result['message'] ?? 'Failed to send reset email'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      // Hide processing modal if still showing
      if (mounted) {
        try {
          hideProcessingModal(context);
        } catch (_) {
          // Modal may already be dismissed
        }
      }

      if (mounted) {
        setState(() {
          emailError = 'Network error. Please try again.';
          hasEmailError = true;
        });

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Network error. Please try again.'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => isSubmitting = false);
      }
    }
  }

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
        child: SafeArea(
          child: Column(
            children: [
              // Back button
              Align(
                alignment: Alignment.topLeft,
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: IconButton(
                    icon: Icon(Icons.arrow_back, color: Colors.white, size: 28),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ),
              ),
              // Centered content
              Expanded(
                child: Center(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.symmetric(horizontal: 32),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        // Email icon
                        Container(
                          padding: EdgeInsets.all(24),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.2),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            Icons.email_outlined,
                            size: 64,
                            color: Colors.white,
                          ),
                        ),
                        SizedBox(height: 32),
                        Text(
                          'RESET YOUR PASSWORD',
                          style: TextStyle(
                            fontSize: 22,
                            color: app_colors.AppColors.white,
                            fontWeight: FontWeight.w500,
                            letterSpacing: 1.2,
                          ),
                        ),
                        SizedBox(height: 16),
                        Text(
                          "Enter your email address and we'll send you a link to reset your password.",
                          style: TextStyle(
                            color: app_colors.AppColors.white.withOpacity(0.9),
                            fontSize: 15,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        SizedBox(height: 32),
                        AnimatedFormField(
                          label: 'EMAIL',
                          hint: 'Enter your email',
                          controller: emailController,
                          focusNode: emailFocusNode,
                          hasError: hasEmailError,
                          errorText: emailError,
                          errorTextColor: Colors.white,
                        ),
                        SizedBox(height: 32),
                        AppButtons(
                          text: isSubmitting ? 'Sending...' : 'Send Reset Link',
                          size: 48,
                          textColor: app_colors.AppColors.primary,
                          backgroundColor: app_colors.AppColors.white,
                          borderColor: app_colors.AppColors.primary,
                          icon: Icon(
                            Icons.send,
                            color: app_colors.AppColors.primary,
                          ),
                          onPressed: isSubmitting ? null : handleSubmit,
                        ),
                        SizedBox(height: 24),
                        GestureDetector(
                          onTap: () => Navigator.of(context).pop(),
                          child: Text(
                            'Back to Login',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 15,
                              fontWeight: FontWeight.w500,
                              decoration: TextDecoration.underline,
                            ),
                          ),
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
    );
  }
}
