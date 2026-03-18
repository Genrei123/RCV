import { DB } from '../typeorm/data-source';
import { ComplianceReport } from '../typeorm/entities/complianceReport.entity';
import { ProductRepo, CompanyRepo, UserRepo } from '../typeorm/data-source';
import { verifyTransactionOnBlockchain } from './sepoliaBlockchainService';
import {
  getWalletTransactions,
  decodeTransactionData,
  getServerWalletAddress,
} from './blockchainRecoveryService';

/**
 * Data Integrity Check Service
 *
 * Compares database records against their immutable blockchain counterparts
 * to detect tampering and optionally revert to the blockchain-trusted values.
 */

export interface FieldComparison {
  field: string;
  label: string;
  dbValue: string | null;
  blockchainValue: string | null;
  match: boolean;
}

export interface IntegrityCheckResult {
  productId: string;
  productName: string;
  status: 'intact' | 'tampered' | 'no_blockchain' | 'error' | 'data_loss';
  message: string;
  txHash: string | null;
  etherscanUrl: string | null;
  blockTimestamp: Date | null;
  fields: FieldComparison[];
  /** Number of fields that differ */
  mismatchCount: number;
}

export interface RevertResult {
  success: boolean;
  message: string;
  revertedFields: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** ISO-8601 date string pattern (full or date-only). */
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(T|\s)/;

/**
 * Normalise a date value (Date object or ISO string) to a UTC date-only
 * string `YYYY-MM-DD`. This avoids false positives caused by timezone
 * offsets (e.g. DB `2027-01-20` vs blockchain `2027-01-21T00:00:00.000Z`).
 */
const normDate = (val: unknown): string | null => {
  if (val === undefined || val === null) return null;
  try {
    const d = val instanceof Date ? val : new Date(String(val));
    if (isNaN(d.getTime())) return String(val).trim();
    return d.toISOString().split('T')[0];
  } catch {
    return String(val).trim();
  }
};

/**
 * Normalise a value to a trimmed string (or null) for comparison.
 * For date fields use `normDate` instead.
 */
const norm = (val: unknown): string | null => {
  if (val === undefined || val === null) return null;
  if (val instanceof Date) return val.toISOString().split('T')[0];
  const str = String(val).trim();
  // If it looks like a date string, normalise through Date
  if (ISO_DATE_RE.test(str)) return normDate(val);
  return str;
};

/**
 * Build a list of field comparisons between a database product and the
 * `entity` object stored on the blockchain.
 */
const buildComparisons = (
  dbProduct: Record<string, any>,
  bcEntity: Record<string, any>
): FieldComparison[] => {
  const mapping: { field: string; label: string; dbKey: string; bcKey: string }[] = [
    { field: 'LTONumber',                 label: 'LTO Number',          dbKey: 'LTONumber',                 bcKey: 'LTONumber' },
    { field: 'CFPRNumber',                label: 'CFPR Number',         dbKey: 'CFPRNumber',                bcKey: 'CFPRNumber' },
    { field: 'lotNumber',                 label: 'Lot Number',          dbKey: 'lotNumber',                 bcKey: 'lotNumber' },
    { field: 'brandName',                 label: 'Brand Name',          dbKey: 'brandName',                 bcKey: 'brandName' },
    { field: 'productName',               label: 'Product Name',        dbKey: 'productName',               bcKey: 'productName' },
    { field: 'productClassification',     label: 'Classification',      dbKey: 'productClassification',     bcKey: 'classification' },
    { field: 'productSubClassification',  label: 'Sub-Classification',  dbKey: 'productSubClassification',  bcKey: 'subClassification' },
    { field: 'expirationDate',            label: 'Expiration Date',     dbKey: 'expirationDate',            bcKey: 'expirationDate' },
  ];

  return mapping.map(({ field, label, dbKey, bcKey }) => {
    const dbVal  = norm(dbProduct[dbKey]);
    const bcVal  = norm(bcEntity[bcKey]);
    return { field, label, dbValue: dbVal, blockchainValue: bcVal, match: dbVal === bcVal };
  });
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compare a product's current database state with its blockchain record.
 */
export const checkProductIntegrity = async (
  productId: string
): Promise<IntegrityCheckResult> => {
  // 1. Fetch product from DB
  const product = await ProductRepo.findOne({
    where: { _id: productId },
    relations: ['company'],
  });

  if (!product) {
    return {
      productId,
      productName: 'Unknown',
      status: 'error',
      message: 'Product not found in database.',
      txHash: null,
      etherscanUrl: null,
      blockTimestamp: null,
      fields: [],
      mismatchCount: 0,
    };
  }

  // 2. Ensure there is a blockchain transaction to compare against
  if (!product.sepoliaTransactionId) {
    return {
      productId,
      productName: product.productName,
      status: 'no_blockchain',
      message: 'This product has not been registered on the blockchain yet.',
      txHash: null,
      etherscanUrl: null,
      blockTimestamp: null,
      fields: [],
      mismatchCount: 0,
    };
  }

  // 3. Fetch the blockchain transaction data
  const verification = await verifyTransactionOnBlockchain(product.sepoliaTransactionId);

  if (!verification.isValid || !verification.data) {
    return {
      productId,
      productName: product.productName,
      status: 'error',
      message: 'Could not verify the blockchain transaction. It may have failed or the blockchain provider is unreachable.',
      txHash: product.sepoliaTransactionId,
      etherscanUrl: `https://sepolia.etherscan.io/tx/${product.sepoliaTransactionId}`,
      blockTimestamp: null,
      fields: [],
      mismatchCount: 0,
    };
  }

  const bcData = verification.data;

  // The entity data may live under `bcData.entity` (v2.0+) or directly on `bcData` (legacy)
  const entityPayload = bcData.entity || bcData;

  // 4. Compare fields
  const fields = buildComparisons(product as any, entityPayload);
  const mismatchCount = fields.filter(f => !f.match).length;

  const status: IntegrityCheckResult['status'] = mismatchCount > 0 ? 'tampered' : 'intact';
  const message = mismatchCount > 0
    ? `⚠️ ${mismatchCount} field(s) differ between the database and the blockchain record.`
    : '✅ All checked fields match the blockchain record.';

  return {
    productId,
    productName: product.productName,
    status,
    message,
    txHash: product.sepoliaTransactionId,
    etherscanUrl: `https://sepolia.etherscan.io/tx/${product.sepoliaTransactionId}`,
    blockTimestamp: verification.timestamp,
    fields,
    mismatchCount,
  };
};

/**
 * Revert the database product to match the blockchain-stored values.
 * Only fields stored on the entity payload are overwritten.
 */
export const revertProductFromBlockchain = async (
  productId: string
): Promise<RevertResult> => {
  // 1. Fetch product
  const product = await ProductRepo.findOne({ where: { _id: productId } });

  if (!product) {
    return { success: false, message: 'Product not found.', revertedFields: [] };
  }

  if (!product.sepoliaTransactionId) {
    return { success: false, message: 'Product has no blockchain transaction to revert from.', revertedFields: [] };
  }

  // 2. Fetch blockchain data
  const verification = await verifyTransactionOnBlockchain(product.sepoliaTransactionId);

  if (!verification.isValid || !verification.data) {
    return { success: false, message: 'Could not fetch blockchain data.', revertedFields: [] };
  }

  const bcData = verification.data;
  const entityPayload = bcData.entity || bcData;

  // 3. Map blockchain fields back onto the product
  const revertedFields: string[] = [];

  const applyField = (dbKey: string, bcKey: string) => {
    const bcVal = entityPayload[bcKey];
    if (bcVal !== undefined && bcVal !== null) {
      const currentVal = norm((product as any)[dbKey]);
      const newVal = norm(bcVal);
      if (currentVal !== newVal) {
        if (dbKey === 'expirationDate') {
          (product as any)[dbKey] = new Date(bcVal);
        } else {
          (product as any)[dbKey] = bcVal;
        }
        revertedFields.push(dbKey);
      }
    }
  };

  applyField('LTONumber', 'LTONumber');
  applyField('CFPRNumber', 'CFPRNumber');
  applyField('lotNumber', 'lotNumber');
  applyField('brandName', 'brandName');
  applyField('productName', 'productName');
  applyField('productClassification', 'classification');
  applyField('productSubClassification', 'subClassification');
  applyField('expirationDate', 'expirationDate');

  if (revertedFields.length === 0) {
    return { success: true, message: 'No differences found; nothing to revert.', revertedFields: [] };
  }

  // 4. Save
  await ProductRepo.save(product);

  return {
    success: true,
    message: `Successfully reverted ${revertedFields.length} field(s) to blockchain values.`,
    revertedFields,
  };
};

// ---------------------------------------------------------------------------
// Restore Deleted Product
// ---------------------------------------------------------------------------

/**
 * Restores a deleted product from the blockchain record.
 * This re-creates the product in the database using the payload from the blockchain.
 */
export const restoreDeletedProduct = async (
  productId: string,
  txHash: string
): Promise<{ success: boolean; message: string; product?: any }> => {
  // 1. Check if the product already exists
  const existingProduct = await ProductRepo.findOne({ where: { _id: productId } });
  if (existingProduct) {
    return { success: false, message: 'Product already exists in the database. Use revert instead.' };
  }

  // 2. Fetch the blockchain transaction data
  const verification = await verifyTransactionOnBlockchain(txHash);

  if (!verification.isValid || !verification.data) {
    return { success: false, message: 'Could not fetch or verify blockchain data for this transaction.' };
  }

  const bcData = verification.data;
  const entityPayload = bcData.entity || bcData;

  // 3. Find an admin user to assign as the registeredBy (required field)
  const adminUser = await UserRepo.findOne({ where: { role: 'ADMIN' } }) || await UserRepo.findOne({ where: {} });
  if (!adminUser) {
    return { success: false, message: 'System error: Cannot restore product as no users exist in the database to assign registration to.' };
  }
  
  // Recreate the product instance using the exact same ID
  const newProduct = ProductRepo.create({
    _id: productId, // Restore original ID
    sepoliaTransactionId: txHash,
    LTONumber: entityPayload.LTONumber || '',
    CFPRNumber: entityPayload.CFPRNumber || '',
    lotNumber: entityPayload.lotNumber || '',
    brandName: entityPayload.brandName || '',
    productName: entityPayload.productName || bcData.entityName || 'Restored Product',
    productClassification: entityPayload.classification || entityPayload.productClassification || '',
    productSubClassification: entityPayload.subClassification || entityPayload.productSubClassification || '',
    productImageFront: entityPayload.productImageFront || '',
    productImageBack: entityPayload.productImageBack || '',
    expirationDate: entityPayload.expirationDate ? new Date(entityPayload.expirationDate) : new Date('2099-12-31'),
    isArchived: false,
    dateOfRegistration: new Date(bcData.timestamp || Date.now()),
    registeredById: adminUser._id,
    registeredAt: new Date(),
  });

  // 4. Try to re-link the company if it still exists
  let companyFound = false;
  if (entityPayload.companyName) {
    const company = await CompanyRepo.findOne({ where: { name: entityPayload.companyName } });
    if (company) {
      newProduct.companyId = company._id;
      newProduct.company = company;
      companyFound = true;
    }
  }
  
  // If no company found but it's required, we need a fallback
  if (!companyFound) {
    let fallbackCompany = await CompanyRepo.findOne({ where: { name: 'Restored Company' } });
    if (!fallbackCompany) {
      fallbackCompany = CompanyRepo.create({
        name: 'Restored Company',
        address: 'Restored from blockchain',
        licenseNumber: 'RESTORED-123'
      });
      await CompanyRepo.save(fallbackCompany);
    }
    newProduct.companyId = fallbackCompany._id;
    newProduct.company = fallbackCompany;
  }

  // 5. Save the restored product to DB
  try {
    await ProductRepo.save(newProduct);
  } catch (error) {
    console.error("RESTORE ERROR:", error);
    return { success: false, message: "RESTORE ERROR: " + (error instanceof Error ? error.message : String(error)) };
  }

  return {
    success: true,
    message: 'Product successfully restored from the blockchain record.',
    product: newProduct,
  };
};

// ---------------------------------------------------------------------------
// Bulk integrity check
// ---------------------------------------------------------------------------

export interface BulkIntegrityResult {
  totalProducts: number;
  checkedProducts: number;
  intactCount: number;
  tamperedCount: number;
  noBlockchainCount: number;
  errorCount: number;
  dataLossCount: number;
  /** Full list of all product validation outcomes (used for exhaustive investigation excel reports) */
  results: IntegrityCheckResult[];
}

/**
 * Check integrity for ALL products that have a blockchain transaction.
 * Returns a summary and detailed results for every product that is
 * tampered or had an error.
 */
export const checkAllProductsIntegrity = async (): Promise<BulkIntegrityResult> => {
  const allProducts = await ProductRepo.find({
    relations: ['company'],
  });

  const summary: BulkIntegrityResult = {
    totalProducts: allProducts.length,
    checkedProducts: 0,
    intactCount: 0,
    tamperedCount: 0,
    noBlockchainCount: 0,
    errorCount: 0,
    dataLossCount: 0,
    results: [],
  };

  for (const product of allProducts) {
    if (!product.sepoliaTransactionId) {
      summary.noBlockchainCount++;
      summary.results.push({
        productId: product._id,
        productName: product.productName,
        status: 'no_blockchain',
        message: 'This product has not been registered on the blockchain yet.',
        txHash: null,
        etherscanUrl: null,
        blockTimestamp: null,
        fields: [],
        mismatchCount: 0,
      });
      continue;
    }

    const result = await checkProductIntegrity(product._id);
    summary.checkedProducts++;
    summary.results.push(result); // push everything

    switch (result.status) {
      case 'intact':
        summary.intactCount++;
        break;
      case 'tampered':
        summary.tamperedCount++;
        break;
      case 'error':
        summary.errorCount++;
        break;
      default:
        break;
    }
  }

  // Detect Data Loss
  try {
    const walletAddress = getServerWalletAddress();
    if (walletAddress) {
      const transactions = await getWalletTransactions(walletAddress);
      
      // Use a Map to keep only the latest transaction for each certificateId
      // (in case a record was updated multiple times)
      const blockchainProducts = new Map<string, any>();

      for (const tx of transactions) {
        if (tx.isError !== '0') continue; // Skip failed txs

        const decoded = decodeTransactionData(tx.input);
        if (decoded && decoded.entityType === 'product') {
          // It's a valid RCV product certificate
          blockchainProducts.set(decoded.certificateId, {
            ...decoded,
            txHash: tx.hash,
            timestamp: new Date(parseInt(tx.timeStamp) * 1000)
          });
        }
      }

      // Check which blockchain products are missing in the DB
      // Create a Set of existing DB product IDs for fast lookup
      const existingProductIds = new Set(allProducts.map(p => p._id.toString()));

      for (const [certId, bcData] of blockchainProducts.entries()) {
        if (!existingProductIds.has(certId)) {
          // Data Loss Detected!
          summary.dataLossCount++;
          
          // Construct the missing fields for the UI/Excel report
          const missingFields = buildComparisons({}, bcData.entityData || bcData);
          // They won't "match" because DB value is null/empty
          missingFields.forEach(f => f.match = false);

          summary.results.push({
            productId: certId,
            productName: bcData.entityName || 'Unknown Product',
            status: 'data_loss',
            message: 'Product detected on blockchain but missing from database (Data Loss).',
            txHash: bcData.txHash,
            etherscanUrl: `https://sepolia.etherscan.io/tx/${bcData.txHash}`,
            blockTimestamp: bcData.timestamp,
            fields: missingFields,
            mismatchCount: missingFields.length,
          });
        }
      }
    }
  } catch (err) {
    console.error('Error during data loss detection:', err);
  }

  return summary;
};


export interface ReportIntegrityCheckResult {
  reportId: string;
  status: 'intact' | 'tampered' | 'no_blockchain' | 'error' | 'data_loss';
  message: string;
  txHash: string | null;
  etherscanUrl: string | null;
  blockTimestamp: Date | null;
  fields: FieldComparison[];
  mismatchCount: number;
}

export const checkReportIntegrity = async (
  reportId: string
): Promise<ReportIntegrityCheckResult> => {
  try {
    const complianceRepo = DB.getRepository(ComplianceReport);
    const report = await complianceRepo.findOne({ where: { _id: reportId } });

    if (!report) {
      return {
        reportId,
        status: 'error',
        message: 'Report not found in database',
        txHash: null,
        etherscanUrl: null,
        blockTimestamp: null,
        fields: [],
        mismatchCount: 0,
      };
    }

    if (!report.txHash) {
      return {
        reportId,
        status: 'no_blockchain',
        message: 'No blockchain record found for this report (never resolved on-chain).',
        txHash: null,
        etherscanUrl: null,
        blockTimestamp: null,
        fields: [],
        mismatchCount: 0,
      };
    }

    // Verify on Sepolia via existing method
    const validationResult = await verifyTransactionOnBlockchain(report.txHash);
    
    if (!validationResult.isValid || !validationResult.data) {
      return {
        reportId,
        status: 'error',
        message: 'Failed to retrieve transaction data from Sepolia blockchain.',
        txHash: report.txHash,
        etherscanUrl: `https://sepolia.etherscan.io/tx/${report.txHash}`,
        blockTimestamp: null,
        fields: [],
        mismatchCount: 0,
      };
    }

    const onChainData = validationResult.data;
    if (onChainData.type !== 'RCV_REPORT_RESOLUTION') {
      return {
        reportId,
        status: 'error',
        message: 'Transaction found, but does not identify as a Report Resolution.',
        txHash: report.txHash,
        etherscanUrl: `https://sepolia.etherscan.io/tx/${report.txHash}`,
        blockTimestamp: new Date(validationResult.timestamp || Date.now()),
        fields: [],
        mismatchCount: 0,
      };
    }

    const { reportData } = onChainData;
    const comparisons: FieldComparison[] = [];
    let mismatches = 0;

    const addComparison = (
      field: string,
      label: string,
      dbVal: string | null,
      bcVal: string | null
    ) => {
      const dbStr = dbVal || 'N/A';
      const bcStr = bcVal || 'N/A';
      const match = dbStr === bcStr;
      if (!match) mismatches++;
      comparisons.push({
        field,
        label,
        dbValue: dbStr,
        blockchainValue: bcStr,
        match,
      });
    };

    addComparison('status', 'Status', report.status, reportData.newStatus);
    // You could test original status if it was kept, notes, etc.

    return {
      reportId,
      status: mismatches === 0 ? 'intact' : 'tampered',
      message: mismatches === 0
        ? 'Report resolution matches immutable blockchain record.'
        : `Found ${mismatches} discrepancy(ies) between database and blockchain.`,
      txHash: report.txHash,
      etherscanUrl: `https://sepolia.etherscan.io/tx/${report.txHash}`,
      blockTimestamp: new Date(validationResult.timestamp || Date.now()),
      fields: comparisons,
      mismatchCount: mismatches,
    };
  } catch (err: any) {
    console.error('Integrity check error for report', reportId, err);
    return {
      reportId,
      status: 'error',
      message: err.message || 'Error occurred during integrity check.',
      txHash: null,
      etherscanUrl: null,
      blockTimestamp: null,
      fields: [],
      mismatchCount: 0,
    };
  }
};
