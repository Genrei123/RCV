import 'package:flutter/material.dart';
import 'package:rcv_firebase/themes/app_colors.dart';

class AppButtons extends StatelessWidget {
  final Color textColor;
  final Color backgroundColor;
  final Color borderColor;
  final String text;
  final Icon icon;
  final double size;
  final VoidCallback? onPressed;
  final EdgeInsetsGeometry? margin;
  final MainAxisAlignment contentAlignment;

  // Main button: filled, no border
  final String? subTitle;

  const AppButtons.main({
    Key? key,
    required this.text,
    this.subTitle,
    required this.size,
    required this.textColor,
    required Color color,
    required this.icon,
    this.onPressed,
    this.margin,
    this.contentAlignment = MainAxisAlignment.start,
  }) : backgroundColor = color,
       borderColor = Colors.transparent,
       super(key: key);

  // Outline button: transparent, colored border
  const AppButtons.outline({
    Key? key,
    required this.text,
    required this.size,
    required this.textColor,
    required Color outlineColor,
    required this.icon,
    this.onPressed,
    this.margin,
    this.contentAlignment = MainAxisAlignment.start,
    this.subTitle,
  }) : backgroundColor = Colors.transparent,
       borderColor = outlineColor,
       super(key: key);

  // Default constructor (for custom use)
  const AppButtons({
    Key? key,
    required this.text,
    required this.size,
    required this.textColor,
    required this.backgroundColor,
    required this.borderColor,
    required this.icon,
    this.subTitle,
    this.onPressed,
    this.margin,
    this.contentAlignment = MainAxisAlignment.center,
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
        child: Container(
          width: double.infinity,
          height: size,
          margin: margin,
          decoration: BoxDecoration(
            color: backgroundColor,
            borderRadius: BorderRadius.circular(15),
            border: Border.all(color: borderColor, width: 1.0),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Row(
            mainAxisAlignment: contentAlignment,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              icon,
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      text,
                      style: TextStyle(color: textColor, fontSize: 16),
                    ),
                    if (subTitle != null)
                      Text(
                        subTitle!,
                        style: TextStyle(
                          color: textColor.withOpacity(0.8),
                          fontSize: 12,
                          fontWeight: FontWeight.w400,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
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
