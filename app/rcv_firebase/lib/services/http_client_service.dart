import 'package:dio/dio.dart';
import 'package:cookie_jar/cookie_jar.dart';
import 'package:dio_cookie_manager/dio_cookie_manager.dart';
import 'package:path_provider/path_provider.dart';
import 'dart:io';
import '../config/api_constants.dart';

/// HTTP Client with Cookie Support
/// 
/// This service provides a Dio instance configured to handle httpOnly cookies
/// from the backend. Cookies are persisted across app restarts.
class HttpClientService {
  static Dio? _dio;
  static PersistCookieJar? _cookieJar;

  /// Get configured Dio instance with cookie support
  static Future<Dio> getDio() async {
    if (_dio != null) {
      return _dio!;
    }

    // Initialize cookie jar for persistent cookies
    if (_cookieJar == null) {
      final appDocDir = await getApplicationDocumentsDirectory();
      final cookiePath = '${appDocDir.path}/.cookies/';
      _cookieJar = PersistCookieJar(
        ignoreExpires: false,
        storage: FileStorage(cookiePath),
      );
    }

    // Create Dio instance
    _dio = Dio(BaseOptions(
      baseUrl: ApiConstants.baseUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 30),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      // IMPORTANT: This allows cookies to be sent and received
      extra: {
        'withCredentials': true,
      },
    ));

    // Add cookie manager interceptor
    _dio!.interceptors.add(CookieManager(_cookieJar!));

    // Add logging interceptor (optional, for debugging)
    _dio!.interceptors.add(LogInterceptor(
      requestBody: true,
      responseBody: true,
      requestHeader: true,
      responseHeader: true,
      error: true,
      logPrint: (obj) => print('[HTTP] $obj'),
    ));

    return _dio!;
  }

  /// Clear all cookies (for logout)
  static Future<void> clearCookies() async {
    if (_cookieJar != null) {
      await _cookieJar!.deleteAll();
    }
  }

  /// Get cookies for specific URL
  static Future<List<Cookie>> getCookies(Uri uri) async {
    if (_cookieJar != null) {
      return await _cookieJar!.loadForRequest(uri);
    }
    return [];
  }

  /// Check if we have a valid session cookie
  static Future<bool> hasValidSession() async {
    try {
      final uri = Uri.parse('${ApiConstants.baseUrl}/api/v1/auth/me');
      final cookies = await getCookies(uri);
      
      // Check if we have a 'token' cookie
      final tokenCookie = cookies.firstWhere(
        (cookie) => cookie.name == 'token',
        orElse: () => Cookie('', ''),
      );
      
      return tokenCookie.value.isNotEmpty;
    } catch (e) {
      return false;
    }
  }
}
