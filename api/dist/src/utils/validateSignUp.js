"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Validates and sanitizes the sign-up form data.
 * taken from req.body
 * @param {Request} req - The Express request object.
 * @returns  An object with the validation result.
 */
const validateSignUpForm = (req) => {
    const { fullName, email, dateOfBirth, phoneNumber, password } = req.body;
    // Use a better input validation like Joi or Zod or sanitize or express-validator
    // And To Sanitize user input against SQL Injection
    if (!fullName)
        return { error: 'Required field: fullName', data: null };
    if (!email)
        return { error: 'Required field: email', data: null };
    if (!dateOfBirth)
        return { error: 'Required field: dateOfBirth', data: null };
    if (!phoneNumber)
        return { error: 'Required field: phoneNumber', data: null };
    if (!password)
        return { error: 'Required field: password', data: null };
    if (typeof fullName !== 'string' || fullName.trim().length < 3 || fullName.trim().length > 100) {
        return { error: 'Invalid fullName', data: null };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (typeof email !== 'string' || !emailRegex.test(email)) {
        return { error: 'Invalid email address', data: null };
    }
    if (typeof phoneNumber !== 'string' || phoneNumber.trim().length < 10 || phoneNumber.trim().length > 15) {
        return { error: 'Invalid phoneNumber', data: null };
    }
    if (typeof password !== 'string' || password.length < 6) {
        return { error: 'Password must be at least 6 characters long', data: null };
    }
    return {
        error: null,
        form: { fullName, email, dateOfBirth, phoneNumber, password },
    };
};
exports.default = validateSignUpForm;
//# sourceMappingURL=validateSignUp.js.map