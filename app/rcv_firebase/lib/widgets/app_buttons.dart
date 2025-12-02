import 'package:flutter/material.dart';

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
  final TextStyle? textStyle;
  final TextStyle? subTitleStyle;

  const AppButtons.main({
    super.key,
    required this.text,
    this.subTitle,
    required this.size,
    required this.textColor,
    required Color color,
    required this.icon,
    this.onPressed,
    this.margin,
    this.contentAlignment = MainAxisAlignment.start,
    this.textStyle,
    this.subTitleStyle,
  }) : backgroundColor = color,
       borderColor = Colors.transparent;

  // Outline button: transparent, colored border
  const AppButtons.outline({
    super.key,
    required this.text,
    required this.size,
    required this.textColor,
    required Color outlineColor,
    required this.icon,
    this.onPressed,
    this.margin,
    this.contentAlignment = MainAxisAlignment.start,
    this.subTitle,
    this.textStyle,
    this.subTitleStyle,
  }) : backgroundColor = Colors.transparent,
       borderColor = outlineColor;

  // Default constructor (for custom use)
  const AppButtons({
    super.key,
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
    this.textStyle,
    this.subTitleStyle,
  });

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
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    text,
                    style:
                        textStyle ?? TextStyle(color: textColor, fontSize: 16),
                  ),
                  if (subTitle != null)
                    Text(
                      subTitle!,
                      style:
                          subTitleStyle ??
                          TextStyle(
                            color: textColor.withValues(alpha: 0.8),
                            fontSize: 12,
                            fontWeight: FontWeight.w400,
                          ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
