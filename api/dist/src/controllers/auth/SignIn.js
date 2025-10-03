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
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const CustomError_1 = __importDefault(require("../../utils/CustomError"));
const data_source_1 = require("../../typeorm/data-source");
const validateSignIn_1 = __importDefault(require("../../utils/validateSignIn"));
const JWT_1 = require("../../utils/JWT");
/**
 * UserSignIn - Controller for Signing In a User
 * @param req - Request Object from the Client
 * @param res - Response Object to reply to Client
 * @returns an object of appropriate response
 */
const UserSignIn = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const data = (0, validateSignIn_1.default)(req);
    // If an error occurs in validation
    if (data.error || !data.form) {
        const error = new CustomError_1.default(400, data.error, {
            success: false,
            token: null,
            user: null,
        });
        return next(error);
    }
    try {
        const { email, password } = data.form;
        // Find the user by email
        const user = yield data_source_1.UserRepo.findOne({
            where: { email },
            select: ['email', 'firstName', 'password'],
        });
        if (!user) {
            const error = new CustomError_1.default(401, 'Invalid email or password', {
                success: false,
                token: null,
                user: null,
            });
            return next(error);
        }
        // Verify the password
        const isPasswordValid = bcryptjs_1.default.compareSync(password, user.password);
        if (!isPasswordValid) {
            const error = new CustomError_1.default(401, 'Invalid email or password', {
                success: false,
                token: null,
                user: null,
            });
            return next(error);
        }
        const userPayload = {
            id: user._id,
            role: user.role === 0 ? true : false,
            iat: Date.now()
        };
        const token = (0, JWT_1.createToken)(userPayload);
        return res.status(200).json({
            success: true,
            message: 'User signed in successfully',
            token,
            user: { fullName: user.fullName, email: user.email, isAdmin: user.role === 0 ? true : false },
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
exports.default = UserSignIn;
//# sourceMappingURL=SignIn.js.map