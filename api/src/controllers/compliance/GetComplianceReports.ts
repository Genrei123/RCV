import { Request, Response, NextFunction } from 'express';
import { DB } from '../../typeorm/data-source';
import { ComplianceReport } from '../../typeorm/entities/complianceReport.entity';
import CustomError from '../../utils/CustomError';
import { parsePageParams, buildPaginationMeta, buildLinks } from '../../utils/pagination';

/**
 * Get compliance reports for the authenticated user
 * GET /api/v1/mobile/compliance/reports
 */
export const getComplianceReports = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = (req as any).user;
    
    if (!user || !user._id) {
      return next(new CustomError(401, 'User not authenticated'));
    }
    
    const userId = user._id;

    const { page, limit, skip } = parsePageParams(req, 10);

    // Get compliance reports for this user
    const complianceRepo = DB.getRepository(ComplianceReport);
    
    const [reports, total] = await complianceRepo.findAndCount({
      where: { agentId: userId },
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    const meta = buildPaginationMeta(page, limit, total);
    const links = buildLinks(req, page, limit, meta.total_pages);

    res.status(200).json({
      success: true,
      data: reports,
      pagination: meta,
      links
    });
  } catch (error: any) {
    console.error('Error fetching compliance reports:', error);
    return next(new CustomError(500, error.message || 'Failed to fetch compliance reports'));
  }
};

/**
 * Get a single compliance report by ID
 * GET /api/v1/mobile/compliance/reports/:id
 */
export const getComplianceReportById = async (
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
    
    const userId = user._id;

    const complianceRepo = DB.getRepository(ComplianceReport);
    
    const report = await complianceRepo.findOne({
      where: { 
        _id: reportId,
        agentId: userId 
      }
    });

    if (!report) {
      return next(new CustomError(404, 'Report not found'));
    }

    res.status(200).json({
      success: true,
      data: report
    });
  } catch (error: any) {
    console.error('Error fetching compliance report:', error);
    return next(new CustomError(500, error.message || 'Failed to fetch compliance report'));
  }
};
