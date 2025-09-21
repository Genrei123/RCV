import 'package:flutter/material.dart';

class AppFonts {
  // Font families
  static const String lexend = 'Lexend';
  static const String inter = 'Inter';

  // Font weights
  static const FontWeight bold = FontWeight.bold;
  static const FontWeight semiBold = FontWeight.w600;
  static const FontWeight normal = FontWeight.normal;

  // Font sizes
  static const double title = 20.0;
  static const double subtitle = 10.0;
  static const double label = 10.0;
  static const double content = 10.0;

  // TextStyles
  static TextStyle titleStyle = const TextStyle(
    fontFamily: lexend,
    fontWeight: bold,
    fontSize: title,
  );

  static TextStyle subtitleStyle = const TextStyle(
    fontFamily: inter,
    fontWeight: semiBold,
    fontSize: subtitle,
  );

  static TextStyle labelStyle = const TextStyle(
    fontFamily: inter,
    fontWeight: normal,
    fontSize: label,
  );

  static TextStyle contentStyle = const TextStyle(
    fontFamily: inter,
    fontWeight: normal,
    fontSize: content,
  );
}
