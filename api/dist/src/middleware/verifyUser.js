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
exports.isAdmin = exports.verifyUser = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const data_source_1 = require("../typeorm/data-source");
const CustomError_1 = __importDefault(require("../utils/CustomError"));
const JWT_1 = require("../utils/JWT");
/**
 * Middleware to verify user authentication using JWT.
 *
 * This middleware performs the following steps:
 * 1. Extracts the JWT from the Authorization header
 * 2. Verifies the JWT using the secret key
 * 3. Finds the user in the database based on the userId in the JWT payload
 * 4. Attaches the user object to the request for use in subsequent middleware or route handlers
 *
 * @throws {CustomError} 401 - If no token is provided or the token is invalid
 * @throws {CustomError} 401 - If the token has expired
 * @throws {CustomError} 404 - If the user associated with the token is not found
 * @throws {CustomError} 500 - For any other unexpected errors
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
const verifyUser = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new CustomError_1.default(401, 'No token provided in the Authorization Header', { success: false });
        }
        const token = authHeader.split(' ')[1];
        // Verify the token
        const decoded = (0, JWT_1.verifyToken)(token);
        const user = yield data_source_1.UserRepo.findOne({ where: { _id: decoded.userId } });
        if (!user)
            throw new CustomError_1.default(404, 'User not found', { success: false });
        // Add the user to the request object
        req.user = user;
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            return next(new CustomError_1.default(401, 'Sorry, token has expired. Sign in again to get a new token.', { success: false }));
        }
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError)
            return next(new CustomError_1.default(401, 'Unauthorized Access. You have provided an invalid token', { success: false }));
        if (error instanceof CustomError_1.default)
            return next(error);
        return next(new CustomError_1.default(500, 'Internal server error', { success: false }));
    }
});
exports.verifyUser = verifyUser;
const isAdmin = (req, res, next) => {
    var _a;
    const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1];
    if (!token) {
        return res.status(401).json({ success: false, message: 'No token provided' });
    }
    try {
        const decoded = (0, JWT_1.verifyToken)(token);
        if (decoded.role !== true) { // Assuming role 'true' indicates admin
            return res.status(403).json({ success: false, message: 'Access denied. Admins only.' });
        }
        next();
    }
    catch (error) {
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }
};
exports.isAdmin = isAdmin;
const extractRole = (role) => {
    switch (role) {
        case 0:
            return 'Admin';
        case 1:
            return 'Agent';
    }
};
//# sourceMappingURL=verifyUser.js.map