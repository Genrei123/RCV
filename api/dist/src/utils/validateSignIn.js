"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Validates and sanitizes the sign-in form data.
 * taken from req.body
 * @param {Request} req - The Express request object.
 * @returns  An object with the validation result.
 */
const validateSignInForm = (req) => {
    const { email, password } = req.body;
    // Use a better input validation like Joi or Zod or sanitize or express-validator
    if (!email)
        return { error: 'Required field: email', data: null };
    if (!password)
        return { error: 'Required field: password', data: null };
    return {
        error: null,
        form: { email, password },
    };
};
exports.default = validateSignInForm;
//# sourceMappingURL=validateSignIn.js.map