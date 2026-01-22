# Firebase Storage Authorization Error - Fix Guide

## Problem
When submitting a report with scanned images, you're getting the error:
```
[firebase_storage/unauthorized] User is not authorized to perform the desired action.
```

## Root Cause
By default, Firebase Storage denies **all** read and write operations. The Security Rules for your Firebase Storage bucket are not configured to allow authenticated users to upload images to the `scans/` and `avatars/` folders.

## Solution: Configure Firebase Storage Security Rules

### Step 1: Access Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **rcv-flutterfire**
3. Navigate to **Storage** in the left sidebar
4. Click on the **Rules** tab

### Step 2: Replace the Rules with the Following

Copy and paste this complete rules set:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow authenticated users to upload and read from avatars folder
    match /avatars/{userId}/? {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    // Allow authenticated users to upload and read from scans folder
    // Each scan is in a subfolder with a unique scanId
    match /scans/{scanId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }

    // Deny all other access by default
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

### Step 3: Publish the Rules
1. Click the **Publish** button in the Firebase Console
2. Confirm the publication when prompted
3. Wait for the deployment to complete (usually 1-2 seconds)

### Step 4: Verify the Fix

The rules are now deployed. Test the fix by:

1. **Run your Flutter app**
   ```bash
   flutter run
   ```

2. **Log in with a test account** (make sure you're authenticated)

3. **Navigate to the Scanning page** and capture images

4. **Submit the report** - the images should now upload successfully

5. **Check the logs** in VS Code or Android Studio for confirmation:
   - Look for: `✅ [Storage] Scan images uploaded successfully`
   - Or: `👤 [Auth] User authenticated: your.email@example.com`

### Step 5: Verify Files in Firebase Console

After a successful upload:

1. Go to **Firebase Console** → **Storage**
2. You should see a new folder: `scans/`
3. Inside, there should be a `{timestamp}/` folder
4. Inside that, you should see: `front.jpg` and `back.jpg`

---

## Understanding the Security Rules

### Rule Breakdown

**Avatar Rule:**
```javascript
match /avatars/{userId}/? {
  allow read: if request.auth != null;
  allow write: if request.auth != null && request.auth.uid == userId;
}
```
- Only authenticated users can read avatars
- Users can only upload their own avatar (must match their user ID)

**Scans Rule:**
```javascript
match /scans/{scanId}/{allPaths=**} {
  allow read: if request.auth != null;
  allow write: if request.auth != null;
}
```
- Only authenticated users can read scan images
- Only authenticated users can write/upload scan images
- Any authenticated user can upload to any scanId (this is OK because each scan has a unique timestamp-based ID)

---

## Troubleshooting

### Issue: Still Getting "Unauthorized" Error

**Check 1: Verify User Authentication**
- Look at the app logs for: `👤 [Auth] User authenticated:` message
- If you see: `⚠️ [Auth] Not authenticated` → User is not logged in
- Solution: Make sure you're logged in with a valid account

**Check 2: Verify Firebase Storage Bucket**
- Open Firebase Console → Project Settings
- Confirm the storage bucket name matches: `rcv-flutter.firebasestorage.app`
- Your app should be configured to use this bucket

**Check 3: Verify Rules Are Published**
- Go to Firebase Console → Storage → Rules tab
- The rules should show your uploaded code (not default deny rules)
- Check the "Last updated" timestamp - it should be recent

**Check 4: Clear App Cache**
```bash
flutter clean
flutter pub get
flutter run
```

### Issue: Files Not Appearing in Firebase Console

- Uploads might be failing silently
- Check the detailed error logs in VS Code or Android Studio
- Look for error messages starting with `❌ [Storage]`
- Share the full error message for debugging

### Issue: Upload Succeeds But Report Fails to Save

- The upload is working, but the backend API call might be failing
- Check if the backend is rejecting the Firebase URLs
- Verify the image URLs are valid by testing them in a browser
- The URL should be publicly accessible and show your scanned image

---

## What the App Does

### During Report Submission:

1. **Capture Images**
   - User takes front and back photos of product

2. **Perform OCR**
   - Text is extracted from images using Tesseract and ML Kit
   - Images are automatically converted to grayscale for better OCR accuracy

3. **Upload to Firebase Storage**
   - Images are sent directly to Firebase Storage (client-side)
   - Authentication token is included in the upload request
   - On success, download URLs are generated for both images

4. **Submit Report**
   - OCR text and image URLs are sent to backend API
   - Backend validates the URLs point to Firebase Storage
   - Scan record is saved in database with image references

### Authentication Flow:

```
User Login (SharedPreferences stores token)
         ↓
Firebase Storage Upload (token sent with request)
         ↓
Backend API Call (token in Authorization header)
         ↓
Scan Record Saved (with image URLs)
```

---

## Security Considerations

### Why This is Secure:

1. **Only Authenticated Users Can Upload**
   - `request.auth != null` ensures user must be logged in
   - Anonymous users cannot upload

2. **Firebase Auth Integration**
   - Your app uses JWT tokens stored in SharedPreferences
   - Firebase Storage validates these tokens

3. **File Size Limits**
   - Consider adding file size validation to your rules:
   ```javascript
   allow write: if request.auth != null && 
                request.resource.size < 10 * 1024 * 1024; // 10 MB limit
   ```

4. **Folder Structure**
   - `avatars/` folder strictly isolated for profile pictures
   - `scans/` folder for product scan images
   - Other paths explicitly denied

### Recommended: Add File Size & Type Validation

For enhanced security, update the rules to:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Helper function to validate image files
    function isValidImage() {
      return request.resource.contentType.matches('image/.*') &&
             request.resource.size <= 10 * 1024 * 1024; // 10 MB max
    }

    match /avatars/{userId}/? {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
                      request.auth.uid == userId &&
                      isValidImage();
    }

    match /scans/{scanId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
                      isValidImage();
    }

    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

---

## Testing Checklist

After applying the rules:

- [ ] Rules deployed to Firebase Console (confirmed)
- [ ] Flutter app can run without compilation errors
- [ ] Can log into the app with a test account
- [ ] Can capture images on Scanning page
- [ ] Image upload completes successfully (check logs)
- [ ] Report submission completes without errors
- [ ] Images appear in Firebase Console → Storage → scans/ folder
- [ ] Backend database shows scan record with image URLs
- [ ] Image URLs are accessible (can open in browser)

---

## Next Steps

1. **Apply the rules** using the step-by-step guide above
2. **Test the upload** by submitting a report
3. **Verify success** by checking Firebase Console
4. **Monitor logs** for authentication status

If you still encounter issues, provide:
- Full error message from app logs
- Screenshot of Firebase Console Rules tab
- Timestamp of when you attempted the upload

