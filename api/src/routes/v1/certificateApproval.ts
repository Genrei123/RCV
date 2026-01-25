import express from 'express';
import {
  submitForApproval,
  approveCertificate,
  rejectApproval,
  getPending,
  getAllPending,
  getApproval,
  getByStatus,
  getByCertificate,
  getMyApprovalHistory,
  getApprovalMessage,
  getRejectionMessage,
  registerOnBlockchain,
  getReadyForBlockchain,
  resubmitCertificate,
  getMyRejectedApprovals,
  getEntityApprovalStatus,
  getMySubmissions,
  getRequiredAdminCount,
  submitRenewalForProduct,
  getRenewalTimeline,
  getRenewalDetails,
  submitUpdateForProduct,
  submitArchiveForProduct,
  submitUnarchiveForProduct,
} from '../../controllers/blockchain/CertificateApproval';
import { verifyUser } from '../../middleware/verifyUser';
import { verifyAdmin } from '../../middleware/verifyAdmin';
import { verifyWalletMatch } from '../../middleware/verifyWalletMatch';

const router = express.Router();

// Submit a certificate for approval (any authenticated user with wallet)
// Requires wallet verification to prevent using different MetaMask account
router.post('/submit', verifyUser, verifyWalletMatch, submitForApproval);

// Get pending approvals for current user
router.get('/pending', verifyUser, getPending);

// Get all pending approvals (admin only)
router.get('/pending/all', verifyUser, verifyAdmin, getAllPending);

// Get approved certificates ready for blockchain registration (admin only)
router.get('/ready-for-blockchain', verifyUser, verifyAdmin, getReadyForBlockchain);

// Get current user's approval history
router.get('/history', verifyUser, getMyApprovalHistory);

// Get user's rejected approvals
router.get('/my-rejected', verifyUser, getMyRejectedApprovals);

// Get user's submitted approvals
router.get('/my-submissions', verifyUser, getMySubmissions);

// Get admin count for approval requirements
router.get('/admin-count', verifyUser, getRequiredAdminCount);

// Get approvals by status (admin only)
router.get('/status/:status', verifyUser, verifyAdmin, getByStatus);

// Get approvals for a specific certificate
router.get('/certificate/:certificateId', verifyUser, getByCertificate);

// Get approval status for a specific entity (product or company)
router.get('/entity/:entityType/:entityId', verifyUser, getEntityApprovalStatus);

// Get specific approval
router.get('/:approvalId', verifyUser, getApproval);

// Get the message to sign for approval
router.get('/:approvalId/message', verifyUser, getApprovalMessage);

// Get rejection message to sign
router.post('/:approvalId/rejection-message', verifyUser, getRejectionMessage);

// Resubmit a rejected certificate
router.post('/:approvalId/resubmit', verifyUser, resubmitCertificate);

// Register approved certificate on blockchain (admin only)
router.post('/:approvalId/register', verifyUser, verifyAdmin, registerOnBlockchain);

// Approve a certificate (requires admin/brand_admin role + wallet verification)
router.post('/:approvalId/approve', verifyUser, verifyAdmin, verifyWalletMatch, approveCertificate);

// Reject a certificate (requires admin/brand_admin role + wallet verification)
router.post('/:approvalId/reject', verifyUser, verifyAdmin, verifyWalletMatch, rejectApproval);

// Submit a renewal request for an expired product or company
router.post('/renewal', verifyUser, async (req, res, next) => {
  try {
    const { entityType, entityId, entityName } = req.body;
    const user = (req as any).user;

    if (!entityType || !entityId) {
      return res.status(400).json({
        success: false,
        message: 'entityType and entityId are required'
      });
    }

    if (entityType !== 'product' && entityType !== 'company') {
      return res.status(400).json({
        success: false,
        message: 'entityType must be "product" or "company"'
      });
    }

    // Check if entity exists and is expired (for products)
    const { ProductRepo, CompanyRepo } = await import('../../typeorm/data-source');
    
    if (entityType === 'product') {
      const product = await ProductRepo.findOne({ where: { _id: entityId } });
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }
      
      // Check if expired
      if (product.expirationDate && new Date(product.expirationDate) > new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Certificate has not expired yet. Renewal is only available for expired certificates.'
        });
      }
    } else {
      const company = await CompanyRepo.findOne({ where: { _id: entityId } });
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        });
      }
    }

    // Create a renewal request as a certificate approval
    const { submitCertificateForApproval } = await import('../../services/certificateApprovalService');
    
    // Generate a new certificate ID for renewal
    const renewalCertId = `RENEWAL-${entityType.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    
    const approval = await submitCertificateForApproval({
      certificateId: renewalCertId,
      entityType,
      entityId,
      entityName: entityName || `${entityType} renewal`,
      pdfHash: `RENEWAL-PENDING-${entityId}`,
      submittedBy: user._id,
      submitterName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
      submitterWallet: user.walletAddress,
      pendingEntityData: {
        renewalRequest: true,
        originalEntityId: entityId,
        requestedAt: new Date().toISOString(),
        requestedBy: user._id
      }
    });

    res.status(201).json({
      success: true,
      message: 'Renewal request submitted successfully',
      data: {
        approvalId: approval._id,
        certificateId: renewalCertId,
        status: approval.status
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post('/renewProduct', verifyUser, submitRenewalForProduct );

// Submit an update request for a product
router.post('/updateProduct', verifyUser, submitUpdateForProduct);

// Submit an archive request for a product
router.post('/archiveProduct', verifyUser, submitArchiveForProduct);

// Submit an unarchive request for a product
router.post('/unarchiveProduct', verifyUser, submitUnarchiveForProduct);

// Get renewal timeline for a product  
router.get('/renewal-timeline/:productId', verifyUser, getRenewalTimeline);

// Get detailed renewal information for an approval
router.get('/renewal-details/:approvalId', verifyUser, getRenewalDetails);

export default router;
