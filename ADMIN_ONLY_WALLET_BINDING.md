# Admin-Only Meta-Mask Wallet Binding

## Summary
Implemented security restriction: **ONLY ADMINS can bind meta-mask information to users**

## Changes Made

### 1. Backend Controller - [SepoliaBlockchain.ts](api/src/controllers/blockchain/SepoliaBlockchain.ts)

**Updated `linkMyWallet` endpoint:**
- Changed from allowing any authenticated user to bind their own wallet to **admin-only operation**
- Added admin role verification check
- Now requires both `walletAddress` and `userId` parameters (admin specifies which user)
- Error message: "Only administrators can bind meta-mask information to users"

```typescript
// Before: Users could link their own wallet
// After: ONLY ADMINS can bind wallets to users
if (requestingUser.role !== 'ADMIN' && !requestingUser.isSuperAdmin) {
  throw new CustomError(403, 'Admin access required', {
    success: false,
    message: 'Only administrators can bind meta-mask information to users'
  });
}
```

### 2. Backend Routes - [sepoliaBlockchain.ts](api/src/routes/v1/sepoliaBlockchain.ts)

**Updated route middleware:**
- Added `verifyAdmin` middleware to `/link-my-wallet` endpoint
- Changed from: `router.post('/link-my-wallet', verifyUser, linkMyWallet);`
- Changed to: `router.post('/link-my-wallet', verifyUser, verifyAdmin, linkMyWallet);`

**Updated route documentation:**
```typescript
// ============ USER ROUTES (Auth Required) ============
// SECURITY: Only admins can bind meta-mask information to users

// Link wallet to a user - Admin only (ONLY ADMIN CAN BIND META-MASK)
router.post('/link-my-wallet', verifyUser, verifyAdmin, linkMyWallet);
```

### 3. Backend Service - [sepoliaBlockchainService.ts](api/src/services/sepoliaBlockchainService.ts)

**Updated `linkUserWallet` function documentation:**
- Added security note: ADMIN ONLY OPERATION
- Clarified that only admins can bind meta-mask information to users

**Updated success message:**
```typescript
// Before: "Wallet linked successfully. Please contact an administrator to authorize..."
// After: "Wallet bound successfully by administrator. The wallet will be authorized..."
message: 'Wallet bound successfully by administrator. The wallet will be authorized for blockchain operations after admin verification.'
```

## Security Implications

### What This Prevents
- Regular users can no longer bind their own meta-mask wallets
- Non-admin users cannot perform wallet binding operations
- Unauthorized wallet bindings are now impossible

### Access Control Summary
| Operation | User | Admin |
|-----------|------|-------|
| Bind/Link Wallet | ❌ No | ✅ Yes |
| Authorize Wallet | ❌ No | ✅ Yes |
| Revoke Wallet | ❌ No | ✅ Yes |
| Use Authorized Wallet | ✅ If Authorized | ✅ Yes |

### Validation Checks in Place
1. Authentication required (user must be logged in)
2. Admin role verification (`role === 'ADMIN'` or `isSuperAdmin`)
3. Valid Ethereum address format validation
4. Duplicate wallet address prevention
5. User existence verification

## Frontend Integration

The frontend already uses `updateUserWallet` API which:
- Is only accessible through the admin Dashboard
- Requires admin privileges to call
- Is protected by admin-only UI components in `UserDetailModal`

No frontend changes were needed as the UI already restricted wallet binding to admins.

## Testing Recommendations

1. **Test Admin Binding:**
   - Admin logs in and binds wallet to user ✅
   
2. **Test Non-Admin Rejection:**
   - Regular user tries to call `/link-my-wallet` endpoint directly
   - Should receive 403 Forbidden error
   
3. **Test Missing Parameters:**
   - Call without userId
   - Should receive 400 Bad Request error
   
4. **Test Invalid Wallet:**
   - Call with invalid Ethereum address
   - Should receive 400 Bad Request error

## Endpoints Summary

### Public Routes (No Auth)
- `GET /status` - Blockchain status
- `POST /public/verify` - Verify PDF hash
- `GET /public/certificate/:txHash` - Get certificate from blockchain

### Authenticated Routes (Regular Users)
- `GET /certificates` - View certificates
- `GET /check-wallet/:address` - Check wallet status

### Admin-Only Routes (Requires Admin Role)
- **`POST /link-my-wallet`** - ⚠️ **ADMIN ONLY** - Bind wallet to user
- `POST /authorize-wallet` - Authorize wallet for blockchain ops
- `POST /revoke-wallet` - Revoke wallet authorization
- `PUT /user-wallet/:userId` - Update user wallet and authorization

## Files Modified
1. `/api/src/controllers/blockchain/SepoliaBlockchain.ts` - Added admin check to controller
2. `/api/src/routes/v1/sepoliaBlockchain.ts` - Added verifyAdmin middleware
3. `/api/src/services/sepoliaBlockchainService.ts` - Updated documentation and messages
