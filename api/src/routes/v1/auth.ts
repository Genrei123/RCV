import { Router } from 'express';
import { userSignIn, logout, me, refreshToken, userSignUp, forgotPassword, generateForgotPassword } from '../../controllers/auth/Auth';

const AuthRouter = Router();

AuthRouter.post('/login', userSignIn);
AuthRouter.post('/register', userSignUp);
AuthRouter.post('/logout', logout);
AuthRouter.post('/refreshToken', refreshToken);
AuthRouter.get('/me', me);
AuthRouter.post('/generateForgotPassword', generateForgotPassword);
AuthRouter.get('/forgotPassword/:token', forgotPassword)

export default AuthRouter;
