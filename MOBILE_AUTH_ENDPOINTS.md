# Mobile Authentication Endpoints 📱

## Overview
Mobile-specific authentication endpoints that return **full user data embedded in the JWT token** for offline access in the Flutter mobile app.

## Endpoints

### 1. Mobile Login
**POST** `/api/v1/auth/mobile-login`

Returns a JWT token with complete user profile data embedded, allowing the mobile app to work offline.

#### Request Body
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Success Response (200)
```json
{
  "success": true,
  "message": "Mobile sign in successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "user-id",
    "email": "user@example.com",
    "firstName": "John",
    "middleName": "Doe",
    "lastName": "Smith",
    "extName": "Jr.",
    "fullName": "John Doe Smith Jr.",
    "role": "USER",
    "status": "active",
    "badgeId": "BADGE123",
    "location": "Manila",
    "phoneNumber": "+639123456789",
    "dateOfBirth": "1990-01-01",
    "avatarUrl": "https://example.com/avatar.jpg",
    "approved": true
  }
}
```

#### JWT Token Contains
The mobile token includes all user data:
- `sub` - User ID
- `email` - User email
- `firstName`, `middleName`, `lastName`, `extName` - Full name components
- `fullName` - Concatenated full name
- `role` - User role (USER, ADMIN, etc.)
- `status` - Account status
- `badgeId` - Badge identifier
- `location` - User location
- `phoneNumber` - Contact number
- `dateOfBirth` - Date of birth
- `avatarUrl` - Profile picture URL
- `isAdmin` - Boolean flag
- `iat` - Issued at timestamp

#### Error Responses

**401 Unauthorized** - Invalid credentials
```json
{
  "success": false,
  "message": "Invalid email or password",
  "token": null,
  "user": null
}
```

**403 Forbidden** - Account not approved
```json
{
  "success": false,
  "message": "Your account is pending approval. Please wait for an administrator to approve your account.",
  "approved": false,
  "email": "user@example.com"
}
```

---

### 2. Mobile Register
**POST** `/api/v1/auth/mobile-register`

Register a new mobile user account (requires admin approval).

#### Request Body
```json
{
  "email": "newuser@example.com",
  "password": "securePassword123",
  "firstName": "Jane",
  "middleName": "Marie",
  "lastName": "Doe",
  "extName": "Sr.",
  "phoneNumber": "+639123456789",
  "location": "Quezon City",
  "badgeId": "BADGE456",
  "dateOfBirth": "1995-05-15"
}
```

**Required Fields:**
- `email` (must be unique)
- `password` (minimum 6 characters)
- `firstName`
- `lastName`

**Optional Fields:**
- `middleName`
- `extName`
- `phoneNumber`
- `location`
- `badgeId`
- `dateOfBirth`
- `avatarUrl`

#### Success Response (200)
```json
{
  "success": true,
  "message": "Registration successful! Your account is pending approval. You will be notified once an administrator approves your account.",
  "user": {
    "email": "newuser@example.com",
    "firstName": "Jane",
    "middleName": "Marie",
    "lastName": "Doe",
    "extName": "Sr.",
    "approved": false
  },
  "pendingApproval": true
}
```

#### Error Responses

**400 Bad Request** - Validation failed
```json
{
  "success": false,
  "message": "Parsing failed, incomplete information",
  "errors": [
    {
      "path": ["email"],
      "message": "Invalid email format"
    }
  ]
}
```

**400 Bad Request** - Email already exists
```json
{
  "success": false,
  "message": "Email already exists",
  "email": "existing@example.com"
}
```

---

## Differences from Web Auth

| Feature | Web Auth (`/login`, `/register`) | Mobile Auth (`/mobile-login`, `/mobile-register`) |
|---------|----------------------------------|---------------------------------------------------|
| JWT Payload | Minimal (only `sub` and `isAdmin`) | Full user profile data |
| Use Case | Web dashboard with server calls | Mobile app with offline access |
| Token Size | Small (~200 bytes) | Larger (~1-2KB) |
| Audit Log | Platform: "WEB" | Platform: "MOBILE" |
| Response Data | Basic user info | Complete user profile |

---

## Integration with Flutter App

### 1. Login Flow
```dart
Future<void> mobileLogin(String email, String password) async {
  final response = await http.post(
    Uri.parse('$baseUrl/api/v1/auth/mobile-login'),
    headers: {'Content-Type': 'application/json'},
    body: jsonEncode({
      'email': email,
      'password': password,
    }),
  );

  if (response.statusCode == 200) {
    final data = jsonDecode(response.body);
    
    // Store token
    await storage.write(key: 'auth_token', value: data['token']);
    
    // Store user data for offline access
    await storage.write(key: 'user_data', value: jsonEncode(data['user']));
    
    // Decode JWT to get embedded user data when offline
    final jwtPayload = parseJwt(data['token']);
    // jwtPayload contains all user fields
  }
}
```

### 2. Offline Access
```dart
// When offline, decode JWT to access user data
Map<String, dynamic> getUserFromToken(String token) {
  final parts = token.split('.');
  final payload = parts[1];
  final normalized = base64Url.normalize(payload);
  final decoded = utf8.decode(base64Url.decode(normalized));
  return jsonDecode(decoded);
}

// Access user data without API call
final userData = getUserFromToken(storedToken);
print(userData['fullName']); // "John Doe Smith Jr."
print(userData['role']);     // "USER"
```

---

## Security Notes

⚠️ **Important Considerations:**

1. **Token Size**: Mobile tokens are larger due to embedded data. Ensure your mobile app can handle ~1-2KB tokens.

2. **Data Freshness**: User data in the token is a snapshot from login time. For critical operations, verify with the server.

3. **Token Expiration**: Tokens expire based on `JWT_EXPIRES_IN` env variable. Implement token refresh logic.

4. **Sensitive Data**: Passwords are never included in tokens. Only non-sensitive profile data is embedded.

5. **Audit Trail**: All mobile logins are logged with platform "MOBILE" for tracking.

---

## Testing

### cURL Examples

**Mobile Login:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/mobile-login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

**Mobile Register:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/mobile-register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "securePass123",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "+639123456789"
  }'
```

---

## Environment Variables Required

Ensure these are set in your `.env` file:
```env
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
JWT_ALGORITHM=HS256
```

---

## Next Steps for Flutter Integration

1. ✅ **Backend Ready** - Mobile auth endpoints are live
2. 📱 **Flutter Implementation** - Create login/register screens
3. 🔐 **Token Storage** - Use flutter_secure_storage for tokens
4. 📡 **Offline Mode** - Decode JWT for offline user access
5. 🔄 **Token Refresh** - Implement auto-refresh before expiration
6. 📝 **User Approval** - Handle pending approval state in UI
