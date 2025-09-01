import 'package:flutter/material.dart';
import 'package:rcv_firebase/themes/app_colors.dart';

class AppButtons extends StatelessWidget {
  final Color textColor;
  final Color backgroundColor;
  final Color borderColor;
  final String text;
  final Icon icon; // Icon type is correct
  final double size;
  final VoidCallback? onPressed;

  const AppButtons({
    Key? key,
    required this.text,
    required this.size,
    required this.textColor,
    required this.backgroundColor,
    required this.borderColor,
    required this.icon,
    this.onPressed,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onPressed,
      child: Container(
        width: double.infinity, // Use full width instead of fixed size
        height: size, // Keep height as provided
        decoration: BoxDecoration(
          color: backgroundColor,
          borderRadius: BorderRadius.circular(15),
          border: Border.all(color: borderColor, width: 1.0),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            icon, // Include the icon
            const SizedBox(width: 8), // Space between icon and text
            Text(
              text,
              style: TextStyle(
                color: textColor,
                fontSize: 16, // Adjust font size as needed
              ),
            ),
          ],
        ),
      ),
    );
  }
}
