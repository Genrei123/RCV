# Flutter REST API Configuration Guide

This guide provides a comprehensive template for setting up REST API communication in your Flutter application using Dio. This configuration is designed to work with your existing backend API and provides a clean, maintainable architecture.

## 📁 Project Structure

```
lib/
├── config/
│   └── api_constants.dart          # API endpoints and configuration
├── models/
│   └── api_models.dart            # Data models and type definitions
└── services/
    ├── api_client.dart            # Base Dio configuration with interceptors
    ├── token_service.dart         # JWT token management
    ├── auth_service.dart          # Authentication operations
    ├── product_service.dart       # Product management operations
    └── scan_service.dart          # Scan/verification operations
```

## 🚀 Quick Start

### 1. Dependencies

Make sure these dependencies are in your `pubspec.yaml`:

```yaml
dependencies:
  dio: ^4.0.0
  shared_preferences: ^2.0.0
  flutter/foundation: # Built-in (for kDebugMode)
```

### 2. Configuration

Update `lib/config/api_constants.dart` with your API details:

```dart
// Change these URLs to match your backend
static const String developmentUrl = 'http://10.0.2.2:3000/api/v1';
static const String stagingUrl = 'https://staging-api.yourproject.com/api/v1';
static const String productionUrl = 'https://api.yourproject.com/api/v1';

// Update current environment
static const Environment currentEnvironment = Environment.development;
```

### 3. Basic Usage Examples

#### Authentication

```dart
import 'package:your_app/services/auth_service.dart';

// Login
final loginResult = await AuthService.login('user@example.com', 'password');
if (loginResult.success) {
  final user = loginResult.data?.user;
  print('Logged in as: ${user?.fullName}');
} else {
  print('Login failed: ${loginResult.message}');
}

// Check authentication status
final isAuthenticated = await AuthService.isAuthenticated();
if (isAuthenticated) {
  // User is logged in
} else {
  // Redirect to login
}

// Logout
await AuthService.logout();
```

#### Products

```dart
import 'package:your_app/services/product_service.dart';

// Get products
final productsResult = await ProductService.getProducts(
  page: 1,
  limit: 20,
  search: 'product name',
  status: ProductStatus.active,
);

if (productsResult.success) {
  final products = productsResult.data ?? [];
  for (final product in products) {
    print('Product: ${product.name} - ${product.price}');
  }
}

// Get product by ID
final productResult = await ProductService.getProductById('product-id');
if (productResult.success) {
  final product = productResult.data!;
  print('Product: ${product.name}');
}

// Verify product by QR code
final verifyResult = await ProductService.verifyProductByQR('QR_CODE_DATA');
if (verifyResult.success) {
  final product = verifyResult.data!;
  print('Verified: ${product.name}');
}
```

#### Scans/Verifications

```dart
import 'package:your_app/services/scan_service.dart';

// Create a scan
final scanLocation = ScanLocation(
  latitude: 40.7128,
  longitude: -74.0060,
  address: '123 Main St',
  city: 'New York',
  country: 'USA',
);

final scanResult = await ScanService.createScan(
  productId: 'product-id',
  result: ScanResult.verified,
  location: scanLocation,
  notes: 'Product verified successfully',
);

if (scanResult.success) {
  final scan = scanResult.data!;
  print('Scan created: ${scan.id}');
}

// Get recent scans
final recentScans = await ScanService.getRecentScans(limit: 10);
if (recentScans.success) {
  for (final scan in recentScans.data ?? []) {
    print('Scan: ${scan.result} at ${scan.timestamp}');
  }
}
```

## 🏗️ Architecture Overview

### API Client (`api_client.dart`)

The `ApiClient` is a singleton that provides:

- **Authentication**: Automatic token injection and refresh
- **Error Handling**: User-friendly error messages
- **Logging**: Debug logging for development
- **Retry Logic**: Automatic retry for failed requests
- **File Upload**: Support for image and file uploads

```dart
// Access the singleton instance
final apiClient = ApiClient.instance;

// Make requests
final response = await apiClient.get('/endpoint');
final response = await apiClient.post('/endpoint', data: {...});
```

### Token Service (`token_service.dart`)

Manages JWT tokens with:

- **Secure Storage**: Uses SharedPreferences for token storage
- **Expiry Tracking**: Automatic token expiry detection
- **Refresh Logic**: Handles token refresh automatically

```dart
// Check if user has valid token
final isValid = await TokenService.isTokenValid();

// Get token info for debugging
final tokenInfo = await TokenService.getTokenInfo();
```

### Service Layer

Each service (`AuthService`, `ProductService`, `ScanService`) provides:

- **Type Safety**: All responses use strongly-typed models
- **Error Handling**: Consistent error handling pattern
- **API Wrapper**: Clean abstraction over HTTP calls

## 🔧 Configuration Options

### Environment Management

Switch between environments in `api_constants.dart`:

```dart
static const Environment currentEnvironment = Environment.development; // or staging, production
```

### Timeout Configuration

Adjust timeouts for your network conditions:

```dart
static const int connectTimeout = 30000;  // 30 seconds
static const int receiveTimeout = 30000;  // 30 seconds
static const int sendTimeout = 30000;     // 30 seconds
```

### Token Refresh

Configure when tokens should be refreshed:

```dart
static const Duration tokenRefreshThreshold = Duration(minutes: 5);
```

## 🛡️ Security Features

### Automatic Token Management

- Tokens are automatically attached to requests
- Expired tokens trigger automatic refresh
- Failed refresh redirects to login

### Secure Storage

- Tokens stored in SharedPreferences (encrypted on device)
- Automatic cleanup on logout
- No tokens exposed in code or logs

### Request Validation

- All requests validated against response schema
- Type-safe models prevent runtime errors
- Comprehensive error handling

## 📱 Integration with Flutter State Management

### With Provider

```dart
class AuthProvider with ChangeNotifier {
  User? _user;
  bool _isLoading = false;

  bool get isAuthenticated => _user != null;
  User? get user => _user;
  bool get isLoading => _isLoading;

  Future<void> login(String email, String password) async {
    _isLoading = true;
    notifyListeners();

    final result = await AuthService.login(email, password);
    if (result.success) {
      _user = result.data?.user;
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<void> logout() async {
    await AuthService.logout();
    _user = null;
    notifyListeners();
  }
}
```

### With Bloc

```dart
class AuthBloc extends Bloc<AuthEvent, AuthState> {
  AuthBloc() : super(AuthInitial()) {
    on<LoginRequested>(_onLoginRequested);
    on<LogoutRequested>(_onLogoutRequested);
  }

  Future<void> _onLoginRequested(
    LoginRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());
    
    final result = await AuthService.login(event.email, event.password);
    if (result.success) {
      emit(AuthSuccess(result.data!.user));
    } else {
      emit(AuthFailure(result.message ?? 'Login failed'));
    }
  }
}
```

## 🔄 Migration from HTTP Package

If you're currently using the `http` package, here's how to migrate:

### Before (http package)
```dart
final response = await http.post(
  Uri.parse('$baseUrl/api/endpoint'),
  headers: {'Content-Type': 'application/json'},
  body: jsonEncode(data),
);
final responseData = jsonDecode(response.body);
```

### After (Dio)
```dart
final response = await ApiClient.instance.post('/endpoint', data: data);
final responseData = response.data;
```

## 🚦 Error Handling

### Service Level

All services return `ApiResponse<T>` which includes:

```dart
final result = await ProductService.getProducts();
if (result.success) {
  // Handle success
  final products = result.data ?? [];
} else {
  // Handle error
  print('Error: ${result.message}');
  print('Errors: ${result.errors?.join(', ')}');
}
```

### Global Error Handling

The API client automatically handles common errors:

- **Network errors**: Timeout, connection issues
- **HTTP errors**: 400, 401, 403, 404, 500, etc.
- **Authentication errors**: Token expiry, invalid tokens
- **Validation errors**: Field validation failures

## 📊 Monitoring and Debugging

### Debug Logging

In development mode, all requests and responses are logged:

```
🚀 REQUEST: POST /auth/login
📤 Headers: {Content-Type: application/json, Accept: application/json}
📦 Data: {email: user@example.com, password: [HIDDEN]}
✅ RESPONSE: 200 /auth/login
📥 Data: {success: true, data: {...}}
```

### Token Information

Get detailed token information for debugging:

```dart
final tokenInfo = await TokenService.getTokenInfo();
print('Token Info: $tokenInfo');
// Output: {hasAccessToken: true, hasRefreshToken: true, isValid: true, timeUntilExpiry: 45}
```

## 🔐 Best Practices

### 1. Always Handle Errors

```dart
final result = await SomeService.someOperation();
if (result.success) {
  // Success path
} else {
  // Show user-friendly error message
  showErrorDialog(result.message ?? 'Operation failed');
}
```

### 2. Check Authentication Before API Calls

```dart
if (await AuthService.isAuthenticated()) {
  // Make authenticated API calls
} else {
  // Redirect to login
}
```

### 3. Use Loading States

```dart
setState(() => isLoading = true);
final result = await ProductService.getProducts();
setState(() => isLoading = false);
```

### 4. Handle Offline Scenarios

```dart
try {
  final result = await ProductService.getProducts();
  // Handle success
} catch (e) {
  if (e.toString().contains('No internet connection')) {
    // Show offline message
    showOfflineMessage();
  }
}
```

## 🧪 Testing

### Mock Services for Testing

```dart
class MockProductService extends ProductService {
  @override
  static Future<ApiResponse<List<Product>>> getProducts() async {
    // Return mock data
    return ApiResponse<List<Product>>(
      success: true,
      data: [
        Product(id: '1', name: 'Test Product', ...),
      ],
    );
  }
}
```

## 📋 TODO for Implementation

1. **Update API URLs**: Change the URLs in `api_constants.dart` to match your backend
2. **Add Environment Variables**: Consider using flutter_dotenv for sensitive configuration
3. **Implement Navigation**: Add navigation logic for authentication redirects
4. **Add Offline Support**: Implement caching for offline functionality
5. **Error Reporting**: Add crash reporting (Firebase Crashlytics, Sentry)
6. **Push Notifications**: Add FCM token management if needed
7. **Biometric Auth**: Add local authentication for enhanced security

## 🤝 Integration Steps

1. **Copy Files**: Add all service files to your project
2. **Update Dependencies**: Add required packages to pubspec.yaml
3. **Configure URLs**: Update API endpoints in api_constants.dart
4. **Test Connection**: Start with auth service to test connectivity
5. **Integrate UI**: Connect services to your existing UI components
6. **Handle States**: Implement loading and error states in your UI
7. **Test Thoroughly**: Test all CRUD operations and error scenarios

This template provides a production-ready foundation for REST API integration in Flutter. Customize it according to your specific backend API requirements and business logic.