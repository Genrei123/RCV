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
import { ApprovalStatus, CertificateApproval } from '../../typeorm/entities/certificateApproval.entity';
import { CertificateApprovalRepo, ProductRepo, UserRepo } from '../../typeorm/data-source';

/**
 * Submit a certificate for multi-signature approval
 * POST /api/v1/certificate-approval/submit
 * 
 * IMPORTANT: This now accepts pendingEntityData to store the full product/company data.
 * The entity will NOT be created in the database until FULL approval is received.
 * After approval, the entity is created and registered on the blockchain.
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
      entityId, // Optional - may not exist yet if entity is pending
      entityName,
      pdfHash,
      pdfUrl,
      submitterName,
      submitterWallet,
      pendingEntityData, // NEW: Full entity data to be created after approval
    } = req.body;

    // entityId is now optional since we may be submitting before entity creation
    if (!certificateId || !entityType || !entityName || !pdfHash) {
      throw new CustomError(400, 'Missing required fields: certificateId, entityType, entityName, pdfHash');
    }

    if (entityType !== 'product' && entityType !== 'company') {
      throw new CustomError(400, 'entityType must be either "product" or "company"');
    }

    // If no entityId provided, pendingEntityData is required
    if (!entityId && !pendingEntityData) {
      throw new CustomError(400, 'Either entityId or pendingEntityData is required');
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
      pendingEntityData, // Pass entity data for deferred creation
    });

    res.status(201).json({
      success: true,
      message: 'Certificate submitted for approval. Entity will be created after full approval.',
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

export async function submitRenewalForProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { entityId, forcePush } = req.body;
    const userId = req.user?._id;

    if (!entityId) {
      return res.status(400).json({
        success: false,
        message: 'entityId is required'
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Get the product
    const product = await ProductRepo.findOne({
      where: { _id: entityId },
      relations: ['company', 'registeredBy']
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if product is expired (skip if forcePush is enabled for testing)
    const isExpired = product.expirationDate 
      ? new Date(product.expirationDate) < new Date() 
      : false;

    if (!isExpired && !forcePush) {
      return res.status(400).json({
        success: false,
        message: 'Product certificate is not yet expired. Renewal is only available for expired certificates.'
      });
    }

    // Check if there's an existing old blockchain transaction
    if (!product.sepoliaTransactionId) {
      return res.status(400).json({
        success: false,
        message: 'No blockchain record found for this product. Cannot renew certificate without original blockchain registration.'
      });
    }

    // Get the user who's submitting
    const submitter = await UserRepo.findOne({ where: { _id: userId } });
    if (!submitter) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check for existing pending approvals
    const existingApproval = await CertificateApprovalRepo.findOne({
      where: {
        entityId: product._id,
        entityType: 'product',
        status: 'pending'
      }
    });

    if (existingApproval) {
      return res.status(400).json({
        success: false,
        message: 'There is already a pending approval request for this product.'
      });
    }

    // Build renewal chain - get all previous approvals for this product
    const previousApprovals = await CertificateApprovalRepo.find({
      where: {
        entityId: product._id,
        entityType: 'product',
        status: 'approved'
      },
      order: { createdAt: 'ASC' }
    });

    const renewalChain = previousApprovals
      .filter(a => a.blockchainTxHash)
      .map(a => ({
        approvalId: a._id,
        certificateId: a.certificateId,
        transactionHash: a.blockchainTxHash!,
        approvedDate: a.updatedAt.toISOString(),
        approvers: a.approvers || []
      }));

    // Get admin count for required approvals
    const adminCount = await UserRepo.count({
      where: {
        role: 'ADMIN',
        walletAuthorized: true,
      },
    });
    const requiredApprovals = Math.max(adminCount, 1);

    // Create a renewal approval request
    const approval = new CertificateApproval();
    approval.certificateId = `RENEWAL-${product._id}-${Date.now()}`;
    approval.entityType = 'product';
    approval.entityId = product._id;
    approval.entityName = product.productName;
    approval.pdfHash = ''; // Will be generated on approval
    approval.submittedBy = userId;
    approval.submitterName = submitter.fullName || submitter.email;
    approval.submitterWallet = submitter.walletAddress;
    approval.status = 'pending';
    approval.approvers = [];
    approval.approvalCount = 0;
    approval.requiredApprovals = requiredApprovals;
    approval.entityCreated = true; // Product already exists
    
    // Set renewal tracking fields
    approval.isRenewal = true;
    approval.previousCertificateHash = product.sepoliaTransactionId;
    approval.renewalChain = renewalChain;
    
    // Calculate new expiration date (1 year from now)
    const newExpirationDate = new Date();
    newExpirationDate.setFullYear(newExpirationDate.getFullYear() + 1);
    
    approval.renewalMetadata = {
      oldExpirationDate: product.expirationDate?.toISOString(),
      newExpirationDate: newExpirationDate.toISOString(),
      renewalRequestDate: new Date().toISOString(),
      requestedBy: userId,
      requestedByName: submitter.fullName || submitter.email,
      productDetails: {
        LTONumber: product.LTONumber,
        CFPRNumber: product.CFPRNumber,
        lotNumber: product.lotNumber,
        brandName: product.brandName,
        productName: product.productName,
        productClassification: product.productClassification,
        productSubClassification: product.productSubClassification,
        productImageFront: product.productImageFront,
        productImageBack: product.productImageBack
      },
      forcePush: forcePush || false
    };
    
    // Store complete product data for renewal display in ApprovalQueueModal
    approval.pendingEntityData = {
      isRenewal: true,
      oldTransactionHash: product.sepoliaTransactionId,
      oldCertificateId: product._id,
      renewalRequestDate: new Date().toISOString(),
      // Include all required product fields
      LTONumber: product.LTONumber,
      CFPRNumber: product.CFPRNumber,
      lotNumber: product.lotNumber,
      brandName: product.brandName,
      productName: product.productName,
      expirationDate: newExpirationDate.toISOString(), // Use NEW expiration date
      productClassification: product.productClassification,
      productSubClassification: product.productSubClassification,
      productImageFront: product.productImageFront,
      productImageBack: product.productImageBack,
      companyId: product.companyId,
      company: product.company ? {
        name: product.company.name,
        license: product.company.licenseNumber
      } : undefined,
      brandNameId: product.brandNameId,
      registeredById: product.registeredById,
      classificationId: product.classificationId,
      subClassificationId: product.subClassificationId,
      dateOfRegistration: product.dateOfRegistration?.toISOString()
    };

    const savedApproval = await CertificateApprovalRepo.save(approval);

    return res.status(201).json({
      success: true,
      message: 'Renewal request submitted successfully. Awaiting admin approval.',
      data: {
        approvalId: savedApproval._id,
        certificateId: savedApproval.certificateId,
        status: savedApproval.status,
        oldTransactionHash: product.sepoliaTransactionId,
        renewalChainLength: renewalChain.length,
        isRenewal: true
      }
    });

  } catch (error) {
    console.error('Error submitting renewal:', error);
    next(error);
  }
}

export async function submitUpdateForProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { entityId, updateData } = req.body;
    const userId = req.user?._id;

    if (!entityId) {
      return res.status(400).json({
        success: false,
        message: 'entityId is required'
      });
    }

    if (!updateData) {
      return res.status(400).json({
        success: false,
        message: 'updateData is required'
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Get the product
    const product = await ProductRepo.findOne({
      where: { _id: entityId },
      relations: ['company', 'registeredBy']
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if there's an existing old blockchain transaction
    if (!product.sepoliaTransactionId) {
      return res.status(400).json({
        success: false,
        message: 'No blockchain record found for this product. Cannot update certificate without original blockchain registration.'
      });
    }

    // Get the user who's submitting
    const submitter = await UserRepo.findOne({ where: { _id: userId } });
    if (!submitter) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check for existing pending approvals
    const existingApproval = await CertificateApprovalRepo.findOne({
      where: {
        entityId: product._id,
        entityType: 'product',
        status: 'pending'
      }
    });

    if (existingApproval) {
      return res.status(400).json({
        success: false,
        message: 'There is already a pending approval request for this product.'
      });
    }

    // Get admin count for required approvals
    const adminCount = await UserRepo.count({
      where: {
        role: 'ADMIN',
        walletAuthorized: true,
      },
    });
    const requiredApprovals = Math.max(adminCount, 1);

    // Create a update approval request
    const approval = new CertificateApproval();
    approval.certificateId = `UPDATE-${product._id}-${Date.now()}`;
    approval.entityType = 'product';
    approval.entityId = product._id;
    approval.entityName = product.productName;
    approval.pdfHash = ''; // Will be generated on approval
    approval.submittedBy = userId;
    approval.submitterName = submitter.fullName || submitter.email;
    approval.submitterWallet = submitter.walletAddress;
    approval.status = 'pending';
    approval.approvers = [];
    approval.approvalCount = 0;
    approval.requiredApprovals = requiredApprovals;
    approval.entityCreated = true; // Product already exists

    // Set update tracking fields
    // We reuse isRenewal flag? No, let's use pendingEntityData.isUpdate
    approval.isRenewal = false; 
    approval.previousCertificateHash = product.sepoliaTransactionId;
    
    // Store complete product data with UPDATES applied
    // This allows ApprovalQueueModal to show the *proposed* state
    approval.pendingEntityData = {
      isUpdate: true, 
      oldTransactionHash: product.sepoliaTransactionId,
      oldCertificateId: product._id,
      updateRequestDate: new Date().toISOString(),
      
      // Default to existing values
      LTONumber: product.LTONumber,
      CFPRNumber: product.CFPRNumber,
      lotNumber: product.lotNumber,
      brandName: product.brandName,
      productName: product.productName,
      expirationDate: product.expirationDate?.toISOString(), 
      productClassification: product.productClassification,
      productSubClassification: product.productSubClassification,
      productImageFront: product.productImageFront,
      productImageBack: product.productImageBack,
      companyId: product.companyId,
      brandNameId: product.brandNameId,
      registeredById: product.registeredById,
      classificationId: product.classificationId,
      subClassificationId: product.subClassificationId,
      dateOfRegistration: product.dateOfRegistration?.toISOString(),

      // OVERWRITE with provided updateData
      ...updateData,
      // Ensure company info is preserved for blockchain recovery
      company: product.company ? {
        name: product.company.name,
        license: product.company.licenseNumber
      } : undefined
    };

    const savedApproval = await CertificateApprovalRepo.save(approval);

    return res.status(201).json({
      success: true,
      message: 'Update request submitted successfully. Awaiting admin approval.',
      data: {
        approvalId: savedApproval._id,
        certificateId: savedApproval.certificateId,
        status: savedApproval.status,
      }
    });

  } catch (error) {
    next(error);
  }
}

/**
 * Get renewal timeline for a product
 * GET /api/v1/certificate-approval/renewal-timeline/:productId
 */
export async function getRenewalTimeline(req: Request, res: Response, next: NextFunction) {
  try {
    const { productId } = req.params;

    // Get all approvals for this product (original + all renewals)
    const approvals = await CertificateApprovalRepo.find({
      where: {
        entityId: productId,
        entityType: 'product',
        status: 'approved'
      },
      order: { createdAt: 'ASC' }
    });

    // Build timeline data
    const timeline = approvals.map(approval => ({
      approvalId: approval._id,
      certificateId: approval.certificateId,
      isRenewal: approval.isRenewal || false,
      isUpdate: approval.pendingEntityData?.isUpdate || false,
      isArchive: approval.pendingEntityData?.isArchive || false,
      isUnarchive: approval.pendingEntityData?.isUnarchive || false,
      previousCertificateHash: approval.previousCertificateHash,
      transactionHash: approval.blockchainTxHash,
      approvedDate: approval.updatedAt,
      createdDate: approval.createdAt,
      approvers: approval.approvers || [],
      approvalCount: approval.approvalCount,
      requiredApprovals: approval.requiredApprovals,
      submittedBy: approval.submittedBy,
      submitterName: approval.submitterName,
      renewalMetadata: approval.renewalMetadata,
      blockNumber: approval.blockchainBlockNumber,
      blockchainTimestamp: approval.blockchainTimestamp
    }));

    return res.status(200).json({
      success: true,
      data: {
        productId,
        totalRenewals: timeline.filter(t => t.isRenewal).length,
        timeline
      }
    });
  } catch (error) {
    console.error('Error fetching renewal timeline:', error);
    next(error);
  }
}

/**
 * Get detailed renewal chain information for an approval
 * GET /api/v1/certificate-approval/renewal-details/:approvalId
 */
export async function getRenewalDetails(req: Request, res: Response, next: NextFunction) {
  try {
    const { approvalId } = req.params;

    const approval = await CertificateApprovalRepo.findOne({
      where: { _id: approvalId }
    });

    if (!approval) {
      return res.status(404).json({
        success: false,
        message: 'Approval not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        approvalId: approval._id,
        certificateId: approval.certificateId,
        isRenewal: approval.isRenewal || false,
        previousCertificateHash: approval.previousCertificateHash,
        renewalChain: approval.renewalChain || [],
        renewalMetadata: approval.renewalMetadata,
        transactionHash: approval.blockchainTxHash,
        blockNumber: approval.blockchainBlockNumber,
        blockchainTimestamp: approval.blockchainTimestamp,
        approvers: approval.approvers || [],
        approvalCount: approval.approvalCount,
        requiredApprovals: approval.requiredApprovals,
        status: approval.status,
        entityId: approval.entityId,
        entityName: approval.entityName,
        entityType: approval.entityType,
        pdfHash: approval.pdfHash,
        pdfUrl: approval.pdfUrl,
        submittedBy: approval.submittedBy,
        submitterName: approval.submitterName,
        submitterWallet: approval.submitterWallet,
        createdAt: approval.createdAt,
        updatedAt: approval.updatedAt,
        pendingEntityData: approval.pendingEntityData
      }
    });
  } catch (error) {
    console.error('Error fetching renewal details:', error);
    next(error);
  }
}

/**
 * Submit archive request for a product (approval workflow)
 * POST /api/v1/certificate-approval/archiveProduct
 */
export async function submitArchiveForProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { entityId } = req.body;
    const userId = req.user?._id;

    if (!entityId) {
      return res.status(400).json({
        success: false,
        message: 'entityId is required'
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Get the product
    const product = await ProductRepo.findOne({
      where: { _id: entityId },
      relations: ['company', 'registeredBy']
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if already archived
    if (product.isArchived) {
      return res.status(400).json({
        success: false,
        message: 'Product is already archived'
      });
    }

    // Check if there's a blockchain record
    if (!product.sepoliaTransactionId) {
      return res.status(400).json({
        success: false,
        message: 'No blockchain record found for this product. Cannot archive without blockchain registration.'
      });
    }

    // Get the user who's submitting
    const submitter = await UserRepo.findOne({ where: { _id: userId } });
    if (!submitter) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check for existing pending approvals
    const existingApproval = await CertificateApprovalRepo.findOne({
      where: {
        entityId: product._id,
        entityType: 'product',
        status: 'pending'
      }
    });

    if (existingApproval) {
      return res.status(400).json({
        success: false,
        message: 'There is already a pending approval request for this product.'
      });
    }

    // Get admin count for required approvals
    const adminCount = await UserRepo.count({
      where: {
        role: 'ADMIN',
        walletAuthorized: true,
      },
    });
    const requiredApprovals = Math.max(adminCount, 1);

    // Create an archive approval request
    const approval = new CertificateApproval();
    approval.certificateId = `ARCHIVE-${product._id}-${Date.now()}`;
    approval.entityType = 'product';
    approval.entityId = product._id;
    approval.entityName = product.productName;
    approval.pdfHash = ''; // Will be generated on approval
    approval.submittedBy = userId;
    approval.submitterName = submitter.fullName || submitter.email;
    approval.submitterWallet = submitter.walletAddress;
    approval.status = 'pending';
    approval.approvers = [];
    approval.approvalCount = 0;
    approval.requiredApprovals = requiredApprovals;
    approval.entityCreated = true; // Product already exists

    // Set archive tracking fields
    approval.isRenewal = false;
    approval.previousCertificateHash = product.sepoliaTransactionId;
    
    // Store complete product data with archive flag
    approval.pendingEntityData = {
      isArchive: true,
      oldTransactionHash: product.sepoliaTransactionId,
      oldCertificateId: product._id,
      archiveRequestDate: new Date().toISOString(),
      requestedBy: userId,
      requestedByName: submitter.fullName || submitter.email,
      
      // Include all product fields
      LTONumber: product.LTONumber,
      CFPRNumber: product.CFPRNumber,
      lotNumber: product.lotNumber,
      brandName: product.brandName,
      productName: product.productName,
      expirationDate: product.expirationDate?.toISOString(),
      productClassification: product.productClassification,
      productSubClassification: product.productSubClassification,
      productImageFront: product.productImageFront,
      productImageBack: product.productImageBack,
      companyId: product.companyId,
      company: product.company ? {
        name: product.company.name,
        license: product.company.licenseNumber
      } : undefined,
      brandNameId: product.brandNameId,
      registeredById: product.registeredById,
      classificationId: product.classificationId,
      subClassificationId: product.subClassificationId,
      dateOfRegistration: product.dateOfRegistration?.toISOString(),
      
      // Archive-specific field
      willBeArchived: true
    };

    const savedApproval = await CertificateApprovalRepo.save(approval);

    return res.status(201).json({
      success: true,
      message: 'Archive request submitted successfully. Awaiting admin approval.',
      data: {
        approvalId: savedApproval._id,
        certificateId: savedApproval.certificateId,
        status: savedApproval.status,
        isArchive: true
      }
    });

  } catch (error) {
    console.error('Error submitting archive request:', error);
    next(error);
  }
}

/**
 * Submit unarchive request for a product (approval workflow)
 * POST /api/v1/certificate-approval/unarchiveProduct
 */
export async function submitUnarchiveForProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { entityId } = req.body;
    const userId = req.user?._id;

    if (!entityId) {
      return res.status(400).json({
        success: false,
        message: 'entityId is required'
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Get the product
    const product = await ProductRepo.findOne({
      where: { _id: entityId },
      relations: ['company', 'registeredBy']
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if actually archived
    if (!product.isArchived) {
      return res.status(400).json({
        success: false,
        message: 'Product is not archived'
      });
    }

    // Check if there's a blockchain record
    if (!product.sepoliaTransactionId) {
      return res.status(400).json({
        success: false,
        message: 'No blockchain record found for this product.'
      });
    }

    // Get the user who's submitting
    const submitter = await UserRepo.findOne({ where: { _id: userId } });
    if (!submitter) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check for existing pending approvals
    const existingApproval = await CertificateApprovalRepo.findOne({
      where: {
        entityId: product._id,
        entityType: 'product',
        status: 'pending'
      }
    });

    if (existingApproval) {
      return res.status(400).json({
        success: false,
        message: 'There is already a pending approval request for this product.'
      });
    }

    // Get admin count for required approvals
    const adminCount = await UserRepo.count({
      where: {
        role: 'ADMIN',
        walletAuthorized: true,
      },
    });
    const requiredApprovals = Math.max(adminCount, 1);

    // Create an unarchive approval request
    const approval = new CertificateApproval();
    approval.certificateId = `UNARCHIVE-${product._id}-${Date.now()}`;
    approval.entityType = 'product';
    approval.entityId = product._id;
    approval.entityName = product.productName;
    approval.pdfHash = ''; // Will be generated on approval
    approval.submittedBy = userId;
    approval.submitterName = submitter.fullName || submitter.email;
    approval.submitterWallet = submitter.walletAddress;
    approval.status = 'pending';
    approval.approvers = [];
    approval.approvalCount = 0;
    approval.requiredApprovals = requiredApprovals;
    approval.entityCreated = true; // Product already exists

    // Set unarchive tracking fields
    approval.isRenewal = false;
    approval.previousCertificateHash = product.sepoliaTransactionId;
    
    // Store complete product data with unarchive flag
    approval.pendingEntityData = {
      isUnarchive: true,
      oldTransactionHash: product.sepoliaTransactionId,
      oldCertificateId: product._id,
      unarchiveRequestDate: new Date().toISOString(),
      requestedBy: userId,
      requestedByName: submitter.fullName || submitter.email,
      
      // Include all product fields
      LTONumber: product.LTONumber,
      CFPRNumber: product.CFPRNumber,
      lotNumber: product.lotNumber,
      brandName: product.brandName,
      productName: product.productName,
      expirationDate: product.expirationDate?.toISOString(),
      productClassification: product.productClassification,
      productSubClassification: product.productSubClassification,
      productImageFront: product.productImageFront,
      productImageBack: product.productImageBack,
      companyId: product.companyId,
      company: product.company ? {
        name: product.company.name,
        license: product.company.licenseNumber
      } : undefined,
      brandNameId: product.brandNameId,
      registeredById: product.registeredById,
      classificationId: product.classificationId,
      subClassificationId: product.subClassificationId,
      dateOfRegistration: product.dateOfRegistration?.toISOString(),
      
      // Unarchive-specific field
      willBeUnarchived: true
    };

    const savedApproval = await CertificateApprovalRepo.save(approval);

    return res.status(201).json({
      success: true,
      message: 'Unarchive request submitted successfully. Awaiting admin approval.',
      data: {
        approvalId: savedApproval._id,
        certificateId: savedApproval.certificateId,
        status: savedApproval.status,
        isUnarchive: true
      }
    });

  } catch (error) {
    console.error('Error submitting unarchive request:', error);
    next(error);
  }
}