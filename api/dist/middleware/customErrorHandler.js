"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const CustomError_1 = __importDefault(require("../utils/CustomError"));
/**
 * Error Handler Middleware
 *
 * Catches and handles errors thrown by the application, sending a JSON response with the error details.
 *
 * @param {CustomError} err - The error object thrown by the application.
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 * @param {NextFunction} next - The next middleware function in the Express chain.
 */
const customErrorHandler = (err, req, res, next) => {
    if (err instanceof CustomError_1.default) {
        return res.status(err.statusCode).json(Object.assign({ success: false, message: err.message }, err.data));
    }
    return res.status(500).json({
        success: false,
        message: 'Internal Server Error',
    });
};
exports.default = customErrorHandler;
//# sourceMappingURL=customErrorHandler.js.map