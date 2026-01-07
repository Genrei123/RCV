import type { NextFunction, Request, Response } from 'express';
import CustomError from '../../utils/CustomError';
import {
  getSepoliaStats,
  storePDFHashOnBlockchain,
  verifyTransactionOnBlockchain,
  isAuthorizedWallet,
  authorizeUserWallet,
  revokeWalletAuthorization,
  isWalletAddressInUse,
  getAdminWalletAddress,
  isAdminWallet,
  isValidWalletAddress,
  extractCertificateFromTransaction,
  verifyPDFHashOnBlockchain
} from '../../services/sepoliaBlockchainService';
import { UserRepo, ProductRepo, CompanyRepo } from '../../typeorm/data-source';
import { Not, IsNull } from 'typeorm';

/**
 * Get Sepolia blockchain status
 * GET /api/v1/sepolia/status
 */
export const getSepoliaStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const stats = await getSepoliaStats();
    
    res.status(200).json({
      success: true,
      message: 'Sepolia blockchain status retrieved',
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Store a PDF hash on the Sepolia blockchain
 * POST /api/v1/sepolia/store-hash
 */
export const storeHashOnSepolia = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { pdfHash, certificateId, entityType, entityName, walletAddress } = req.body;
    
    // Validation
    if (!pdfHash || !certificateId || !entityType || !entityName) {
      throw new CustomError(400, 'Missing required fields', {
        success: false,
        message: 'pdfHash, certificateId, entityType, and entityName are required'
      });
    }
    
    if (!['product', 'company'].includes(entityType)) {
      throw new CustomError(400, 'Invalid entity type', {
        success: false,
        message: 'entityType must be either "product" or "company"'
      });
    }
    
    // Check if wallet is authorized (if provided)
    if (walletAddress && !(await isAuthorizedWallet(walletAddress))) {
      throw new CustomError(403, 'Unauthorized wallet', {
        success: false,
        message: 'The provided wallet address is not authorized for blockchain operations'
      });
    }
    
    // Store on blockchain
    const result = await storePDFHashOnBlockchain(
      pdfHash,
      certificateId,
      entityType as 'product' | 'company',
      entityName
    );
    
    if (!result) {
      throw new CustomError(500, 'Blockchain transaction failed', {
        success: false,
        message: 'Failed to store hash on blockchain. Please try again.'
      });
    }
    
    res.status(201).json({
      success: true,
      message: 'PDF hash successfully stored on Sepolia blockchain',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify a transaction on the Sepolia blockchain
 * GET /api/v1/sepolia/verify/:txHash
 */
export const verifySepoliaTransaction = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { txHash } = req.params;
    
    if (!txHash) {
      throw new CustomError(400, 'Missing transaction hash', {
        success: false,
        message: 'Transaction hash is required'
      });
    }
    
    const result = await verifyTransactionOnBlockchain(txHash);
    
    res.status(result.isValid ? 200 : 404).json({
      success: result.isValid,
      message: result.isValid 
        ? 'Transaction verified successfully' 
        : 'Transaction not found or invalid',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Check if a wallet is authorized
 * GET /api/v1/sepolia/check-wallet/:address
 */
export const checkWalletAuthorization = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { address } = req.params;
    
    if (!address) {
      throw new CustomError(400, 'Missing wallet address', {
        success: false,
        message: 'Wallet address is required'
      });
    }
    
    if (!isValidWalletAddress(address)) {
      throw new CustomError(400, 'Invalid wallet address', {
        success: false,
        message: 'The provided address is not a valid Ethereum address'
      });
    }
    
    const isAuthorized = await isAuthorizedWallet(address);
    const isAdmin = await isAdminWallet(address);
    const adminWalletAddress = await getAdminWalletAddress();
    
    res.status(200).json({
      success: true,
      data: {
        address,
        isAuthorized,
        isAdmin,
        adminWalletAddress
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify MetaMask wallet for a user
 * POST /api/v1/sepolia/verify-wallet
 */
export const verifyUserWallet = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId, walletAddress } = req.body;
    
    if (!userId || !walletAddress) {
      throw new CustomError(400, 'Missing required fields', {
        success: false,
        message: 'userId and walletAddress are required'
      });
    }
    
    if (!isValidWalletAddress(walletAddress)) {
      throw new CustomError(400, 'Invalid wallet address', {
        success: false,
        message: 'The provided address is not a valid Ethereum address'
      });
    }
    
    // Get user
    const user = await UserRepo.findOne({ where: { _id: userId } });
    
    if (!user) {
      throw new CustomError(404, 'User not found', {
        success: false,
        message: 'The specified user does not exist'
      });
    }
    
    // Check if wallet address matches
    if (user.walletAddress && user.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      throw new CustomError(403, 'Wallet mismatch', {
        success: false,
        message: 'The connected wallet does not match the registered wallet address'
      });
    }
    
    // Check if wallet is authorized for blockchain operations
    const isAuthorized = await isAuthorizedWallet(walletAddress);
    const isAdmin = await isAdminWallet(walletAddress);
    
    res.status(200).json({
      success: true,
      message: 'Wallet verified successfully',
      data: {
        userId,
        walletAddress,
        isAuthorized,
        isAdmin,
        canPerformBlockchainOps: isAuthorized,
        userRole: user.role,
        walletAuthorized: user.walletAuthorized
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user's wallet address and authorization (Admin only)
 * PUT /api/v1/sepolia/user-wallet/:userId
 * 
 * Note: This endpoint should be protected with verifyAdmin middleware in the routes
 */
export const updateUserWallet = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req.params;
    const { walletAddress, authorize } = req.body;
    
    // Verify the requesting user is an admin
    const requestingUser = (req as any).user;
    if (!requestingUser || requestingUser.role !== 'ADMIN') {
      throw new CustomError(403, 'Admin access required', {
        success: false,
        message: 'Only administrators can update user wallet addresses and authorizations'
      });
    }
    
    if (!walletAddress) {
      throw new CustomError(400, 'Missing wallet address', {
        success: false,
        message: 'walletAddress is required'
      });
    }
    
    if (!isValidWalletAddress(walletAddress)) {
      throw new CustomError(400, 'Invalid wallet address', {
        success: false,
        message: 'The provided address is not a valid Ethereum address'
      });
    }
    
    // Check if wallet is already used by another user
    const walletInUse = await isWalletAddressInUse(walletAddress, userId);
    if (walletInUse) {
      throw new CustomError(409, 'Wallet address already in use', {
        success: false,
        message: 'This wallet address is already associated with another user'
      });
    }
    
    // Get user
    const user = await UserRepo.findOne({ where: { _id: userId } });
    
    if (!user) {
      throw new CustomError(404, 'User not found', {
        success: false,
        message: 'The specified user does not exist'
      });
    }
    
    // Update wallet address
    user.walletAddress = walletAddress.toLowerCase();
    
    // Update authorization if specified
    if (authorize !== undefined) {
      user.walletAuthorized = authorize;
    }
    
    await UserRepo.save(user);
    
    res.status(200).json({
      success: true,
      message: 'User wallet address updated successfully',
      data: {
        userId,
        walletAddress: user.walletAddress,
        walletAuthorized: user.walletAuthorized,
        isAuthorized: user.walletAuthorized
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Authorize a user's wallet for blockchain operations (Admin only)
 * POST /api/v1/sepolia/authorize-wallet
 */
export const authorizeWallet = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId, walletAddress } = req.body;
    
    // Verify the requesting user is an admin
    const requestingUser = (req as any).user;
    if (!requestingUser || requestingUser.role !== 'ADMIN') {
      throw new CustomError(403, 'Admin access required', {
        success: false,
        message: 'Only administrators can authorize wallet addresses'
      });
    }
    
    if (!userId || !walletAddress) {
      throw new CustomError(400, 'Missing required fields', {
        success: false,
        message: 'userId and walletAddress are required'
      });
    }
    
    const result = await authorizeUserWallet(userId, walletAddress);
    
    if (!result.success) {
      throw new CustomError(400, 'Authorization failed', {
        success: false,
        message: result.message
      });
    }
    
    res.status(200).json({
      success: true,
      message: result.message,
      data: result.user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Revoke a user's wallet authorization (Admin only)
 * POST /api/v1/sepolia/revoke-wallet
 */
export const revokeWallet = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req.body;
    
    // Verify the requesting user is an admin
    const requestingUser = (req as any).user;
    if (!requestingUser || requestingUser.role !== 'ADMIN') {
      throw new CustomError(403, 'Admin access required', {
        success: false,
        message: 'Only administrators can revoke wallet authorizations'
      });
    }
    
    if (!userId) {
      throw new CustomError(400, 'Missing required fields', {
        success: false,
        message: 'userId is required'
      });
    }
    
    const result = await revokeWalletAuthorization(userId);
    
    if (!result.success) {
      throw new CustomError(400, 'Revocation failed', {
        success: false,
        message: result.message
      });
    }
    
    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get admin wallet address
 * GET /api/v1/sepolia/admin-wallet
 */
export const getAdminWallet = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const adminWalletAddress = await getAdminWalletAddress();
    
    res.status(200).json({
      success: true,
      data: {
        adminWalletAddress
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all blockchain-verified certificates (products and companies with sepoliaTransactionId)
 * GET /api/v1/sepolia/certificates
 */
export const getBlockchainCertificates = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Get products with blockchain verification
    const [products, productCount] = await ProductRepo.findAndCount({
      where: { sepoliaTransactionId: Not(IsNull()) },
      order: { registeredAt: 'DESC' },
      skip,
      take: limit,
      relations: ['company']
    });

    // Get companies with blockchain verification
    const [companies, companyCount] = await CompanyRepo.findAndCount({
      where: { sepoliaTransactionId: Not(IsNull()) },
      order: { createdAt: 'DESC' },
      skip,
      take: limit
    });

    // Combine and format as certificates
    const certificates = [
      ...products.map(p => ({
        id: p._id,
        certificateId: `PROD-${p._id}`,
        entityType: 'product' as const,
        entityName: p.productName,
        sepoliaTransactionId: p.sepoliaTransactionId,
        issuedDate: p.registeredAt,
        additionalInfo: {
          brandName: p.brandName,
          cfprNumber: p.CFPRNumber,
          companyName: p.company?.name,
          classification: p.productClassification
        }
      })),
      ...companies.map(c => ({
        id: c._id,
        certificateId: `COMP-${c._id}`,
        entityType: 'company' as const,
        entityName: c.name,
        sepoliaTransactionId: c.sepoliaTransactionId,
        issuedDate: c.createdAt,
        additionalInfo: {
          licenseNumber: c.licenseNumber,
          address: c.address,
          businessType: c.businessType
        }
      }))
    ].sort((a, b) => new Date(b.issuedDate).getTime() - new Date(a.issuedDate).getTime());

    const totalCount = productCount + companyCount;
    const totalPages = Math.ceil(totalCount / limit);

    res.status(200).json({
      success: true,
      message: 'Blockchain certificates retrieved',
      certificates,
      pagination: {
        current_page: page,
        total_pages: totalPages,
        total_items: totalCount,
        items_per_page: limit,
        has_next: page < totalPages,
        has_previous: page > 1
      },
      stats: {
        totalCertificates: totalCount,
        productCertificates: productCount,
        companyCertificates: companyCount
      }
    });
  } catch (error) {
    console.error('Error fetching blockchain certificates:', error);
    next(error);
  }
};

/**
 * Get a specific blockchain certificate by ID
 * GET /api/v1/sepolia/certificates/:type/:id
 */
export const getBlockchainCertificateById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { type, id } = req.params;

    if (!['product', 'company'].includes(type)) {
      throw new CustomError(400, 'Invalid certificate type', {
        success: false,
        message: 'Type must be either "product" or "company"'
      });
    }

    let certificate: any = null;

    if (type === 'product') {
      const product = await ProductRepo.findOne({
        where: { _id: id },
        relations: ['company']
      });

      if (product) {
        certificate = {
          id: product._id,
          certificateId: `PROD-${product._id}`,
          entityType: 'product',
          entityName: product.productName,
          sepoliaTransactionId: product.sepoliaTransactionId,
          issuedDate: product.registeredAt,
          etherscanUrl: product.sepoliaTransactionId 
            ? `https://sepolia.etherscan.io/tx/${product.sepoliaTransactionId}`
            : null,
          details: {
            brandName: product.brandName,
            cfprNumber: product.CFPRNumber,
            ltoNumber: product.LTONumber,
            lotNumber: product.lotNumber,
            classification: product.productClassification,
            subClassification: product.productSubClassification,
            expirationDate: product.expirationDate,
            dateOfRegistration: product.dateOfRegistration,
            companyName: product.company?.name,
            companyAddress: product.company?.address
          }
        };
      }
    } else {
      const company = await CompanyRepo.findOne({
        where: { _id: id }
      });

      if (company) {
        certificate = {
          id: company._id,
          certificateId: `COMP-${company._id}`,
          entityType: 'company',
          entityName: company.name,
          sepoliaTransactionId: company.sepoliaTransactionId,
          issuedDate: company.createdAt,
          etherscanUrl: company.sepoliaTransactionId
            ? `https://sepolia.etherscan.io/tx/${company.sepoliaTransactionId}`
            : null,
          details: {
            licenseNumber: company.licenseNumber,
            address: company.address,
            phone: company.phone,
            email: company.email,
            website: company.website,
            businessType: company.businessType,
            registrationDate: company.registrationDate,
            description: company.description
          }
        };
      }
    }

    if (!certificate) {
      throw new CustomError(404, 'Certificate not found', {
        success: false,
        message: `No ${type} found with ID: ${id}`
      });
    }

    res.status(200).json({
      success: true,
      certificate
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get blockchain statistics (from actual data)
 * GET /api/v1/sepolia/blockchain-stats
 */
export const getBlockchainStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Count verified products
    const productCount = await ProductRepo.count({
      where: { sepoliaTransactionId: Not(IsNull()) }
    });

    // Count verified companies
    const companyCount = await CompanyRepo.count({
      where: { sepoliaTransactionId: Not(IsNull()) }
    });

    // Get latest certificate
    const latestProduct = await ProductRepo.findOne({
      where: { sepoliaTransactionId: Not(IsNull()) },
      order: { registeredAt: 'DESC' }
    });

    const latestCompany = await CompanyRepo.findOne({
      where: { sepoliaTransactionId: Not(IsNull()) },
      order: { createdAt: 'DESC' }
    });

    let latestCertificate = null;
    if (latestProduct || latestCompany) {
      const productDate = latestProduct ? new Date(latestProduct.registeredAt).getTime() : 0;
      const companyDate = latestCompany ? new Date(latestCompany.createdAt).getTime() : 0;

      if (productDate > companyDate && latestProduct) {
        latestCertificate = {
          entityName: latestProduct.productName,
          entityType: 'product',
          certificateId: `PROD-${latestProduct._id}`,
          sepoliaTransactionId: latestProduct.sepoliaTransactionId
        };
      } else if (latestCompany) {
        latestCertificate = {
          entityName: latestCompany.name,
          entityType: 'company',
          certificateId: `COMP-${latestCompany._id}`,
          sepoliaTransactionId: latestCompany.sepoliaTransactionId
        };
      }
    }

    res.status(200).json({
      success: true,
      stats: {
        totalCertificates: productCount + companyCount,
        productCertificates: productCount,
        companyCertificates: companyCount,
        chainIntegrity: true, // Sepolia is always valid if tx exists
        latestCertificate
      }
    });
  } catch (error) {
    console.error('Error fetching blockchain stats:', error);
    next(error);
  }
};

/**
 * PUBLIC: Extract certificate data directly from blockchain
 * This works even if our database is completely wiped!
 * GET /api/v1/sepolia/public/certificate/:txHash
 */
export const getPublicCertificateFromBlockchain = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { txHash } = req.params;

    if (!txHash) {
      throw new CustomError(400, 'Missing transaction hash', {
        success: false,
        message: 'Transaction hash is required'
      });
    }

    // Validate transaction hash format
    if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      throw new CustomError(400, 'Invalid transaction hash format', {
        success: false,
        message: 'Transaction hash must be a valid Ethereum transaction hash (0x followed by 64 hex characters)'
      });
    }

    // Extract certificate data directly from blockchain
    const result = await extractCertificateFromTransaction(txHash);

    if (!result.success || !result.certificate) {
      return res.status(404).json({
        success: false,
        message: result.error || 'Certificate not found on blockchain',
        etherscanUrl: result.etherscanUrl
      });
    }

    res.status(200).json({
      success: true,
      message: 'Certificate recovered from blockchain',
      certificate: {
        ...result.certificate,
        blockNumber: result.blockNumber,
        blockTimestamp: result.blockTimestamp,
        etherscanUrl: result.etherscanUrl,
        // This data is IMMUTABLE and cannot be deleted
        verificationNote: 'This certificate data is stored permanently on the Sepolia blockchain and cannot be altered or deleted.'
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUBLIC: Verify a PDF hash against blockchain record
 * This works even if our database is completely wiped!
 * POST /api/v1/sepolia/public/verify
 */
export const publicVerifyPDFHash = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { txHash, pdfHash } = req.body;

    if (!txHash || !pdfHash) {
      throw new CustomError(400, 'Missing required fields', {
        success: false,
        message: 'Both txHash and pdfHash are required'
      });
    }

    // Validate transaction hash format
    if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      throw new CustomError(400, 'Invalid transaction hash format', {
        success: false,
        message: 'Transaction hash must be a valid Ethereum transaction hash'
      });
    }

    // Verify the PDF hash against blockchain
    const result = await verifyPDFHashOnBlockchain(txHash, pdfHash);

    res.status(200).json({
      success: result.isValid,
      verified: result.matches,
      message: result.message,
      certificate: result.certificate,
      blockNumber: result.blockNumber,
      blockTimestamp: result.blockTimestamp,
      etherscanUrl: `https://sepolia.etherscan.io/tx/${txHash}`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUBLIC: Recover certificate data from a list of transaction hashes
 * Useful for disaster recovery
 * POST /api/v1/sepolia/public/recover
 */
export const recoverCertificatesFromBlockchain = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { txHashes } = req.body;

    if (!txHashes || !Array.isArray(txHashes) || txHashes.length === 0) {
      throw new CustomError(400, 'Missing transaction hashes', {
        success: false,
        message: 'Provide an array of transaction hashes to recover certificates'
      });
    }

    if (txHashes.length > 50) {
      throw new CustomError(400, 'Too many transaction hashes', {
        success: false,
        message: 'Maximum 50 transaction hashes per request'
      });
    }

    const results = await Promise.all(
      txHashes.map(async (txHash: string) => {
        const result = await extractCertificateFromTransaction(txHash);
        return {
          txHash,
          success: result.success,
          certificate: result.certificate,
          blockNumber: result.blockNumber,
          blockTimestamp: result.blockTimestamp,
          error: result.error
        };
      })
    );

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    res.status(200).json({
      success: true,
      message: `Recovered ${successful.length} of ${txHashes.length} certificates from blockchain`,
      recovered: successful,
      failed: failed.map(f => ({ txHash: f.txHash, error: f.error })),
      summary: {
        total: txHashes.length,
        recovered: successful.length,
        failed: failed.length
      }
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getSepoliaStatus,
  storeHashOnSepolia,
  verifySepoliaTransaction,
  checkWalletAuthorization,
  verifyUserWallet,
  updateUserWallet,
  authorizeWallet,
  revokeWallet,
  getAdminWallet,
  getBlockchainCertificates,
  getBlockchainCertificateById,
  getBlockchainStats,
  getPublicCertificateFromBlockchain,
  publicVerifyPDFHash,
  recoverCertificatesFromBlockchain
};
