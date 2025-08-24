import type { NextFunction, Request, Response } from 'express';
import { generateReport } from '../../utils/reportGeneration';

export const scanQR = async (req: Request, res: Response, next: NextFunction) => {
    // Generates Report
    const report = generateReport(req);
    res.status(200).json({ report });
}

