import { Router } from 'express';
import { 
  userSignIn,
  mobileSignIn,
  mobileSignUp,
  logout, 
  me, 
  refreshToken, 
  userSignUp, 
  forgotPassword, 
  generateForgotPassword,
  requestPasswordReset,
  verifyResetCode,
  resetPassword,
  changePassword
} from '../../controllers/auth/Auth';
import { verifyUser } from '../../middleware/verifyUser';

const AuthRouter = Router();

// Web Authentication
AuthRouter.post('/login', userSignIn);
AuthRouter.post('/register', userSignUp);

// Mobile Authentication (includes full user data in JWT)
AuthRouter.post('/mobile-login', mobileSignIn);
AuthRouter.post('/mobile-register', mobileSignUp);

// Common Auth Routes
AuthRouter.post('/logout', logout);
AuthRouter.post('/refreshToken', refreshToken);
AuthRouter.get('/me', me);

// Password Management
AuthRouter.post('/change-password', verifyUser, changePassword);

// Password Reset Flow (New 3-step process)
AuthRouter.post('/forgot-password', requestPasswordReset);
AuthRouter.post('/verify-reset-code', verifyResetCode);
AuthRouter.post('/reset-password', resetPassword);

// Legacy Password Reset (Keep for backwards compatibility)
AuthRouter.post('/generateForgotPassword', generateForgotPassword);
AuthRouter.get('/forgotPassword/:token', forgotPassword);

export default AuthRouter;
