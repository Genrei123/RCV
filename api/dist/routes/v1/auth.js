"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Auth_1 = require("../../controllers/auth/Auth");
const verifyUser_1 = require("../../middleware/verifyUser");
const AuthRouter = (0, express_1.Router)();
// Authentication
AuthRouter.post('/login', Auth_1.userSignIn);
// AuthRouter.post('/mobile-login', mobileSignIn); // Mobile login with full JWT data
AuthRouter.post('/register', Auth_1.userSignUp);
AuthRouter.post('/logout', Auth_1.logout);
AuthRouter.post('/refreshToken', Auth_1.refreshToken);
AuthRouter.get('/me', Auth_1.me);
// Password Management
AuthRouter.post('/change-password', verifyUser_1.verifyUser, Auth_1.changePassword);
// Password Reset Flow (New 3-step process)
AuthRouter.post('/forgot-password', Auth_1.requestPasswordReset);
AuthRouter.post('/verify-reset-code', Auth_1.verifyResetCode);
AuthRouter.post('/reset-password', Auth_1.resetPassword);
// Legacy Password Reset (Keep for backwards compatibility)
AuthRouter.post('/generateForgotPassword', Auth_1.generateForgotPassword);
AuthRouter.get('/forgotPassword/:token', Auth_1.forgotPassword);
exports.default = AuthRouter;
//# sourceMappingURL=auth.js.map