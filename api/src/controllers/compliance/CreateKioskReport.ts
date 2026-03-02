import { Request, Response, NextFunction } from 'express';
import { DB } from '../../typeorm/data-source';
import { ComplianceReport, KioskReportValidation } from '../../typeorm/entities/complianceReport.entity';
import CustomError from '../../utils/CustomError';
import { FirebaseStorageValidator } from '../../utils/FirebaseStorageValidator';

/**
 * Create a compliance report from a public kiosk machine.
 * No user authentication required — uses kioskId instead of agentId.
 * 
 * POST /api/v1/kiosk-report/report
 */
export const createKioskReport = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { kioskId } = req.body;

    if (!kioskId) {
      return next(new CustomError(400, 'Kiosk ID is required'));
    }

    console.log('[KioskReport] Received report from kiosk:', kioskId);

    // Validate request body using kiosk-specific schema
    const validatedData = KioskReportValidation.parse(req.body);

    // Validate image URLs (both required)
    if (!validatedData.frontImageUrl || !validatedData.backImageUrl) {
      return next(new CustomError(400, 'Both front and back image URLs are required'));
    }

    // Validate that URLs are legitimate Firebase Storage URLs
    const frontValid = FirebaseStorageValidator.isValidUrl(validatedData.frontImageUrl);
    if (!frontValid) {
      return next(new CustomError(400, 'Invalid front image URL — must be a Firebase Storage URL'));
    }

    const backValid = FirebaseStorageValidator.isValidUrl(validatedData.backImageUrl);
    if (!backValid) {
      return next(new CustomError(400, 'Invalid back image URL — must be a Firebase Storage URL'));
    }

    // Create compliance report (agentId is null for kiosk reports)
    const complianceRepo = DB.getRepository(ComplianceReport);
    const newReport = complianceRepo.create({
      kioskId: validatedData.kioskId,
      status: validatedData.status,
      scannedData: validatedData.scannedData,
      productSearchResult: validatedData.productSearchResult ?? null,
      nonComplianceReason: validatedData.nonComplianceReason ?? null,
      additionalNotes: validatedData.additionalNotes ?? null,
      frontImageUrl: validatedData.frontImageUrl,
      backImageUrl: validatedData.backImageUrl,
      ocrBlobText: validatedData.ocrBlobText ?? null,
      location: validatedData.location ?? null,
      // agentId is left null — kiosk reports have no authenticated user
    });

    const savedReport = await complianceRepo.save(newReport);

    console.log('[KioskReport] Report saved successfully:', {
      reportId: savedReport._id,
      kioskId: savedReport.kioskId,
      status: savedReport.status,
    });

    res.status(201).json({
      success: true,
      message: 'Kiosk report submitted successfully',
      data: {
        _id: savedReport._id,
        kioskId: savedReport.kioskId,
        status: savedReport.status,
        createdAt: savedReport.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Error creating kiosk report:', error);

    if (error.name === 'ZodError') {
      return next(new CustomError(400, 'Validation error: ' + JSON.stringify(error.errors)));
    }

    return next(new CustomError(500, 'Failed to create kiosk report'));
  }
};
