"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Custom Error Class
 * Extends the built-in Error class to include a status code and optional data.
 */
class CustomError extends Error {
    /**
     * Constructor for the CustomError class.
     *
     * @param {number} statusCode - The HTTP status code.
     * @param {string} message - The error message.
     * @param {{ [key: string]: any }} data - Optional data associated with the error.
     */
    constructor(statusCode, message, data = {}) {
        super(message);
        this.statusCode = statusCode;
        this.message = message;
        this.data = data;
    }
    static security(statusCode, message, data = {}) {
        return new CustomError(statusCode, message, data);
    }
}
exports.default = CustomError;
//# sourceMappingURL=CustomError.js.map