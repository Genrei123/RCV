import { Request, Response, NextFunction } from 'express';
import { DB } from '../../typeorm/data-source';
import { ComplianceReport, ComplianceReportValidation } from '../../typeorm/entities/complianceReport.entity';
import CustomError from '../../utils/CustomError';
import { AuditLogService } from '../../services/auditLogService';
import { FirebaseStorageValidator } from '../../utils/FirebaseStorageValidator';

/**
 * Create a new compliance report
 * POST /api/v1/mobile/compliance/report
 */
export const createComplianceReport = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Extract user from middleware
    const user = (req as any).user;
    
    if (!user || !user._id) {
      return next(new CustomError(401, 'User not authenticated'));
    }

    const userId = user._id;

    const reportData = {
      ...req.body,
      agentId: userId,
    };

    // Validate request body
    const validatedData = ComplianceReportValidation.parse(reportData);

    // Validate image URLs (front and back are required)
    if (!validatedData.frontImageUrl || !validatedData.backImageUrl) {
      return next(new CustomError(400, 'Both front and back image URLs are required'));
    }

    const frontValidation = await FirebaseStorageValidator.validateScanUrls(
      validatedData.frontImageUrl,
      undefined
    );
    if (!frontValidation.valid) {
      return next(new CustomError(400, frontValidation.error || 'Invalid front image URL'));
    }

    const backValidation = await FirebaseStorageValidator.validateScanUrls(
      undefined,
      validatedData.backImageUrl
    );
    if (!backValidation.valid) {
      return next(new CustomError(400, backValidation.error || 'Invalid back image URL'));
    }

    // Validate optional additional images if provided
    if (validatedData.leftImageUrl) {
      const leftValidation = await FirebaseStorageValidator.validateScanUrls(
        validatedData.leftImageUrl,
        undefined
      );
      if (!leftValidation.valid) {
        return next(new CustomError(400, leftValidation.error || 'Invalid left image URL'));
      }
    }

    if (validatedData.rightImageUrl) {
      const rightValidation = await FirebaseStorageValidator.validateScanUrls(
        validatedData.rightImageUrl,
        undefined
      );
      if (!rightValidation.valid) {
        return next(new CustomError(400, rightValidation.error || 'Invalid right image URL'));
      }
    }

    if (validatedData.topImageUrl) {
      const topValidation = await FirebaseStorageValidator.validateScanUrls(
        validatedData.topImageUrl,
        undefined
      );
      if (!topValidation.valid) {
        return next(new CustomError(400, topValidation.error || 'Invalid top image URL'));
      }
    }

    if (validatedData.bottomImageUrl) {
      const bottomValidation = await FirebaseStorageValidator.validateScanUrls(
        validatedData.bottomImageUrl,
        undefined
      );
      if (!bottomValidation.valid) {
        return next(new CustomError(400, bottomValidation.error || 'Invalid bottom image URL'));
      }
    }

    // Create compliance report
    const complianceRepo = DB.getRepository(ComplianceReport);
    const newReport = complianceRepo.create(validatedData);
    const savedReport = await complianceRepo.save(newReport);

    // Create audit log
    await AuditLogService.createLog({
      userId,
      action: `Agent submitted compliance report: ${validatedData.status}`,
      actionType: 'COMPLIANCE_REPORT',
      platform: 'MOBILE',
      metadata: {
        reportId: savedReport._id,
        status: validatedData.status,
        nonComplianceReason: validatedData.nonComplianceReason,
        productName: validatedData.scannedData?.productName,
        ...(validatedData.frontImageUrl && { frontImageUrl: validatedData.frontImageUrl }),
        ...(validatedData.backImageUrl && { backImageUrl: validatedData.backImageUrl }),
        ...(validatedData.leftImageUrl && { leftImageUrl: validatedData.leftImageUrl }),
        ...(validatedData.rightImageUrl && { rightImageUrl: validatedData.rightImageUrl }),
        ...(validatedData.topImageUrl && { topImageUrl: validatedData.topImageUrl }),
        ...(validatedData.bottomImageUrl && { bottomImageUrl: validatedData.bottomImageUrl }),
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      location: validatedData.location || undefined,
    });

    res.status(201).json({
      success: true,
      message: 'Compliance report created successfully',
      data: savedReport,
    });
  } catch (error: any) {
    console.error('Error creating compliance report:', error);
    
    if (error.name === 'ZodError') {
      return next(new CustomError(400, 'Validation error: ' + JSON.stringify(error.errors)));
    }
    
    return next(new CustomError(500, 'Failed to create compliance report'));
  }
};
