import { Router } from 'express';
import {
    addCertificateToBlockchain,
    verifyCertificatePDF,
    getCertificateById,
    getCertificatesByEntity,
    getCertificateBlockchainStats,
    validateCertificateBlockchain,
    getCertificatesList,
    calculatePDFHash,
    getCertificatePDFUrl
} from '../../controllers/blockchain/CertificateBlockchain';
import { verifyUser } from '../../middleware/verifyUser';

const router = Router();

// Certificate Blockchain Routes

// ============ PUBLIC ROUTES ============
// These routes are public for certificate verification

// Verify certificate PDF hash (PUBLIC - for certificate verification page)
router.post('/verify', verifyCertificatePDF);

// Utility: Calculate PDF hash from base64 (PUBLIC - for verification)
router.post('/calculate-hash', calculatePDFHash);

// Get certificate by ID (PUBLIC - for verification)
router.get('/certificate/:certificateId', getCertificateById);

// Get certificate PDF URL from Firebase Storage (PUBLIC - for QR code scanning)
router.get('/pdf/:certificateId', getCertificatePDFUrl);

// Get blockchain statistics (PUBLIC)
router.get('/stats', getCertificateBlockchainStats);

// Validate blockchain integrity (PUBLIC)
router.get('/validate', validateCertificateBlockchain);

// ============ PROTECTED ROUTES ============
// These routes require authentication

// Add certificate to blockchain (PROTECTED)
router.post('/add', verifyUser, addCertificateToBlockchain);

// Get certificates by entity (PROTECTED)
router.get('/entity/:entityId', verifyUser, getCertificatesByEntity);

// Get paginated certificates list (PROTECTED)
router.get('/certificates', verifyUser, getCertificatesList);

export default router;
