// import type { NextFunction, Request, Response } from 'express';
// import { generateReport } from '../../utils/reportGeneration';
// import customErrorHandler from '../../middleware/customErrorHandler';
// import { TReportData } from '../../types/types';

// export const scanQR = async (req: Request, res: Response, next: NextFunction) => {
//     const qrCode = req.body.qrCode;
//     if (!validateQRCode(qrCode)) {
//         return res.status(400).json({ error: 'Invalid QR code format' });
//     }

//     try {
//         const report = generateReport(req);
//         res.status(200).json({ report });
//     } catch (error) {
//         customErrorHandler(error, req, res, next);
//     }
// }

// const validateQRCode = (code: string): boolean => {
//     // Simple validation: check if the code is a non-empty string
//     if (!code) return false;
//     return typeof code === 'string' && code.trim().length > 0;
// }