import { Router } from 'express';
import { verifyMobileUser } from '../../middleware/verifyMobileUser';

// Import auth controllers
import { 
  mobileSignIn,
  mobileSignUp,
  meMobile,
  refreshToken,
  changePassword,
  requestPasswordReset,
  verifyResetCode,
  resetPassword,
  logout
} from '../../controllers/auth/Auth';

// Import scan controllers
import { 
  scanProduct, 
  searchScannedProduct, 
  getScans, 
  getScansByID 
} from '../../controllers/scan/Scan';

// Import audit log controllers
import * as AuditLogController from '../../controllers/auditLog/AuditLog';

const MobileRouter = Router();

// ============================================
// MOBILE AUTHENTICATION ROUTES
// All routes use Bearer tokens (no cookies)
// ============================================

// Public Routes (No authentication required)
MobileRouter.post('/login', mobileSignIn);
MobileRouter.post('/register', mobileSignUp);

// Password Reset Flow (3-step process - No auth required)
MobileRouter.post('/forgot-password', requestPasswordReset);
MobileRouter.post('/verify-reset-code', verifyResetCode);
MobileRouter.post('/reset-password', resetPassword);

// Protected Routes (Require Bearer token)
MobileRouter.get('/me', verifyMobileUser, meMobile);
MobileRouter.post('/logout', verifyMobileUser, logout);
MobileRouter.post('/refresh-token', verifyMobileUser, refreshToken);
MobileRouter.post('/change-password', verifyMobileUser, changePassword);

// ============================================
// MOBILE SCAN ROUTES
// All scan operations require authentication
// ============================================
MobileRouter.post('/scan', verifyMobileUser, scanProduct);
MobileRouter.post('/scan/search', verifyMobileUser, searchScannedProduct);
MobileRouter.get('/scan/history', verifyMobileUser, getScans);
MobileRouter.get('/scan/history/:id', verifyMobileUser, getScansByID);

// ============================================
// MOBILE AUDIT LOG ROUTES
// Track user actions in the mobile app
// ============================================
MobileRouter.post('/audit/log', verifyMobileUser, AuditLogController.createAuditLog);
MobileRouter.get('/audit/my-logs', verifyMobileUser, AuditLogController.getMyAuditLogs);
MobileRouter.get('/audit/logs/:id', verifyMobileUser, AuditLogController.getAuditLogById);

// ============================================
// FUTURE MOBILE ROUTES
// Add mobile-specific routes here as needed
// ============================================
// MobileRouter.get('/profile', verifyMobileUser, getMobileProfile);
// MobileRouter.patch('/profile', verifyMobileUser, updateMobileProfile);

export default MobileRouter;
