"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JWT_MOBILE_USERPAYLOAD = exports.JWT_USERPAYLOAD = void 0;
exports.createToken = createToken;
exports.createMobileToken = createMobileToken;
exports.createForgotPasswordToken = createForgotPasswordToken;
exports.verifyToken = verifyToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv = __importStar(require("dotenv"));
const zod_1 = __importDefault(require("zod"));
dotenv.config();
exports.JWT_USERPAYLOAD = zod_1.default.object({
    sub: zod_1.default.string(),
    isAdmin: zod_1.default.boolean(),
});
exports.JWT_MOBILE_USERPAYLOAD = zod_1.default.object({
    sub: zod_1.default.string(),
    email: zod_1.default.string(),
    firstName: zod_1.default.string(),
    middleName: zod_1.default.string().nullable().optional(),
    lastName: zod_1.default.string(),
    extName: zod_1.default.string().nullable().optional(),
    fullName: zod_1.default.string(),
    role: zod_1.default.string(),
    status: zod_1.default.string(),
    badgeId: zod_1.default.string().nullable().optional(),
    location: zod_1.default.string().nullable().optional(),
    phoneNumber: zod_1.default.string().nullable().optional(),
    dateOfBirth: zod_1.default.string().nullable().optional(),
    avatarUrl: zod_1.default.string().nullable().optional(),
    isAdmin: zod_1.default.boolean(),
});
if (!process.env.JWT_SECRET || !process.env.JWT_EXPIRES_IN || !process.env.JWT_ALGORITHM) {
    throw new Error("JWT Environment is not defined");
}
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN;
const JWT_ALGORITHM = process.env.JWT_ALGORITHM;
function createToken(User) {
    return jsonwebtoken_1.default.sign(User, JWT_SECRET, {
        algorithm: JWT_ALGORITHM,
        expiresIn: JWT_EXPIRES_IN,
    });
}
function createMobileToken(User) {
    return jsonwebtoken_1.default.sign(User, JWT_SECRET, {
        algorithm: JWT_ALGORITHM,
        expiresIn: JWT_EXPIRES_IN,
    });
}
function createForgotPasswordToken(UserEmail) {
    return jsonwebtoken_1.default.sign(UserEmail, JWT_SECRET, {
        algorithm: JWT_ALGORITHM,
        expiresIn: JWT_EXPIRES_IN
    });
}
function verifyToken(token) {
    try {
        const decoded = jsonwebtoken_1.default.verify(token.replace("Bearer ", ""), JWT_SECRET, { algorithms: [JWT_ALGORITHM] });
        return exports.JWT_USERPAYLOAD.safeParse(decoded);
    }
    catch (error) {
        console.error(error);
    }
}
//# sourceMappingURL=JWT.js.map