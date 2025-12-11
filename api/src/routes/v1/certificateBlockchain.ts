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

const router = Router();

// Certificate Blockchain Routes

// Add certificate to blockchain
router.post('/add', addCertificateToBlockchain);

// Verify certificate PDF hash
router.post('/verify', verifyCertificatePDF);

// Get certificate by ID
router.get('/certificate/:certificateId', getCertificateById);

// Get certificate PDF URL from Firebase Storage (for QR code scanning)
router.get('/pdf/:certificateId', getCertificatePDFUrl);

// Get certificates by entity (company or product)
router.get('/entity/:entityId', getCertificatesByEntity);

// Get blockchain statistics
router.get('/stats', getCertificateBlockchainStats);

// Validate blockchain integrity
router.get('/validate', validateCertificateBlockchain);

// Get paginated certificates list
router.get('/certificates', getCertificatesList);

// Utility: Calculate PDF hash from base64
router.post('/calculate-hash', calculatePDFHash);

export default router;
