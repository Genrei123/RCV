import { Request } from 'express';
import { TReportData } from '../types/types';

/**
 * Generates a report based on the provided data.
 * @param {Request} req - The Express request object.
 * @returns {Object} - The generated report.
 */

export const generateReport = (req: Request): TReportData => {
    // TO DO
    return req as unknown as TReportData;
}

export const aiSuggestion = (report: TReportData): string => {
    // TO DO
    return "";
}

