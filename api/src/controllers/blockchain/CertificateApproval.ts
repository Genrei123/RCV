import { Request, Response, NextFunction } from 'express';
import {
  submitCertificateForApproval,
  processApproval,
  rejectCertificate,
  getPendingApprovals,
  getApprovalById,
  getApprovalsByStatus,
  getApprovalsForCertificate,
  getUserApprovalHistory,
  generateApprovalMessage,
  registerApprovedCertificateOnBlockchain,
  getApprovedCertificatesReadyForBlockchain,
  resubmitRejectedCertificate,
  getRejectedApprovalsForSubmitter,
  getApprovalStatusForEntity,
  getSubmittedApprovals,
  getAdminCount,
} from '../../services/certificateApprovalService';
import CustomError from '../../utils/CustomError';
import { ApprovalStatus } from '../../typeorm/entities/certificateApproval.entity';

/**
 * Submit a certificate for multi-signature approval
 * POST /api/v1/certificate-approval/submit
 */
export async function submitForApproval(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?._id;
    if (!userId) {
      throw new CustomError(401, 'User not authenticated');
    }

    const {
      certificateId,
      entityType,
      entityId,
      entityName,
      pdfHash,
      pdfUrl,
      submitterName,
      submitterWallet,
    } = req.body;

    if (!certificateId || !entityType || !entityId || !entityName || !pdfHash) {
      throw new CustomError(400, 'Missing required fields: certificateId, entityType, entityId, entityName, pdfHash');
    }

    if (entityType !== 'product' && entityType !== 'company') {
      throw new CustomError(400, 'entityType must be either "product" or "company"');
    }

    const approval = await submitCertificateForApproval({
      certificateId,
      entityType,
      entityId,
      entityName,
      pdfHash,
      pdfUrl,
      submittedBy: userId,
      submitterName,
      submitterWallet,
    });

    res.status(201).json({
      success: true,
      message: 'Certificate submitted for approval',
      data: approval,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Approve a pending certificate (requires signature)
 * POST /api/v1/certificate-approval/:approvalId/approve
 */
export async function approveCertificate(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?._id;
    if (!userId) {
      throw new CustomError(401, 'User not authenticated');
    }

    const { approvalId } = req.params;
    const { signature, timestamp } = req.body;

    if (!signature) {
      throw new CustomError(400, 'Signature is required');
    }

    if (!timestamp) {
      throw new CustomError(400, 'Timestamp is required - must match the signed message');
    }

    const approval = await processApproval({
      approvalId,
      approverId: userId,
      signature,
      timestamp, // Pass the timestamp from the signed message
    });

    const isFullyApproved = approval.status === 'approved';

    res.status(200).json({
      success: true,
      message: isFullyApproved
        ? 'Certificate fully approved and ready for blockchain registration'
        : 'First approval recorded. Awaiting second approval.',
      data: approval,
      isFullyApproved,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Reject a pending certificate (requires signature)
 * POST /api/v1/certificate-approval/:approvalId/reject
 */
export async function rejectApproval(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?._id;
    if (!userId) {
      throw new CustomError(401, 'User not authenticated');
    }

    const { approvalId } = req.params;
    const { reason, signature, timestamp } = req.body;

    if (!reason) {
      throw new CustomError(400, 'Rejection reason is required');
    }

    if (!signature) {
      throw new CustomError(400, 'Signature is required');
    }

    const approval = await rejectCertificate({
      approvalId,
      rejectorId: userId,
      reason,
      signature,
      timestamp, // Pass timestamp from signed message
    });

    res.status(200).json({
      success: true,
      message: 'Certificate rejected',
      data: approval,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all pending approvals for the current user to review
 * GET /api/v1/certificate-approval/pending
 */
export async function getPending(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?._id;
    if (!userId) {
      throw new CustomError(401, 'User not authenticated');
    }

    const approvals = await getPendingApprovals(userId);

    res.status(200).json({
      success: true,
      data: approvals,
      count: approvals.length,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all pending approvals (admin view - shows all pending)
 * GET /api/v1/certificate-approval/pending/all
 */
export async function getAllPending(req: Request, res: Response, next: NextFunction) {
  try {
    const approvals = await getPendingApprovals();

    res.status(200).json({
      success: true,
      data: approvals,
      count: approvals.length,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get approval by ID
 * GET /api/v1/certificate-approval/:approvalId
 */
export async function getApproval(req: Request, res: Response, next: NextFunction) {
  try {
    const { approvalId } = req.params;
    const approval = await getApprovalById(approvalId);

    if (!approval) {
      throw new CustomError(404, 'Approval not found');
    }

    res.status(200).json({
      success: true,
      data: approval,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get approvals by status
 * GET /api/v1/certificate-approval/status/:status
 */
export async function getByStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { status } = req.params;

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      throw new CustomError(400, 'Invalid status. Must be "pending", "approved", or "rejected"');
    }

    const approvals = await getApprovalsByStatus(status as ApprovalStatus);

    res.status(200).json({
      success: true,
      data: approvals,
      count: approvals.length,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get approvals for a specific certificate
 * GET /api/v1/certificate-approval/certificate/:certificateId
 */
export async function getByCertificate(req: Request, res: Response, next: NextFunction) {
  try {
    const { certificateId } = req.params;
    const approvals = await getApprovalsForCertificate(certificateId);

    res.status(200).json({
      success: true,
      data: approvals,
      count: approvals.length,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get current user's approval history
 * GET /api/v1/certificate-approval/history
 */
export async function getMyApprovalHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?._id;
    if (!userId) {
      throw new CustomError(401, 'User not authenticated');
    }

    const approvals = await getUserApprovalHistory(userId);

    res.status(200).json({
      success: true,
      data: approvals,
      count: approvals.length,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get the message to sign for approval
 * GET /api/v1/certificate-approval/:approvalId/message
 */
export async function getApprovalMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const { approvalId } = req.params;
    const approval = await getApprovalById(approvalId);

    if (!approval) {
      throw new CustomError(404, 'Approval not found');
    }

    if (approval.status !== 'pending') {
      throw new CustomError(400, `Cannot get message for a ${approval.status} approval`);
    }

    const currentApprovalCount = approval.approvers?.length || 0;
    const nextApprovalNumber = currentApprovalCount + 1;
    
    // Generate timestamp once and include it in response
    // This ensures the same timestamp is used for signing and verification
    const timestamp = new Date().toISOString();
    const message = generateApprovalMessage(approval, nextApprovalNumber, approval.requiredApprovals, timestamp);

    res.status(200).json({
      success: true,
      data: {
        message,
        timestamp, // Include timestamp so frontend can send it back
        approvalNumber: nextApprovalNumber,
        totalRequired: approval.requiredApprovals,
        currentApprovals: currentApprovalCount,
        approvalId: approval._id,
        certificateId: approval.certificateId,
        entityName: approval.entityName,
        pdfHash: approval.pdfHash,
        approvers: approval.approvers || [],
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get rejection message to sign
 * POST /api/v1/certificate-approval/:approvalId/rejection-message
 */
export async function getRejectionMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const { approvalId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      throw new CustomError(400, 'Reason is required to generate rejection message');
    }

    const approval = await getApprovalById(approvalId);

    if (!approval) {
      throw new CustomError(404, 'Approval not found');
    }

    if (approval.status !== 'pending') {
      throw new CustomError(400, `Cannot reject a ${approval.status} approval`);
    }

    // Generate timestamp once and include it in response
    const timestamp = new Date().toISOString();
    
    const message = `I reject this certificate registration on RCV Blockchain

Certificate ID: ${approval.certificateId}
Entity: ${approval.entityName} (${approval.entityType})
PDF Hash: ${approval.pdfHash}
Reason: ${reason}
Timestamp: ${timestamp}`;

    res.status(200).json({
      success: true,
      data: {
        message,
        timestamp, // Include timestamp for verification
        approvalId: approval._id,
        certificateId: approval.certificateId,
        entityName: approval.entityName,
        reason,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Register a fully-approved certificate on the blockchain
 * POST /api/v1/certificate-approval/:approvalId/register
 */
export async function registerOnBlockchain(req: Request, res: Response, next: NextFunction) {
  try {
    const { approvalId } = req.params;

    const { approval, transaction } = await registerApprovedCertificateOnBlockchain(approvalId);

    res.status(200).json({
      success: true,
      message: 'Certificate registered on blockchain successfully',
      data: {
        approval,
        transaction,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all approved certificates that are ready for blockchain registration
 * GET /api/v1/certificate-approval/ready-for-blockchain
 */
export async function getReadyForBlockchain(req: Request, res: Response, next: NextFunction) {
  try {
    const approvals = await getApprovedCertificatesReadyForBlockchain();

    res.status(200).json({
      success: true,
      data: approvals,
      count: approvals.length,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Resubmit a rejected certificate for approval
 * POST /api/v1/certificate-approval/:approvalId/resubmit
 */
export async function resubmitCertificate(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?._id;
    if (!userId) {
      throw new CustomError(401, 'User not authenticated');
    }

    const { approvalId } = req.params;
    const { pdfHash, pdfUrl } = req.body;

    // Verify the user is the original submitter
    const originalApproval = await getApprovalById(approvalId);
    if (!originalApproval) {
      throw new CustomError(404, 'Original approval not found');
    }

    if (originalApproval.submittedBy !== userId) {
      throw new CustomError(403, 'Only the original submitter can resubmit');
    }

    const newApproval = await resubmitRejectedCertificate(approvalId, pdfHash, pdfUrl);

    res.status(201).json({
      success: true,
      message: 'Certificate resubmitted for approval',
      data: newApproval,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get rejected approvals for the current user
 * GET /api/v1/certificate-approval/my-rejected
 */
export async function getMyRejectedApprovals(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?._id;
    if (!userId) {
      throw new CustomError(401, 'User not authenticated');
    }

    const approvals = await getRejectedApprovalsForSubmitter(userId);

    res.status(200).json({
      success: true,
      data: approvals,
      count: approvals.length,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get approval status for a specific entity (product or company)
 * GET /api/v1/certificate-approval/entity/:entityType/:entityId
 */
export async function getEntityApprovalStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { entityType, entityId } = req.params;

    if (entityType !== 'product' && entityType !== 'company') {
      throw new CustomError(400, 'entityType must be "product" or "company"');
    }

    const approval = await getApprovalStatusForEntity(entityId, entityType as 'product' | 'company');

    res.status(200).json({
      success: true,
      data: approval,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all approvals submitted by the current user
 * GET /api/v1/certificate-approval/my-submissions
 */
export async function getMySubmissions(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?._id;
    if (!userId) {
      throw new CustomError(401, 'User not authenticated');
    }

    const approvals = await getSubmittedApprovals(userId);

    res.status(200).json({
      success: true,
      data: approvals,
      count: approvals.length,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get admin count for approval requirements
 * GET /api/v1/certificate-approval/admin-count
 */
export async function getRequiredAdminCount(req: Request, res: Response, next: NextFunction) {
  try {
    const count = await getAdminCount();

    res.status(200).json({
      success: true,
      data: {
        adminCount: count,
        requiredApprovals: Math.max(count, 1),
      },
    });
  } catch (error) {
    next(error);
  }
}
