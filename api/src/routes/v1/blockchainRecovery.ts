import express from 'express';
import { verifyUser } from '../../middleware/verifyUser';
import { verifyAdmin } from '../../middleware/verifyAdmin';
import {
  recoverFromBlockchain,
  getRecoveryStatus,
  verifyRecordOnBlockchain,
  getServerWalletAddress,
  getWalletTransactions,
  decodeTransactionData,
  recoverSpecificTransaction
} from '../../services/blockchainRecoveryService';
import { CompanyRepo, ProductRepo, BrandNameRepo, ProductClassificationRepo } from '../../typeorm/data-source';

const router = express.Router();

/**
 * GET /api/v1/blockchain-recovery/status
 * Get the current recovery status - how many blockchain records vs database records
 * Requires: Admin authentication
 */
router.get('/status', verifyUser, verifyAdmin, async (req, res) => {
  try {
    const status = await getRecoveryStatus();
    
    res.status(200).json({
      success: true,
      message: 'Recovery status retrieved',
      data: status
    });
  } catch (error) {
    console.error('Error getting recovery status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get recovery status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/v1/blockchain-recovery/recover
 * Trigger blockchain recovery - scans all transactions and recovers missing records
 * Requires: Admin authentication
 * 
 * This demonstrates the power of blockchain - even if the database is wiped,
 * we can recover records from the immutable blockchain!
 */
router.post('/recover', verifyUser, verifyAdmin, async (req, res) => {
  try {
    console.log('🔗 Admin triggered blockchain recovery...');
    
    const result = await recoverFromBlockchain();
    
    res.status(200).json({
      success: result.success,
      message: result.success 
        ? 'Blockchain recovery completed successfully'
        : 'Blockchain recovery completed with some errors',
      data: {
        totalTransactionsScanned: result.totalTransactionsScanned,
        certificatesFound: result.certificatesFound,
        productsRecovered: result.productsRecovered,
        companiesRecovered: result.companiesRecovered,
        skippedExisting: result.skippedExisting,
        errors: result.errors,
        // Return full recovered record data including entityData and approvers
        recoveredRecords: result.recoveredRecords.map(r => ({
          txHash: r.txHash,
          entityType: r.entityType,
          entityName: r.entityName,
          certificateId: r.certificateId,
          pdfHash: r.pdfHash,
          originalTimestamp: r.originalTimestamp,
          blockTimestamp: r.blockTimestamp,
          etherscanUrl: r.etherscanUrl || `https://sepolia.etherscan.io/tx/${r.txHash}`,
          version: r.version || '1.0',
          entityData: r.entityData || null,
          approvers: r.approvers || null
        }))
      }
    });
  } catch (error) {
    console.error('Error during blockchain recovery:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform blockchain recovery',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/v1/blockchain-recovery/verify/:txHash
 * Verify that a specific transaction exists on blockchain and get its data
 * This can prove a record existed even if database is completely gone
 * Public endpoint - no auth required (for transparency)
 */
router.get('/verify/:txHash', async (req, res) => {
  try {
    const { txHash } = req.params;
    
    if (!txHash || !txHash.startsWith('0x')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transaction hash. Must start with 0x'
      });
    }

    const result = await verifyRecordOnBlockchain(txHash);
    
    res.status(200).json({
      success: true,
      message: result.exists 
        ? 'Transaction found on blockchain'
        : 'Transaction not found or invalid',
      data: {
        exists: result.exists,
        etherscanUrl: result.etherscanUrl,
        certificate: result.certificate ? {
          certificateId: result.certificate.certificateId,
          entityType: result.certificate.entityType,
          entityName: result.certificate.entityName,
          pdfHash: result.certificate.pdfHash,
          blockNumber: result.certificate.blockNumber,
          blockTimestamp: result.certificate.blockTimestamp,
          originalTimestamp: result.certificate.originalTimestamp,
          // v2.0+ fields
          version: result.certificate.version || '1.0',
          entityData: result.certificate.entityData || null,
          approvers: result.certificate.approvers || null
        } : null
      }
    });
  } catch (error) {
    console.error('Error verifying transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify transaction',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/v1/blockchain-recovery/wallet
 * Get the server wallet address (public info)
 * This allows anyone to verify which wallet is used for RCV certificates
 */
router.get('/wallet', (req, res) => {
  const walletAddress = getServerWalletAddress();
  
  res.status(200).json({
    success: true,
    data: {
      walletAddress,
      etherscanUrl: walletAddress 
        ? `https://sepolia.etherscan.io/address/${walletAddress}`
        : null,
      network: 'Sepolia Testnet'
    }
  });
});

/**
 * GET /api/v1/blockchain-recovery/transactions
 * List all RCV certificate transactions from the server wallet
 * This helps debug what's actually on the blockchain
 * Requires: Admin authentication
 */
router.get('/transactions', verifyUser, verifyAdmin, async (req, res) => {
  try {
    const walletAddress = getServerWalletAddress();
    
    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        message: 'Server wallet not configured (WALLET_PRIVATE_KEY not set)'
      });
    }

    console.log(`📡 Fetching all transactions for wallet: ${walletAddress}`);
    const transactions = await getWalletTransactions(walletAddress);
    
    // Parse each transaction to find RCV certificates
    const rcvCertificates = [];
    const otherTransactions = [];
    
    for (const tx of transactions) {
      if (tx.isError === '1') {
        continue; // Skip failed transactions
      }
      
      const cert = decodeTransactionData(tx.input);
      if (cert) {
        rcvCertificates.push({
          txHash: tx.hash,
          blockNumber: parseInt(tx.blockNumber),
          blockTimestamp: new Date(parseInt(tx.timeStamp) * 1000),
          certificateId: cert.certificateId,
          entityType: cert.entityType,
          entityName: cert.entityName,
          pdfHash: cert.pdfHash,
          originalTimestamp: cert.originalTimestamp,
          etherscanUrl: `https://sepolia.etherscan.io/tx/${tx.hash}`
        });
      } else if (tx.input !== '0x') {
        // Transaction has data but it's not an RCV certificate
        otherTransactions.push({
          txHash: tx.hash,
          blockNumber: parseInt(tx.blockNumber),
          blockTimestamp: new Date(parseInt(tx.timeStamp) * 1000),
          from: tx.from,
          to: tx.to,
          value: tx.value,
        });
      }
    }
    
    res.status(200).json({
      success: true,
      message: `Found ${rcvCertificates.length} RCV certificates out of ${transactions.length} total transactions`,
      data: {
        walletAddress,
        totalTransactions: transactions.length,
        rcvCertificatesCount: rcvCertificates.length,
        otherTransactionsCount: otherTransactions.length,
        rcvCertificates,
        // Only show first 10 other transactions to avoid noise
        otherTransactions: otherTransactions.slice(0, 10)
      }
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/v1/blockchain-recovery/recover-transaction
 * Recover a specific transaction by its hash
 * This is useful when you know a specific transaction exists but isn't in the database
 * Requires: Admin authentication
 */
router.post('/recover-transaction', verifyUser, verifyAdmin, async (req, res) => {
  try {
    const { txHash } = req.body;
    
    if (!txHash || !txHash.startsWith('0x')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transaction hash. Must start with 0x'
      });
    }

    console.log(`🔗 Admin requested recovery of specific transaction: ${txHash}`);
    
    const result = await recoverSpecificTransaction(txHash);
    
    res.status(200).json({
      success: result.success,
      message: result.message,
      data: result
    });
  } catch (error) {
    console.error('Error recovering transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to recover transaction',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/v1/blockchain-recovery/rebuild
 * Rebuild a record from blockchain data with automatic dependency creation
 * 
 * For PRODUCTS: Auto-creates Company, Brand, and Classifications if they don't exist
 * For COMPANIES: Creates the company directly
 * 
 * This enables full database recovery from blockchain data alone.
 * Requires: Admin authentication
 */
router.post('/rebuild', verifyUser, verifyAdmin, async (req, res) => {
  try {
    const { 
      txHash, 
      entityType, 
      // Company fields (required for company, optional for product - will use blockchain data)
      name,
      address,
      licenseNumber,
      phone,
      email,
      website,
      businessType,
      description,
      // Product fields (optional - will use blockchain data if available)
      LTONumber,
      CFPRNumber,
      lotNumber,
      brandName,
      productName,
      productClassification,
      productSubClassification,
      expirationDate,
      companyId, // Optional - if not provided, will auto-create from blockchain data
    } = req.body;

    if (!txHash || !txHash.startsWith('0x')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transaction hash. Must start with 0x'
      });
    }

    // First, verify the transaction exists on blockchain
    const verification = await verifyRecordOnBlockchain(txHash);
    
    if (!verification.exists || !verification.certificate) {
      return res.status(400).json({
        success: false,
        message: 'Transaction not found on blockchain or does not contain RCV certificate data'
      });
    }

    const cert = verification.certificate;
    const blockchainEntity = cert.entityData; // Full entity data from blockchain
    
    // Verify entity type matches what's on blockchain
    if (entityType && entityType !== cert.entityType) {
      return res.status(400).json({
        success: false,
        message: `Entity type mismatch. Blockchain shows ${cert.entityType}, but you specified ${entityType}`
      });
    }

    console.log(`🔨 Rebuilding ${cert.entityType}: ${cert.entityName} from blockchain tx ${txHash}`);
    
    // Track what was auto-created
    const autoCreated: { companies: string[], brands: string[], classifications: string[] } = {
      companies: [],
      brands: [],
      classifications: []
    };

    if (cert.entityType === 'company') {
      // Check if already exists with this transaction
      const existing = await CompanyRepo.findOne({
        where: { sepoliaTransactionId: txHash }
      });
      
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Company "${existing.name}" already exists with this blockchain transaction`,
          data: { existingId: existing._id }
        });
      }

      // Use blockchain data if available, otherwise use provided data
      const finalAddress = address || blockchainEntity?.address;
      const finalLicense = licenseNumber || blockchainEntity?.licenseNumber;
      
      // Validate required fields
      if (!finalAddress || !finalLicense) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: address and licenseNumber are required (not found in blockchain data either)'
        });
      }

      // Create the company with blockchain-verified data + user-provided data
      const newCompany = CompanyRepo.create({
        name: name || cert.entityName,
        address: finalAddress,
        licenseNumber: finalLicense,
        phone: phone || blockchainEntity?.phone || undefined,
        email: email || blockchainEntity?.email || undefined,
        website: website || undefined,
        businessType: businessType || blockchainEntity?.businessType || undefined,
        description: description || `Rebuilt from blockchain. Certificate: ${cert.certificateId}. TX: ${txHash}`,
        sepoliaTransactionId: txHash,
      });

      const saved = await CompanyRepo.save(newCompany);
      
      console.log(`✅ Company rebuilt successfully: ${saved._id}`);
      
      return res.status(201).json({
        success: true,
        message: `Company "${saved.name}" rebuilt from blockchain successfully!`,
        data: {
          entityId: saved._id,
          entityType: 'company',
          name: saved.name,
          txHash,
          etherscanUrl: `https://sepolia.etherscan.io/tx/${txHash}`,
          autoCreated
        }
      });

    } else if (cert.entityType === 'product') {
      // Check if already exists with this transaction
      const existing = await ProductRepo.findOne({
        where: { sepoliaTransactionId: txHash }
      });
      
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Product "${existing.productName}" already exists with this blockchain transaction`,
          data: { existingId: existing._id }
        });
      }

      // Get blockchain entity data
      const bcData = blockchainEntity || {};
      
      // Resolve final values (user input overrides blockchain data)
      const finalLTONumber = LTONumber || bcData.LTONumber;
      const finalCFPRNumber = CFPRNumber || bcData.CFPRNumber;
      const finalLotNumber = lotNumber || bcData.lotNumber;
      const finalBrandName = brandName || bcData.brandName || cert.entityName;
      const finalProductName = productName || bcData.productName || cert.entityName;
      const finalClassification = productClassification || bcData.classification;
      const finalSubClassification = productSubClassification || bcData.subClassification;
      const finalExpirationDate = expirationDate || bcData.expirationDate;

      // Validate required fields
      if (!finalLTONumber || !finalCFPRNumber || !finalLotNumber || 
          !finalClassification || !finalSubClassification || !finalExpirationDate) {
        return res.status(400).json({
          success: false,
          message: 'Missing required product fields. Please provide: LTONumber, CFPRNumber, lotNumber, productClassification, productSubClassification, expirationDate'
        });
      }

      // ========== AUTO-CREATE COMPANY ==========
      let resolvedCompanyId = companyId;
      
      if (!resolvedCompanyId && bcData.company) {
        // Try to find existing company by name or license
        let company = await CompanyRepo.findOne({
          where: { name: bcData.company.name }
        });
        
        if (!company && bcData.company.license) {
          company = await CompanyRepo.findOne({
            where: { licenseNumber: bcData.company.license }
          });
        }
        
        if (!company) {
          // Auto-create the company from blockchain data
          console.log(`📦 Auto-creating company: ${bcData.company.name}`);
          const newCompany = CompanyRepo.create({
            name: bcData.company.name,
            licenseNumber: bcData.company.license || `RECOVERED_${txHash.substring(0, 10)}`,
            address: 'Address pending - recovered from blockchain',
            description: `Auto-created during product recovery. TX: ${txHash}`,
          });
          company = await CompanyRepo.save(newCompany);
          autoCreated.companies.push(company.name);
          console.log(`✅ Company auto-created: ${company._id}`);
        }
        
        resolvedCompanyId = company._id;
      }

      if (!resolvedCompanyId) {
        return res.status(400).json({
          success: false,
          message: 'No company found. Please provide companyId or ensure blockchain data contains company info.'
        });
      }

      // ========== AUTO-CREATE BRAND ==========
      let brandNameId: string | undefined;
      
      // Try to find or create brand
      let brand = await BrandNameRepo.findOne({
        where: { name: finalBrandName }
      });
      
      if (!brand) {
        console.log(`🏷️ Auto-creating brand: ${finalBrandName}`);
        brand = BrandNameRepo.create({
          name: finalBrandName,
          description: `Auto-created during blockchain recovery. TX: ${txHash}`,
          isActive: true
        });
        brand = await BrandNameRepo.save(brand);
        autoCreated.brands.push(brand.name);
        console.log(`✅ Brand auto-created: ${brand._id}`);
      }
      brandNameId = brand._id;

      // ========== AUTO-CREATE CLASSIFICATIONS ==========
      let classificationId: string | undefined;
      let subClassificationId: string | undefined;

      // Find or create parent classification
      let parentClassification = await ProductClassificationRepo.findOne({
        where: { name: finalClassification, parentId: undefined as any }
      });
      
      if (!parentClassification) {
        // Try without parentId filter (in case it's null vs undefined)
        parentClassification = await ProductClassificationRepo
          .createQueryBuilder('pc')
          .where('pc.name = :name', { name: finalClassification })
          .andWhere('pc.parentId IS NULL')
          .getOne();
      }
      
      if (!parentClassification) {
        console.log(`📂 Auto-creating classification: ${finalClassification}`);
        parentClassification = ProductClassificationRepo.create({
          name: finalClassification,
          description: `Auto-created during blockchain recovery. TX: ${txHash}`,
          isActive: true
        });
        parentClassification = await ProductClassificationRepo.save(parentClassification);
        autoCreated.classifications.push(parentClassification.name);
        console.log(`✅ Classification auto-created: ${parentClassification._id}`);
      }
      classificationId = parentClassification._id;

      // Find or create sub-classification
      let subClassification = await ProductClassificationRepo.findOne({
        where: { name: finalSubClassification, parentId: classificationId }
      });
      
      if (!subClassification) {
        console.log(`📁 Auto-creating sub-classification: ${finalSubClassification}`);
        subClassification = ProductClassificationRepo.create({
          name: finalSubClassification,
          parentId: classificationId,
          description: `Auto-created during blockchain recovery. TX: ${txHash}`,
          isActive: true
        });
        subClassification = await ProductClassificationRepo.save(subClassification);
        autoCreated.classifications.push(`${finalSubClassification} (sub)`);
        console.log(`✅ Sub-classification auto-created: ${subClassification._id}`);
      }
      subClassificationId = subClassification._id;

      // ========== CREATE PRODUCT ==========
      // Use the admin performing the rebuild as the registrar
      // In disaster recovery, original user may not exist
      const adminUser = (req as any).user;
      
      // Get product images from blockchain if available
      const productImageFront = bcData.productImageFront;
      const productImageBack = bcData.productImageBack;
      
      const newProduct = ProductRepo.create({
        LTONumber: finalLTONumber,
        CFPRNumber: finalCFPRNumber,
        lotNumber: finalLotNumber,
        brandName: finalBrandName,
        productName: finalProductName,
        productClassification: finalClassification,
        productSubClassification: finalSubClassification,
        expirationDate: new Date(finalExpirationDate),
        dateOfRegistration: cert.blockTimestamp || new Date(),
        // Use current admin as registrar - original user may not exist in disaster recovery
        registeredById: adminUser?._id,
        registeredAt: new Date(),
        companyId: resolvedCompanyId,
        brandNameId,
        classificationId,
        subClassificationId,
        sepoliaTransactionId: txHash,
        // Restore images from blockchain if available
        productImageFront: productImageFront || undefined,
        productImageBack: productImageBack || undefined,
      });

      const saved = await ProductRepo.save(newProduct);
      
      console.log(`✅ Product rebuilt successfully: ${saved._id}`);
      
      // Build auto-created summary
      const autoCreatedSummary: string[] = [];
      if (autoCreated.companies.length) autoCreatedSummary.push(`Companies: ${autoCreated.companies.join(', ')}`);
      if (autoCreated.brands.length) autoCreatedSummary.push(`Brands: ${autoCreated.brands.join(', ')}`);
      if (autoCreated.classifications.length) autoCreatedSummary.push(`Classifications: ${autoCreated.classifications.join(', ')}`);
      
      // Check if images were recovered
      const imagesRecovered = !!(productImageFront || productImageBack);
      const imageWarning = !imagesRecovered && bcData ? ' Note: Product images were not stored on blockchain and will need to be re-uploaded.' : '';
      
      return res.status(201).json({
        success: true,
        message: `Product "${saved.productName}" rebuilt from blockchain successfully!` + 
                 (autoCreatedSummary.length ? ` Auto-created: ${autoCreatedSummary.join('; ')}` : '') +
                 imageWarning,
        data: {
          entityId: saved._id,
          entityType: 'product',
          name: saved.productName,
          txHash,
          etherscanUrl: `https://sepolia.etherscan.io/tx/${txHash}`,
          autoCreated,
          imagesRecovered
        }
      });
    }

    return res.status(400).json({
      success: false,
      message: `Unknown entity type: ${cert.entityType}`
    });

  } catch (error) {
    console.error('Error rebuilding from blockchain:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to rebuild from blockchain',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
