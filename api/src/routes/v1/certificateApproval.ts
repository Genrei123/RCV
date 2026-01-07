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

export default router;
