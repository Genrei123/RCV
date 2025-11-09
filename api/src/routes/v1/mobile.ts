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
// FUTURE MOBILE ROUTES
// Add mobile-specific routes here as needed
// ============================================
// MobileRouter.get('/profile', verifyMobileUser, getMobileProfile);
// MobileRouter.patch('/profile', verifyMobileUser, updateMobileProfile);
// MobileRouter.get('/audit-logs', verifyMobileUser, getMobileAuditLogs);
// MobileRouter.post('/scan', verifyMobileUser, createMobileScan);

export default MobileRouter;
