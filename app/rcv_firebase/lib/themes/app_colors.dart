import 'package:flutter/material.dart';

class AppColors {
  // 🌿 Light Theme Colors (Department of Agriculture)
  static const Color primary = Color(0xFF005440);   // Headers, buttons, highlights
  static const Color primaryLight = Color(0xFF00BA8E);   // Headers, buttons, highlights

  static const Color accent = Color(0xFF002D72);      // Secondary buttons, footers, hover states
  static const Color secondary = Color(0xFFA5C9A1);   // Accent elements, icons, CTAs
  static const Color neutral = Color(0xFFF0F2F5);      // Secondary backgrounds, dividers
  static const Color text = Color(0xFF000000);          // Primary text, icons
  static const Color white = Color(0xFFFFFFFF);          // Backgrounds, cards, clean areas
  static const Color muted = Color(0xFFB7B7B7); // for placeholders

  // Optional semantic colors (Light Mode)
  static const Color error = Color(0xFFD64541);                 // Error color
  static const Color success = Color(0xFF4C9F70);        // Success green

  // 🌙 Dark Theme Colors
  // 🌙 Dark Theme Colors (aligned with Light Theme)
  static const Color darkPrimary = Color(0xFF00A76F);      // Headers, buttons, highlights (brighter green)
  static const Color darkAccent = Color(0xFFFFC107);       // Secondary buttons, footers, hover states (golden yellow)
  static const Color darkSecondary = Color(0xFF81C784);    // Accent elements, icons, CTAs (muted green)
  static const Color darkNeutral = Color(0xFF1E1E1E);      // Secondary backgrounds, dividers (surface)
  static const Color darkText = Color(0xFFE0E0E0);         // Primary text, icons (light gray)
  static const Color darkWhite = Color(0xFF121212);        // Backgrounds, cards, clean areas (dark background)
  static const Color darkMuted = Color(0xFFB7B7B7);        // for placeholders (same as light)

  // Optional semantic colors (Dark Mode)
  static const Color darkError = Color(0xFFCF6679);        // Softer red for dark background
  static const Color darkSuccess = Color(0xFF81C784);      // Muted green for dark mode
}
