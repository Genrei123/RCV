import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

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
  mismatchCount: number;
}

export interface RevertResult {
  success: boolean;
  message: string;
  data: { revertedFields: string[] };
}

export interface BulkIntegrityResult {
  totalProducts: number;
  checkedProducts: number;
  intactCount: number;
  tamperedCount: number;
  noBlockchainCount: number;
  errorCount: number;
  results: IntegrityCheckResult[];
}

/**
 * Check a product's data integrity against the blockchain.
 */
export const checkProductIntegrity = async (
  productId: string
): Promise<IntegrityCheckResult> => {
  const response = await axios.get(
    `${API_URL}/integrity/check/product/${productId}`,
    { withCredentials: true }
  );
  return response.data.data;
};

/**
 * Revert a product's database data to match blockchain values.
 */
export const revertProductIntegrity = async (
  productId: string
): Promise<RevertResult> => {
  const response = await axios.post(
    `${API_URL}/integrity/revert/product/${productId}`,
    {},
    { withCredentials: true }
  );
  return response.data;
};

/**
 * Check integrity for ALL products at once.
 */
export const checkAllProductsIntegrity = async (): Promise<BulkIntegrityResult> => {
  const response = await axios.get(
    `${API_URL}/integrity/check/all`,
    { withCredentials: true }
  );
  return response.data.data;
};

export const IntegrityService = {
  checkProductIntegrity,
  revertProductIntegrity,
  checkAllProductsIntegrity,
};
