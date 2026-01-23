## Firebase Storage Authorization Error - Diagnosis & Solution

### Error
```
[firebase_storage/unauthorized] User is not authorized to perform the desired action.
```

### Root Cause
**Firebase Storage Security Rules are not configured to allow authenticated users to upload to the `scans/` folder.**

Firebase Storage requires explicit rules to determine who can upload files. By default, all access is denied unless you have rules that explicitly allow it.

---

## Solution: Update Firebase Storage Rules

Your Firebase Storage rules should look like this:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    
    // Allow authenticated users to upload scan images
    // Path: scans/{scanId}/front.jpg and scans/{scanId}/back.jpg
    match /scans/{scanId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null 
        && (resource == null || resource.size < 10 * 1024 * 1024); // Max 10MB
    }
    
    // Allow authenticated users to upload and manage their avatars
    // Path: avatars/{userId}.jpg
    match /avatars/{userId} {
      allow read: if true; // Public read
      allow write: if request.auth != null 
        && request.auth.uid == userId
        && resource == null
        && request.resource.size < 5 * 1024 * 1024; // Max 5MB
    }
    
    // Deny all other access
    match /{allPaths=**} {
      allow read: if false;
      allow write: if false;
    }
  }
}
```

### How to Apply These Rules:

1. **Go to Firebase Console**
   - Visit https://console.firebase.google.com/
   - Select your RCV project

2. **Navigate to Storage Rules**
   - Click on "Storage" in the left sidebar
   - Click on the "Rules" tab

3. **Copy and Paste the Rules Above**
   - Replace the current rules with the ones provided above
   - Click "Publish"

---

## What These Rules Do:

✅ **Allow** authenticated users to upload to `scans/{scanId}/`
✅ **Allow** authenticated users to upload to `avatars/{userId}`  
✅ **Prevent** unauthenticated users from uploading (anonymous uploads rejected)
✅ **Prevent** users from uploading files larger than the size limit (security)
✅ **Deny** access to any other paths

---

## Why You're Getting This Error:

The Firebase Storage rules likely either:

1. **Don't exist** - Default deny all access
2. **Require manual authentication** - Users aren't authenticated to Firebase Auth
3. **Have wrong paths** - Rules don't match your `/scans/` folder structure
4. **Require different conditions** - Rules checking for fields that don't exist

---

## Troubleshooting Steps:

### Step 1: Verify User is Authenticated
The app logs now include Firebase Auth status. Check the logs:

```
👤 [Auth] Authenticated as: user@email.com (UID: uid_12345)
🔐 [Auth] Email verified: true
🔑 [Auth] ID Token: Available
```

If you see:
```
⚠️ [Auth] Not authenticated - Anonymous uploads may be rejected
```

**The user is not logged into Firebase Auth.** This is the problem!

### Step 2: Ensure Firebase Auth is Working

The app should authenticate with Firebase Auth when:
1. User logs in via `/mobile/login` endpoint ✅ (sets JWT token)
2. Firebase Auth automatically signs in the user ✅ (should happen automatically)

**If this isn't happening, check:**
- Is the user actually logged into the app?
- Did the login return a valid JWT token?
- Is Firebase Auth configured in the Flutter app?

### Step 3: Check Firebase Project Configuration

Verify Firebase is properly initialized:
- Firebase project ID matches in `google-services.json` (Android)
- Firebase project ID matches in `GoogleService-Info.plist` (iOS)

---

## Expected Behavior After Fix:

```
📤 [Storage] Uploading scan images for: 1234567890
👤 [Auth] Authenticated as: user@email.com (UID: uid_12345)
✅ [Storage] Scan images uploaded successfully
Front: https://firebasestorage.googleapis.com/.../scans/1234567890/front.jpg?...
Back: https://firebasestorage.googleapis.com/.../scans/1234567890/back.jpg?...
```

---

## Additional Security Considerations:

### Why Not Allow Anonymous Uploads?

Anonymous uploads are dangerous because:
- Anyone can upload unlimited files (DoS attack)
- No audit trail of who uploaded what
- Violates compliance requirements (you need to track scans per user)

### File Size Limits

The rules limit uploads to:
- **Scans**: 10MB (allows high-quality product images)
- **Avatars**: 5MB (smaller, profile pictures)

Adjust these if needed based on your use case.

### Storage Costs

Each upload/download costs money in Firebase:
- Write operations: ~$0.005 per 10K writes
- Read operations: ~$0.001 per 10K reads
- Storage: ~$0.020 per GB/month

Optimize by:
- Compressing images client-side
- Deleting old scans periodically
- Setting expiration policies

---

## Testing the Fix:

After updating the rules:

1. **Log into the app** with a test account
2. **Go to Scanning page** 
3. **Capture images and submit report**
4. **Check logs** - Should see `✅ [Storage] Scan images uploaded successfully`
5. **Firebase Console** - Files should appear in Storage → `scans/` folder

---

## If Problem Persists:

1. **Check app logs** for the exact error message (may have more details)
2. **Verify user is logged in** - Check Firebase Auth status in logs
3. **Check Firebase rules** - Make sure you published the changes
4. **Clear app cache** - Sometimes Flutter caches old Firebase configs
5. **Restart app** - Reconnect to Firebase
6. **Check network** - Ensure device has internet connectivity

---

## Next Steps:

The updated `firebase_storage_service.dart` now logs:
- ✅ Current Firebase Auth status
- ✅ User email and UID
- ✅ Whether email is verified
- ✅ Detailed error messages

Run the app again and **share the complete log output** from the upload attempt. This will help diagnose the exact issue.
