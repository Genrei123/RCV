"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const nodemailer_1 = require("nodemailer");
const nodemailer_transporter = (0, nodemailer_1.createTransport)({
    service: 'gmail',
    auth: {
        user: "genreycristobal03@gmail.com",
        pass: "fnnc qbub wegs aztd",
    },
});
exports.default = nodemailer_transporter;
//# sourceMappingURL=nodemailer.js.map