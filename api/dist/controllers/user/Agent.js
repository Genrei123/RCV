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
exports.scanQR = void 0;
const reportGeneration_1 = require("../../utils/reportGeneration");
const customErrorHandler_1 = __importDefault(require("../../middleware/customErrorHandler"));
const scanQR = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const qrCode = req.body.qrCode;
    if (!validateQRCode(qrCode)) {
        return res.status(400).json({ error: 'Invalid QR code format' });
    }
    try {
        const report = (0, reportGeneration_1.generateReport)(req);
        res.status(200).json({ report });
    }
    catch (error) {
        (0, customErrorHandler_1.default)(error, req, res, next);
    }
});
exports.scanQR = scanQR;
const validateQRCode = (code) => {
    // Simple validation: check if the code is a non-empty string
    if (!code)
        return false;
    return typeof code === 'string' && code.trim().length > 0;
};
//# sourceMappingURL=Agent.js.map