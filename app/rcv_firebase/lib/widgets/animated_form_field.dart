import 'package:flutter/material.dart';
import 'package:rcv_firebase/themes/app_colors.dart' as app_colors;

class AnimatedFormField extends StatelessWidget {
  final String label;
  final String hint;
  final bool obscureText;
  final TextEditingController controller;
  final Widget? suffixIcon;
  final FocusNode focusNode;
  final bool hasError;
  final String? errorText;
  final Color? errorTextColor;

  const AnimatedFormField({
    super.key,
    required this.label,
    required this.hint,
    required this.controller,
    required this.focusNode,
    this.obscureText = false,
    this.suffixIcon,
    this.hasError = false,
    this.errorText,
    this.errorTextColor,
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: Listenable.merge([controller, focusNode]),
      builder: (context, child) {
        final hasText = controller.text.isNotEmpty;
        final isFocused = focusNode.hasFocus;
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            AnimatedOpacity(
              opacity: (isFocused || hasText) ? 1 : 0,
              duration: Duration(milliseconds: 200),
              child: Container(
                margin: EdgeInsets.only(left: 20),
                child: Text(
                  label,
                  style: TextStyle(
                    fontSize: 12,
                    color: app_colors.AppColors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
            Container(
              decoration: BoxDecoration(
                color: app_colors.AppColors.white,
                borderRadius: BorderRadius.circular(24),
              ),
              child: TextField(
                controller: controller,
                focusNode: focusNode,
                obscureText: obscureText,
                decoration: InputDecoration(
                  hintText: (!isFocused && !hasText) ? hint : '',
                  suffixIcon: suffixIcon,
                  contentPadding: EdgeInsets.symmetric(
                    horizontal: 20,
                    vertical: 12,
                  ),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(24),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(24),
                    borderSide: BorderSide(
                      color: hasError
                          ? Colors.red
                          : app_colors.AppColors.primaryLight,
                      width: hasError ? 2 : 1,
                    ),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(24),
                    borderSide: BorderSide(
                      color: hasError
                          ? Colors.red
                          : app_colors.AppColors.primary,
                      width: hasError ? 2 : 1,
                    ),
                  ),
                  errorBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(24),
                    borderSide: BorderSide(color: Colors.red, width: 2),
                  ),
                  focusedErrorBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(24),
                    borderSide: BorderSide(color: Colors.red, width: 2),
                  ),
                ),
              ),
            ),
            if (hasError && errorText != null)
              Container(
                margin: EdgeInsets.only(left: 20, top: 4),
                child: Text(
                  errorText!,
                  style: TextStyle(
                    fontSize: 12,
                    color: errorTextColor ?? Colors.red,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
          ],
        );
      },
    );
  }
}
