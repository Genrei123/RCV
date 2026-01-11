import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

/**
 * Entity data stored on blockchain (version 2.0+)
 */
export interface BlockchainEntityData {
  // For products
  LTONumber?: string;
  CFPRNumber?: string;
  lotNumber?: string;
  brandName?: string;
  productName?: string;
  classification?: string;
  subClassification?: string;
  expirationDate?: string;
  company?: {
    name: string;
    license: string;
  };
  // Product images (URLs)
  productImageFront?: string;
  productImageBack?: string;
  // For companies
  address?: string;
  licenseNumber?: string;
  phone?: string;
  email?: string;
  businessType?: string;
}

/**
 * Approver record stored on blockchain
 */
export interface BlockchainApproverRecord {
  wallet: string;
  name: string;
  date: string;
}

export interface RecoveredCertificate {
  txHash: string;
  entityType: 'product' | 'company';
  entityName: string;
  certificateId: string;
  pdfHash: string;
  originalTimestamp: string;
  blockTimestamp: string;
  etherscanUrl: string;
  version?: string;
  // Entity details (v2.0+)
  entityData?: BlockchainEntityData;
  // Approvers who signed off (v2.0+)
  approvers?: BlockchainApproverRecord[];
}

export interface RecoveryStatus {
  walletAddress: string | null;
  totalBlockchainRecords: number;
  recordsInDatabase: number;
  missingRecords: number;
  lastCheckTime: string;
}

export interface RecoveryResult {
  totalTransactionsScanned: number;
  certificatesFound: number;
  productsRecovered: number;
  companiesRecovered: number;
  skippedExisting: number;
  errors: string[];
  recoveredRecords: RecoveredCertificate[];
}

export interface VerificationResult {
  exists: boolean;
  etherscanUrl: string;
  certificate: {
    certificateId: string;
    entityType: 'product' | 'company';
    entityName: string;
    pdfHash: string;
    blockNumber: number;
    blockTimestamp: string;
    originalTimestamp: string;
    // v2.0+ fields
    version?: string;
    entityData?: BlockchainEntityData | null;
    approvers?: BlockchainApproverRecord[] | null;
  } | null;
}

export interface WalletInfo {
  walletAddress: string | null;
  etherscanUrl: string | null;
  network: string;
}

export interface TransactionRecoveryResult {
  success: boolean;
  message: string;
  certificate: {
    txHash: string;
    blockNumber: number;
    blockTimestamp: string;
    certificateId: string;
    entityType: 'product' | 'company';
    entityName: string;
    pdfHash: string;
    originalTimestamp: string;
  } | null;
  recoveredEntityId: string | null;
  entityType: 'product' | 'company' | null;
}

export interface TransactionListResult {
  walletAddress: string;
  totalTransactions: number;
  rcvCertificatesCount: number;
  otherTransactionsCount: number;
  rcvCertificates: Array<{
    txHash: string;
    blockNumber: number;
    blockTimestamp: string;
    certificateId: string;
    entityType: 'product' | 'company';
    entityName: string;
    pdfHash: string;
    originalTimestamp: string;
    etherscanUrl: string;
  }>;
}

export const BlockchainRecoveryService = {
  /**
   * Get the current recovery status
   */
  getStatus: async (): Promise<RecoveryStatus> => {
    const response = await axios.get(`${API_URL}/blockchain-recovery/status`, {
      withCredentials: true
    });
    return response.data.data;
  },

  /**
   * Trigger blockchain recovery
   */
  triggerRecovery: async (): Promise<RecoveryResult> => {
    const response = await axios.post(`${API_URL}/blockchain-recovery/recover`, {}, {
      withCredentials: true
    });
    return response.data.data;
  },

  /**
   * Verify a specific transaction on blockchain
   */
  verifyTransaction: async (txHash: string): Promise<VerificationResult> => {
    const response = await axios.get(`${API_URL}/blockchain-recovery/verify/${txHash}`);
    return response.data.data;
  },

  /**
   * Get the server wallet info
   */
  getWalletInfo: async (): Promise<WalletInfo> => {
    const response = await axios.get(`${API_URL}/blockchain-recovery/wallet`);
    return response.data.data;
  },

  /**
   * Get all transactions from the server wallet
   */
  getTransactions: async (): Promise<TransactionListResult> => {
    const response = await axios.get(`${API_URL}/blockchain-recovery/transactions`, {
      withCredentials: true
    });
    return response.data.data;
  },

  /**
   * Recover a specific transaction by its hash
   */
  recoverTransaction: async (txHash: string): Promise<TransactionRecoveryResult> => {
    const response = await axios.post(`${API_URL}/blockchain-recovery/recover-transaction`, 
      { txHash },
      { withCredentials: true }
    );
    return response.data.data;
  },

  /**
   * Rebuild a record from blockchain with additional data
   */
  rebuildRecord: async (data: {
    txHash: string;
    entityType: 'product' | 'company';
    // Company fields
    name?: string;
    address?: string;
    licenseNumber?: string;
    phone?: string;
    email?: string;
    website?: string;
    businessType?: string;
    description?: string;
    // Product fields
    LTONumber?: string;
    CFPRNumber?: string;
    lotNumber?: string;
    brandName?: string;
    productName?: string;
    productClassification?: string;
    productSubClassification?: string;
    expirationDate?: string;
    companyId?: string;
  }): Promise<{
    success: boolean;
    message: string;
    data?: {
      entityId: string;
      entityType: 'product' | 'company';
      name: string;
      txHash: string;
      etherscanUrl: string;
    };
  }> => {
    const response = await axios.post(`${API_URL}/blockchain-recovery/rebuild`, 
      data,
      { withCredentials: true }
    );
    return response.data;
  }
};

export default BlockchainRecoveryService;
