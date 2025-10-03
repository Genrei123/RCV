"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateToken = exports.rateLimit = void 0;
const CustomError_1 = __importDefault(require("../utils/CustomError"));
/**
 * Middleware to validate input data for specific routes.
 * This middleware checks if the required fields are present and valid in the request body.
 *
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 * @param {NextFunction} next - The next middleware function in the Express chain.
 */
const requestCounts = new Map();
const NOW = Date.now();
const WINDOWMS = 15 * 60 * 1000; // 15 minutes
const MAXREQUESTS = 100; // 100 requests per window
const rateLimit = (req, res, next) => {
    const ip = req.ip || 'unknown';
    // Get current data for this IP
    const currentData = requestCounts.get(ip);
    // If no data exists or window has expired, reset
    if (!currentData || NOW > currentData.resetTime) {
        requestCounts.set(ip, { count: 1, resetTime: NOW + WINDOWMS });
        // Set headers
        res.set({
            'X-RateLimit-Limit': MAXREQUESTS.toString(),
            'X-RateLimit-Remaining': (MAXREQUESTS - 1).toString(),
            'X-RateLimit-Reset': Math.ceil((NOW + WINDOWMS) / 1000).toString()
        });
        return next();
    }
    // Check if limit exceeded
    if (currentData.count >= MAXREQUESTS) {
        const retryAfter = Math.ceil((currentData.resetTime - NOW) / 1000);
        res.set('Retry-After', retryAfter.toString());
        return next(CustomError_1.default.security(429, 'Too many requests. Please try again later.'));
    }
    // Increment count
    currentData.count++;
    requestCounts.set(ip, currentData);
    // Set headers
    res.set({
        'X-RateLimit-Limit': MAXREQUESTS.toString(),
        'X-RateLimit-Remaining': (MAXREQUESTS - currentData.count).toString(),
        'X-RateLimit-Reset': Math.ceil(currentData.resetTime / 1000).toString()
    });
    next();
};
exports.rateLimit = rateLimit;
const validateToken = (req, res, next) => {
    // For every request, validate the token across all devices
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        // We should logout the user
        return next(CustomError_1.default.security(401, 'Authorization header missing'));
    }
};
exports.validateToken = validateToken;
//# sourceMappingURL=securityConfig.js.map