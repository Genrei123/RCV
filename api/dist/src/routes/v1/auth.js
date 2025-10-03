"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const SignUp_1 = __importDefault(require("../../controllers/auth/SignUp"));
const SignIn_1 = __importDefault(require("../../controllers/auth/SignIn"));
const AuthRouter = (0, express_1.Router)();
// Add Route and Controllers Related to Auth
// Feel Free to Include other operations like
// refresh token, generate/Verify OTP, e.t.c
AuthRouter.post('/signup', SignUp_1.default);
AuthRouter.post('/signin', SignIn_1.default);
exports.default = AuthRouter;
//# sourceMappingURL=auth.js.map