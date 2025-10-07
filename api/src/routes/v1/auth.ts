import { Router } from 'express';
import { 
  userSignIn, 
  logout, 
  me, 
  refreshToken, 
  userSignUp, 
  forgotPassword, 
  generateForgotPassword,
  requestPasswordReset,
  verifyResetCode,
  resetPassword
} from '../../controllers/auth/Auth';

const AuthRouter = Router();

// Authentication
AuthRouter.post('/login', userSignIn);
AuthRouter.post('/register', userSignUp);
AuthRouter.post('/logout', logout);
AuthRouter.post('/refreshToken', refreshToken);
AuthRouter.get('/me', me);

// Password Reset Flow (New 3-step process)
AuthRouter.post('/forgot-password', requestPasswordReset);
AuthRouter.post('/verify-reset-code', verifyResetCode);
AuthRouter.post('/reset-password', resetPassword);

// Legacy Password Reset (Keep for backwards compatibility)
AuthRouter.post('/generateForgotPassword', generateForgotPassword);
AuthRouter.get('/forgotPassword/:token', forgotPassword);

export default AuthRouter;
