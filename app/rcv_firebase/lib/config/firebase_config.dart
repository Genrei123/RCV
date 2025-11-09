// Firebase Configuration from Environment Variables
// This file reads Firebase configuration from .env file
import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;
import 'package:flutter_dotenv/flutter_dotenv.dart';

/// Firebase configuration using environment variables
/// 
/// IMPORTANT: Firebase API keys are NOT secret!
/// - They are meant to be public and included in your app
/// - Security is handled by Firebase Security Rules, not by hiding keys
/// - These keys identify your Firebase project, they don't grant access
/// 
/// However, using .env helps with:
/// - Managing different environments (dev/staging/prod)
/// - Keeping configuration organized
/// - Easy deployment to different environments
class FirebaseConfig {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      return web;
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      case TargetPlatform.macOS:
        throw UnsupportedError(
          'FirebaseConfig has not been configured for macOS',
        );
      case TargetPlatform.windows:
        return windows;
      case TargetPlatform.linux:
        throw UnsupportedError(
          'FirebaseConfig has not been configured for Linux',
        );
      default:
        throw UnsupportedError(
          'FirebaseConfig is not supported for this platform.',
        );
    }
  }

  static FirebaseOptions get web => FirebaseOptions(
        apiKey: dotenv.env['FIREBASE_WEB_API_KEY'] ?? '',
        appId: dotenv.env['FIREBASE_WEB_APP_ID'] ?? '',
        messagingSenderId: dotenv.env['FIREBASE_WEB_MESSAGING_SENDER_ID'] ?? '',
        projectId: dotenv.env['FIREBASE_WEB_PROJECT_ID'] ?? '',
        authDomain: dotenv.env['FIREBASE_WEB_AUTH_DOMAIN'] ?? '',
        storageBucket: dotenv.env['FIREBASE_WEB_STORAGE_BUCKET'] ?? '',
        measurementId: dotenv.env['FIREBASE_WEB_MEASUREMENT_ID'] ?? '',
      );

  static FirebaseOptions get android => FirebaseOptions(
        apiKey: dotenv.env['FIREBASE_ANDROID_API_KEY'] ?? '',
        appId: dotenv.env['FIREBASE_ANDROID_APP_ID'] ?? '',
        messagingSenderId:
            dotenv.env['FIREBASE_ANDROID_MESSAGING_SENDER_ID'] ?? '',
        projectId: dotenv.env['FIREBASE_ANDROID_PROJECT_ID'] ?? '',
        storageBucket: dotenv.env['FIREBASE_ANDROID_STORAGE_BUCKET'] ?? '',
      );

  static FirebaseOptions get ios => FirebaseOptions(
        apiKey: dotenv.env['FIREBASE_IOS_API_KEY'] ?? '',
        appId: dotenv.env['FIREBASE_IOS_APP_ID'] ?? '',
        messagingSenderId: dotenv.env['FIREBASE_IOS_MESSAGING_SENDER_ID'] ?? '',
        projectId: dotenv.env['FIREBASE_IOS_PROJECT_ID'] ?? '',
        storageBucket: dotenv.env['FIREBASE_IOS_STORAGE_BUCKET'] ?? '',
        iosBundleId: dotenv.env['FIREBASE_IOS_BUNDLE_ID'] ?? '',
      );

  static FirebaseOptions get windows => FirebaseOptions(
        apiKey: dotenv.env['FIREBASE_WINDOWS_API_KEY'] ?? '',
        appId: dotenv.env['FIREBASE_WINDOWS_APP_ID'] ?? '',
        messagingSenderId:
            dotenv.env['FIREBASE_WINDOWS_MESSAGING_SENDER_ID'] ?? '',
        projectId: dotenv.env['FIREBASE_WINDOWS_PROJECT_ID'] ?? '',
        authDomain: dotenv.env['FIREBASE_WINDOWS_AUTH_DOMAIN'] ?? '',
        storageBucket: dotenv.env['FIREBASE_WINDOWS_STORAGE_BUCKET'] ?? '',
        measurementId: dotenv.env['FIREBASE_WINDOWS_MEASUREMENT_ID'] ?? '',
      );
}
