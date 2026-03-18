import { ProductRepo, CompanyRepo } from '../typeorm/data-source';
import { verifyTransactionOnBlockchain } from './sepoliaBlockchainService';

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
  status: 'intact' | 'tampered' | 'no_blockchain' | 'error';
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
// Bulk integrity check
// ---------------------------------------------------------------------------

export interface BulkIntegrityResult {
  totalProducts: number;
  checkedProducts: number;
  intactCount: number;
  tamperedCount: number;
  noBlockchainCount: number;
  errorCount: number;
  /** Only products with issues (tampered / error) are included for brevity */
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
    results: [],
  };

  for (const product of allProducts) {
    if (!product.sepoliaTransactionId) {
      summary.noBlockchainCount++;
      continue;
    }

    const result = await checkProductIntegrity(product._id);
    summary.checkedProducts++;

    switch (result.status) {
      case 'intact':
        summary.intactCount++;
        break;
      case 'tampered':
        summary.tamperedCount++;
        summary.results.push(result);
        break;
      case 'error':
        summary.errorCount++;
        summary.results.push(result);
        break;
      default:
        break;
    }
  }

  return summary;
};
