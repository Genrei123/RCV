import { Request, Response, NextFunction } from 'express';
import { DB } from '../../typeorm/data-source';
import { ComplianceReport } from '../../typeorm/entities/complianceReport.entity';
import CustomError from '../../utils/CustomError';
import { AuditLogService } from '../../services/auditLogService';
import { sendMail } from '../../utils/nodemailer';

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
      where: { _id: reportId },
      relations: ['agent']
    });

    if (!report) {
      return next(new CustomError(404, 'Report not found'));
    }

    if (!report.agent || !report.agent.email) {
      return next(new CustomError(400, 'Report agent information is missing'));
    }

    // Update the report status and mark as verified
    const originalStatus = report.status;
    report.status = resolution;
    report.isVerified = true;
    await complianceRepo.save(report);

    // Log the resolution action
    await AuditLogService.createLog({
      userId: user._id,
      action: `${originalStatus === resolution ? 'Approved' : 'Changed'} compliance report: ${reportId}`,
      actionType: 'COMPLIANCE_REPORT',
      platform: 'WEB',
      metadata: {
        reportId: report._id,
        originalStatus,
        newStatus: resolution,
        action: originalStatus === resolution ? 'approved' : 'changed',
        notes,
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    // Email notification 
    try {
      const agentName = `${report.agent.firstName || ''} ${report.agent.lastName || ''}`.trim() || report.agent.email;
      const statusChanged = originalStatus !== resolution;
      const subject = statusChanged 
        ? `Compliance Report Update - Status Changed`
        : `Compliance Report Update - Verified`;
      
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">Compliance Report Update</h1>
          </div>
          <div style="padding: 30px; background: #f9fafb;">
            <p style="font-size: 16px; color: #374151;">Hello ${agentName},</p>
            <p style="font-size: 16px; color: #374151;">
              Your compliance report has been reviewed and ${statusChanged ? 'updated' : 'verified'}.
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <p style="margin: 0 0 15px 0; font-weight: bold; color: #374151;">Report Details:</p>
              <p style="margin: 8px 0; color: #374151;"><strong>Report ID:</strong> ${reportId}</p>
              <p style="margin: 8px 0; color: #374151;"><strong>Original Status:</strong> <span style="color: #6b7280;">${originalStatus}</span></p>
              <p style="margin: 8px 0; color: #374151;"><strong>New Status:</strong> <span style="color: ${resolution === 'COMPLIANT' ? '#10b981' : resolution === 'FRAUDULENT' ? '#ef4444' : '#f59e0b'}; font-weight: bold;">${resolution}</span></p>
              ${notes ? `<p style="margin: 8px 0; color: #374151;"><strong>Admin Notes:</strong> ${notes}</p>` : ''}
              <p style="margin: 8px 0; color: #374151;"><strong>Verified:</strong> <span style="color: #10b981; font-weight: bold;">Yes ✓</span></p>
            </div>
            
            ${statusChanged 
              ? `<div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0; color: #92400e; font-size: 14px;">
                    <strong>Note:</strong> The status of your report has been changed during review. Please review the updated status above.
                  </p>
                </div>`
              : `<div style="background: #d1fae5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0; color: #065f46; font-size: 14px;">
                    <strong>Approved:</strong> Your report has been verified with the original status.
                  </p>
                </div>`
            }
            
            <p style="font-size: 16px; color: #374151;">
              Thank you for your compliance reporting.
            </p>
          </div>
          <div style="background: #1f2937; padding: 20px; text-align: center;">
            <p style="color: #9ca3af; margin: 0; font-size: 12px;">
              © ${new Date().getFullYear()} RCV Platform. All rights reserved.
            </p>
          </div>
        </div>
      `;

      await sendMail(report.agent.email, subject, html);
    } catch (emailError) {
      // Log email error
      console.error('Failed to send email notification:', emailError);
    }

    res.status(200).json({
      success: true,
      message: originalStatus === resolution 
        ? 'Report approved successfully' 
        : 'Report status changed successfully',
      data: {
        reportId: report._id,
        originalStatus,
        newStatus: resolution,
        isVerified: true,
      },
    });
  } catch (error: any) {
    console.error('Error resolving compliance report:', error);
    return next(new CustomError(500, 'Failed to resolve compliance report'));
  }
};
