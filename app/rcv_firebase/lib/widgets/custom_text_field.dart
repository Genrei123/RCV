import 'package:flutter/material.dart';
import 'package:rcv_firebase/themes/app_fonts.dart';
import 'package:rcv_firebase/themes/app_colors.dart' as app_colors;

class CustomTextField extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final String? hint;
  final bool obscure;
  final bool readOnly;

  const CustomTextField({
    Key? key,
    required this.controller,
    required this.label,
    this.hint,
    this.obscure = false,
    this.readOnly = false,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      obscureText: obscure,
      readOnly: readOnly,
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 12,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(
            color: app_colors.AppColors.darkNeutral,
            width: 1.5,
          ),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: app_colors.AppColors.primary, width: 2),
        ),
        labelStyle: AppFonts.labelStyle.copyWith(
          color: app_colors.AppColors.darkNeutral,
        ),
        suffixIcon: obscure
            ? Icon(Icons.visibility, color: app_colors.AppColors.darkNeutral)
            : null,
      ),
    );
  }
}
