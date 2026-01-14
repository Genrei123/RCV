import { Request, Response, NextFunction } from 'express';
import { DB } from '../../typeorm/data-source';
import { ComplianceReport } from '../../typeorm/entities/complianceReport.entity';
import CustomError from '../../utils/CustomError';
import { AuditLogService } from '../../services/auditLogService';

export const resolveReport = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = (req as any).user;
    const reportId = req.params.id;
    
    if (!user || !user._id) {
      return next(new CustomError(401, 'User not authenticated'));
    }

    const { resolution, notes } = req.body;

    if (!resolution) {
      return next(new CustomError(400, 'Resolution status is required'));
    }

    const complianceRepo = DB.getRepository(ComplianceReport);
    
    const report = await complianceRepo.findOne({
      where: { _id: reportId }
    });

    if (!report) {
      return next(new CustomError(404, 'Report not found'));
    }

    // Update the report status
    const originalStatus = report.status;
    report.status = resolution;
    await complianceRepo.save(report);

    // Log the resolution action
    await AuditLogService.createLog({
      userId: user._id,
      action: `Resolved compliance report: ${reportId}`,
      actionType: 'COMPLIANCE_REPORT',
      platform: 'WEB',
      metadata: {
        reportId: report._id,
        originalStatus,
        newStatus: resolution,
        notes,
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(200).json({
      success: true,
      message: 'Report resolved successfully',
      data: {
        reportId: report._id,
        originalStatus,
        newStatus: resolution,
      },
    });
  } catch (error: any) {
    console.error('Error resolving compliance report:', error);
    return next(new CustomError(500, 'Failed to resolve compliance report'));
  }
};
