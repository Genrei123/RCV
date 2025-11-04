"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePassword = exports.forgotPassword = exports.generateForgotPassword = exports.resetPassword = exports.verifyResetCode = exports.requestPasswordReset = exports.me = exports.refreshToken = exports.logout = exports.userSignUp = exports.userSignIn = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const CustomError_1 = __importDefault(require("../../utils/CustomError"));
const data_source_1 = require("../../typeorm/data-source");
const JWT_1 = require("../../utils/JWT");
const user_entity_1 = require("../../typeorm/entities/user.entity");
const nodemailer_1 = __importDefault(require("../../utils/nodemailer"));
const auditLogService_1 = require("../../services/auditLogService");
const userSignIn = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        // Find the user by email
        const user = yield data_source_1.UserRepo.findOne({
            where: { email },
            select: [
                "_id",
                "email",
                "password",
                "role",
                "approved",
                "firstName",
                "lastName",
            ],
        });
        if (!user) {
            const error = new CustomError_1.default(401, "Invalid email or password", {
                success: false,
                token: null,
                user: null,
            });
            return next(error);
        }
        // Verify the password
        const isPasswordValid = bcryptjs_1.default.compareSync(password, user.password);
        if (!isPasswordValid) {
            const error = new CustomError_1.default(401, "Invalid email or password", {
                success: false,
                token: null,
                user: null,
            });
            return next(error);
        }
        // Check if user is approved
        if (!user.approved) {
            return res.status(403).json({
                success: false,
                message: "Your account is pending approval. Please wait for an administrator to approve your account.",
                approved: false,
                email: user.email,
            });
        }
        const token = (0, JWT_1.createToken)({
            sub: user._id,
            isAdmin: user.role === "ADMIN" ? true : false,
            iat: Date.now(),
        });
        // Log the login action
        yield auditLogService_1.AuditLogService.logLogin(user._id, req, "WEB");
        return res.status(200).json({
            success: true,
            message: "User signed in successfully",
            token,
            user: {
                _id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                approved: user.approved,
            },
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
            token: null,
            user: null,
        });
    }
});
exports.userSignIn = userSignIn;
const userSignUp = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const newUser = user_entity_1.UserValidation.safeParse(req.body);
    if (!newUser || !newUser.success) {
        console.error("Validation errors:", (_a = newUser.error) === null || _a === void 0 ? void 0 : _a.issues);
        return next(new CustomError_1.default(400, "Parsing failed, incomplete information", {
            errors: (_b = newUser.error) === null || _b === void 0 ? void 0 : _b.issues,
        }));
    }
    if ((yield data_source_1.UserRepo.findOneBy({ email: (_c = newUser.data) === null || _c === void 0 ? void 0 : _c.email })) != null) {
        return next(new CustomError_1.default(400, "Email already exists", {
            email: newUser.data.email,
        }));
    }
    const hashPassword = bcryptjs_1.default.hashSync(newUser.data.password, bcryptjs_1.default.genSaltSync(10));
    newUser.data.password = hashPassword;
    // Set approved to false by default
    newUser.data.approved = false;
    yield data_source_1.UserRepo.save(newUser.data);
    return res.status(200).json({
        success: true,
        message: "Registration successful! Your account is pending approval. You will be notified once an administrator approves your account.",
        user: {
            email: newUser.data.email,
            firstName: newUser.data.firstName,
            lastName: newUser.data.lastName,
            approved: false,
        },
        pendingApproval: true,
    });
});
exports.userSignUp = userSignUp;
const logout = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    // Log logout
    return res
        .status(500)
        .json({ success: false, message: "Logout not implemented" });
});
exports.logout = logout;
const refreshToken = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    // Refresh token
    return res
        .status(500)
        .json({ success: false, message: "Refresh token not implemented" });
});
exports.refreshToken = refreshToken;
const me = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const decoded = (0, JWT_1.verifyToken)(req.headers.authorization);
    if (!decoded) {
        return next(new CustomError_1.default(400, "Token is invalid", {
            token: req.headers.authorization,
        }));
    }
    const User = yield data_source_1.UserRepo.findOne({
        where: { _id: (_a = decoded.data) === null || _a === void 0 ? void 0 : _a.sub },
        select: [
            "_id",
            "firstName",
            "middleName",
            "lastName",
            "email",
            "phoneNumber",
            "location",
            "role",
            "badgeId",
            "avatarUrl",
        ],
    });
    return res.send(User);
});
exports.me = me;
const requestPasswordReset = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email } = req.body;
        if (!email) {
            return next(new CustomError_1.default(400, "Email is required"));
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return next(new CustomError_1.default(400, "Invalid email format"));
        }
        const user = yield data_source_1.UserRepo.findOneBy({ email: email });
        if (!user) {
            // Return success even if user not found (security best practice)
            return res.status(200).json({
                success: true,
                message: "If an account exists with this email, a reset code has been sent.",
            });
        }
        // Generate 6-digit code
        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
        // Hash the code before storing
        const hashedCode = bcryptjs_1.default.hashSync(resetCode, bcryptjs_1.default.genSaltSync(10));
        // Delete any existing reset requests for this user
        yield data_source_1.ForgotPasswordRepo.delete({ requestedBy: { _id: user._id } });
        // Save new reset request with expiration (15 minutes)
        const resetRequest = data_source_1.ForgotPasswordRepo.create({
            requestedBy: user,
            key: hashedCode,
        });
        yield data_source_1.ForgotPasswordRepo.save(resetRequest);
        // Send email with 6-digit code
        try {
            yield nodemailer_1.default.sendMail({
                from: "RCV Systems <genreycristobal03@gmail.com>",
                to: email,
                subject: "Password Reset Code - RCV System",
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #005440;">Password Reset Request</h2>
            <p>You have requested to reset your password for your RCV System account.</p>
            <p>Your 6-digit verification code is:</p>
            <div style="background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #005440;">
              ${resetCode}
            </div>
            <p style="color: #666; margin-top: 20px;">
              This code will expire in 15 minutes.
            </p>
            <p style="color: #666;">
              If you didn't request this password reset, please ignore this email.
            </p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;" />
            <p style="color: #999; font-size: 12px;">
              This is an automated message from RCV System. Please do not reply to this email.
            </p>
          </div>
        `,
            });
        }
        catch (emailError) {
            console.error("Error sending email:", emailError);
            return next(new CustomError_1.default(500, "Failed to send reset code email"));
        }
        return res.status(200).json({
            success: true,
            message: "If an account exists with this email, a reset code has been sent.",
        });
    }
    catch (error) {
        console.error("Password reset request error:", error);
        return next(new CustomError_1.default(500, "Failed to process password reset request"));
    }
});
exports.requestPasswordReset = requestPasswordReset;
const verifyResetCode = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, code } = req.body;
        if (!email || !code) {
            return next(new CustomError_1.default(400, "Email and code are required"));
        }
        if (code.length !== 6 || !/^\d+$/.test(code)) {
            return res.status(200).json({ valid: false });
        }
        const user = yield data_source_1.UserRepo.findOneBy({ email: email });
        if (!user) {
            return res.status(200).json({ valid: false });
        }
        // Find the reset request
        const resetRequest = yield data_source_1.ForgotPasswordRepo.findOne({
            where: { requestedBy: { _id: user._id } },
            relations: ["requestedBy"],
        });
        if (!resetRequest) {
            return res.status(200).json({ valid: false });
        }
        // Verify the code
        const isCodeValid = bcryptjs_1.default.compareSync(code, resetRequest.key);
        return res.status(200).json({ valid: isCodeValid });
    }
    catch (error) {
        console.error("Verify reset code error:", error);
        return next(new CustomError_1.default(500, "Failed to verify reset code"));
    }
});
exports.verifyResetCode = verifyResetCode;
const resetPassword = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, code, newPassword } = req.body;
        if (!email || !code || !newPassword) {
            return next(new CustomError_1.default(400, "Email, code, and new password are required"));
        }
        // Validate password strength
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            return next(new CustomError_1.default(400, "Password must be at least 8 characters with uppercase, lowercase, and number"));
        }
        const user = yield data_source_1.UserRepo.findOneBy({ email: email });
        if (!user) {
            return next(new CustomError_1.default(400, "Invalid reset request"));
        }
        // Find and verify the reset request
        const resetRequest = yield data_source_1.ForgotPasswordRepo.findOne({
            where: { requestedBy: { _id: user._id } },
            relations: ["requestedBy"],
        });
        if (!resetRequest) {
            return next(new CustomError_1.default(400, "Invalid or expired reset code"));
        }
        // Verify the code
        const isCodeValid = bcryptjs_1.default.compareSync(code, resetRequest.key);
        if (!isCodeValid) {
            return next(new CustomError_1.default(400, "Invalid reset code"));
        }
        // Hash the new password
        const hashedPassword = bcryptjs_1.default.hashSync(newPassword, bcryptjs_1.default.genSaltSync(10));
        // Update user password
        user.password = hashedPassword;
        yield data_source_1.UserRepo.save(user);
        // Delete the used reset request
        yield data_source_1.ForgotPasswordRepo.delete({ id: resetRequest.id });
        // Send confirmation email
        try {
            yield nodemailer_1.default.sendMail({
                from: "RCV Systems <genreycristobal03@gmail.com>",
                to: email,
                subject: "Password Successfully Reset - RCV System",
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #005440;">Password Successfully Reset</h2>
            <p>Your password has been successfully reset for your RCV System account.</p>
            <p>You can now log in with your new password.</p>
            <p style="color: #666; margin-top: 20px;">
              If you didn't make this change, please contact support immediately.
            </p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;" />
            <p style="color: #999; font-size: 12px;">
              This is an automated message from RCV System. Please do not reply to this email.
            </p>
          </div>
        `,
            });
        }
        catch (emailError) {
            console.error("Error sending confirmation email:", emailError);
            // Don't fail the request if email fails
        }
        return res.status(200).json({
            success: true,
            message: "Password has been successfully reset",
        });
    }
    catch (error) {
        console.error("Reset password error:", error);
        return next(new CustomError_1.default(500, "Failed to reset password"));
    }
});
exports.resetPassword = resetPassword;
const generateForgotPassword = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { email } = req.body;
    if (!email) {
        return next(new CustomError_1.default(400, "No email field", { data: req.body }));
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return next(new CustomError_1.default(400, "Invalid email", { data: req.body }));
    }
    const User = yield data_source_1.UserRepo.findOneBy({ email: email });
    if (!User) {
        return next(new CustomError_1.default(200, "User not found"));
    }
    const hashKey = (0, JWT_1.createForgotPasswordToken)({ email: email, iat: Date.now() });
    data_source_1.ForgotPasswordRepo.save({ requestedBy: User, key: hashKey });
    nodemailer_1.default.sendMail({
        from: "RCV Systems <genreycristobal03@gmail.com>",
        to: "genreycristobal03@gmail.com",
        subject: "Hello ✔",
        text: "Hello world?",
        html: `<a href=${process.env.BACKEND_URL}/api/v1/auth/forgotPassword/${hashKey}>Link to reset your password</a>`,
    });
    return res
        .status(200)
        .json({
        message: "Forgot password key sent",
        email: email,
        hashKey: hashKey,
    });
});
exports.generateForgotPassword = generateForgotPassword;
const forgotPassword = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const token = req.params;
    return res.redirect(`${process.env.FRONTEND_URL}/resetPassword?token=${token}`);
});
exports.forgotPassword = forgotPassword;
// Change password for authenticated user
const changePassword = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Current password and new password are required",
            });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: "New password must be at least 6 characters long",
            });
        }
        // Find user with password field
        const user = yield data_source_1.UserRepo.findOne({
            where: { _id: userId },
            select: ["_id", "email", "password", "firstName", "lastName"],
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        // Verify current password
        const isPasswordValid = bcryptjs_1.default.compareSync(currentPassword, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Current password is incorrect",
            });
        }
        // Hash new password
        const hashedPassword = bcryptjs_1.default.hashSync(newPassword, 10);
        user.password = hashedPassword;
        yield data_source_1.UserRepo.save(user);
        // Log password change
        yield auditLogService_1.AuditLogService.createLog({
            action: "User changed their password",
            actionType: "CHANGE_PASSWORD",
            userId,
            platform: "WEB",
            metadata: { email: user.email },
            req,
        });
        return res.status(200).json({
            success: true,
            message: "Password changed successfully",
        });
    }
    catch (error) {
        next(error);
        return res.status(500).json({
            success: false,
            message: "Server error while changing password",
        });
    }
});
exports.changePassword = changePassword;
//# sourceMappingURL=Auth.js.map