import type { NextFunction, Request, Response } from 'express';
import CustomError from '../../utils/CustomError';
import { getCertificateBlockchain } from '../../services/certificateblockchain';
import { CertificateData } from '../../services/certificateblock';
import crypto from 'crypto';

/**
 * Add a certificate to the blockchain
 * POST /api/v1/certificate-blockchain/add
 */
export const addCertificateToBlockchain = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { 
            certificateId, 
            certificateType, 
            pdfHash,
            entityId,
            entityName,
            licenseNumber,
            ltoNumber,
            cfprNumber,
            metadata 
        } = req.body;

        // Validation
        if (!certificateId || !certificateType || !pdfHash || !entityId || !entityName) {
            throw new CustomError(400, 'Missing required fields', {
                success: false,
                message: 'certificateId, certificateType, pdfHash, entityId, and entityName are required'
            });
        }

        if (!['company', 'product'].includes(certificateType)) {
            throw new CustomError(400, 'Invalid certificate type', {
                success: false,
                message: 'certificateType must be either "company" or "product"'
            });
        }

        // Validate PDF hash format (should be 64-char SHA-256 hex)
        if (!/^[a-f0-9]{64}$/i.test(pdfHash)) {
            throw new CustomError(400, 'Invalid PDF hash format', {
                success: false,
                message: 'pdfHash must be a valid SHA-256 hash (64 hexadecimal characters)'
            });
        }

        const blockchain = getCertificateBlockchain();

        // Check if certificate already exists
        const existingCert = blockchain.findCertificateByCertificateId(certificateId);
        if (existingCert) {
            throw new CustomError(409, 'Certificate already exists', {
                success: false,
                message: `Certificate ${certificateId} is already registered in the blockchain`,
                blockIndex: existingCert.index
            });
        }

        const certificateData: CertificateData = {
            certificateId,
            certificateType: certificateType as 'company' | 'product',
            pdfHash,
            entityId,
            entityName,
            licenseNumber,
            ltoNumber,
            cfprNumber,
            issuedDate: new Date(),
            metadata
        };

        // Add to blockchain (this will mine the block)
        const block = blockchain.addCertificate(certificateData);

        res.status(201).json({
            success: true,
            message: 'Certificate successfully added to blockchain',
            certificate: {
                certificateId: block.data.certificateId,
                blockIndex: block.index,
                blockHash: block.hash,
                timestamp: block.timestamp,
                certificateType: block.data.certificateType,
                entityName: block.data.entityName,
                pdfHash: block.data.pdfHash,
                isChainValid: blockchain.isChainValid()
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Verify a certificate PDF by comparing hash
 * POST /api/v1/certificate-blockchain/verify
 */
export const verifyCertificatePDF = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { certificateId, pdfHash } = req.body;

        if (!certificateId || !pdfHash) {
            throw new CustomError(400, 'Missing required fields', {
                success: false,
                message: 'certificateId and pdfHash are required'
            });
        }

        const blockchain = getCertificateBlockchain();
        const verification = blockchain.verifyCertificatePDF(certificateId, pdfHash);

        res.status(verification.isValid ? 200 : 400).json({
            success: verification.isValid,
            message: verification.message,
            verification: {
                isValid: verification.isValid,
                certificateId,
                blockIndex: verification.block?.index,
                certificateType: verification.block?.data.certificateType,
                entityName: verification.block?.data.entityName,
                issuedDate: verification.block?.data.issuedDate,
                pdfHashMatch: verification.block?.data.pdfHash === pdfHash,
                blockIntegrity: verification.block?.isValid()
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get certificate details from blockchain
 * GET /api/v1/certificate-blockchain/certificate/:certificateId
 */
export const getCertificateById = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { certificateId } = req.params;
        const blockchain = getCertificateBlockchain();
        
        const block = blockchain.findCertificateByCertificateId(certificateId);

        if (!block) {
            throw new CustomError(404, 'Certificate not found', {
                success: false,
                message: `Certificate ${certificateId} not found in blockchain`
            });
        }

        res.status(200).json({
            success: true,
            message: 'Certificate found',
            certificate: {
                certificateId: block.data.certificateId,
                blockIndex: block.index,
                blockHash: block.hash,
                precedingHash: block.precedingHash,
                timestamp: block.timestamp,
                certificateType: block.data.certificateType,
                entityId: block.data.entityId,
                entityName: block.data.entityName,
                licenseNumber: block.data.licenseNumber,
                ltoNumber: block.data.ltoNumber,
                cfprNumber: block.data.cfprNumber,
                pdfHash: block.data.pdfHash,
                issuedDate: block.data.issuedDate,
                metadata: block.data.metadata,
                isBlockValid: block.isValid()
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get all certificates for an entity (company or product)
 * GET /api/v1/certificate-blockchain/entity/:entityId
 */
export const getCertificatesByEntity = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { entityId } = req.params;
        const blockchain = getCertificateBlockchain();
        
        const blocks = blockchain.findCertificatesByEntityId(entityId);

        res.status(200).json({
            success: true,
            message: `Found ${blocks.length} certificate(s) for entity`,
            certificates: blocks.map(block => ({
                certificateId: block.data.certificateId,
                blockIndex: block.index,
                certificateType: block.data.certificateType,
                entityName: block.data.entityName,
                issuedDate: block.data.issuedDate,
                pdfHash: block.data.pdfHash,
                isValid: block.isValid()
            }))
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get blockchain statistics
 * GET /api/v1/certificate-blockchain/stats
 */
export const getCertificateBlockchainStats = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const blockchain = getCertificateBlockchain();
        const stats = blockchain.getStats();

        res.status(200).json({
            success: true,
            message: 'Blockchain statistics retrieved',
            stats: {
                ...stats,
                totalBlocks: blockchain.blockchain.length,
                chainIntegrity: blockchain.isChainValid()
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Validate entire blockchain
 * GET /api/v1/certificate-blockchain/validate
 */
export const validateCertificateBlockchain = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const blockchain = getCertificateBlockchain();
        const isValid = blockchain.isChainValid();

        res.status(200).json({
            success: true,
            message: isValid ? 'Blockchain is valid' : 'Blockchain integrity compromised',
            validation: {
                isValid,
                totalBlocks: blockchain.blockchain.length,
                totalCertificates: blockchain.blockchain.length - 1,
                difficulty: blockchain.difficulty
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get paginated list of certificates
 * GET /api/v1/certificate-blockchain/certificates
 */
export const getCertificatesList = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;

        const blockchain = getCertificateBlockchain();
        const result = blockchain.getCertificates(page, limit);

        res.status(200).json({
            success: true,
            message: 'Certificates retrieved',
            data: result.certificates.map(block => ({
                certificateId: block.data.certificateId,
                blockIndex: block.index,
                certificateType: block.data.certificateType,
                entityName: block.data.entityName,
                issuedDate: block.data.issuedDate,
                timestamp: block.timestamp,
                isValid: block.isValid()
            })),
            pagination: {
                current_page: result.page,
                total_pages: result.totalPages,
                total_items: result.total,
                items_per_page: limit
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Calculate PDF hash from buffer (utility endpoint for testing)
 * POST /api/v1/certificate-blockchain/calculate-hash
 */
export const calculatePDFHash = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { pdfBase64 } = req.body;

        if (!pdfBase64) {
            throw new CustomError(400, 'Missing PDF data', {
                success: false,
                message: 'pdfBase64 is required'
            });
        }

        // Decode base64 to buffer
        const pdfBuffer = Buffer.from(pdfBase64, 'base64');
        
        // Calculate SHA-256 hash
        const hash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

        res.status(200).json({
            success: true,
            message: 'PDF hash calculated',
            pdfHash: hash,
            fileSize: pdfBuffer.length
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get certificate PDF URL from Firebase Storage
 * GET /api/v1/certificate-blockchain/pdf/:certificateId
 * 
 * This endpoint returns the Firebase Storage URL for a certificate PDF
 * so mobile apps can open/view the original electronic certificate
 */
export const getCertificatePDFUrl = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { certificateId } = req.params;
        const blockchain = getCertificateBlockchain();
        
        // First verify the certificate exists in blockchain
        const block = blockchain.findCertificateByCertificateId(certificateId);

        if (!block) {
            throw new CustomError(404, 'Certificate not found', {
                success: false,
                message: `Certificate ${certificateId} not found in blockchain`
            });
        }

        // Determine certificate type and construct Firebase Storage path
        let certType: 'company' | 'product';
        if (certificateId.startsWith('CERT-COMP-')) {
            certType = 'company';
        } else if (certificateId.startsWith('CERT-PROD-')) {
            certType = 'product';
        } else {
            throw new CustomError(400, 'Invalid certificate ID format', {
                success: false,
                message: 'Certificate ID must start with CERT-COMP- or CERT-PROD-'
            });
        }

        // Construct the Firebase Storage URL
        // Format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?alt=media
        const bucketName = process.env.FIREBASE_STORAGE_BUCKET || 'rcv-firebase-dev.firebasestorage.app';
        const filePath = `certificates/${certType}/${certificateId}.pdf`;
        const encodedPath = encodeURIComponent(filePath);
        const pdfUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media`;

        res.status(200).json({
            success: true,
            message: 'Certificate PDF URL retrieved',
            certificate: {
                certificateId: block.data.certificateId,
                certificateType: block.data.certificateType,
                entityName: block.data.entityName,
                issuedDate: block.data.issuedDate,
                pdfHash: block.data.pdfHash,
                pdfUrl: pdfUrl,
                blockIndex: block.index,
                isBlockValid: block.isValid()
            }
        });
    } catch (error) {
        next(error);
    }
};