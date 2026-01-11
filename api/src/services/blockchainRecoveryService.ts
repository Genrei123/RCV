import { ethers, JsonRpcProvider } from 'ethers';
import { ProductRepo, CompanyRepo } from '../typeorm/data-source';
import { Product } from '../typeorm/entities/product.entity';
import { Company } from '../typeorm/entities/company.entity';

/**
 * Blockchain Recovery Service
 * 
 * This service demonstrates the robustness of blockchain technology by recovering
 * entity records from the Sepolia blockchain even if the database is wiped.
 * 
 * Since all RCV certificate transactions are submitted from the server wallet,
 * we can query all transactions from that wallet and rebuild the database.
 */

const INFURA_API_KEY = process.env.INFURA_API_KEY || '';
const WALLET_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY || '';
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || '';

/**
 * Check if a string is a valid UUID format
 */
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

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
  blockNumber: number;
  blockTimestamp: Date;
  certificateId: string;
  entityType: 'product' | 'company';
  entityName: string;
  pdfHash: string;
  originalTimestamp: string;
  etherscanUrl: string;
  version: string;
  // Entity details (v2.0+)
  entityData?: BlockchainEntityData;
  // Approvers who signed off (v2.0+)
  approvers?: BlockchainApproverRecord[];
}

export interface RecoveryResult {
  success: boolean;
  totalTransactionsScanned: number;
  certificatesFound: number;
  productsRecovered: number;
  companiesRecovered: number;
  skippedExisting: number;
  errors: string[];
  recoveredRecords: RecoveredCertificate[];
}

/**
 * Get all transactions from the server wallet using Etherscan API
 */
export const getWalletTransactions = async (
  walletAddress: string,
  startBlock: number = 0
): Promise<any[]> => {
  if (!ETHERSCAN_API_KEY) {
    console.warn('ETHERSCAN_API_KEY not set. Cannot query wallet transactions.');
    return [];
  }

  try {
    // Etherscan API for Sepolia testnet
    const url = `https://api.etherscan.io/v2/api?chainid=11155111&module=account&action=txlist&address=${walletAddress}&startblock=${startBlock}&endblock=99999999&page=1&offset=10000&sort=asc&apikey=${ETHERSCAN_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === '1' && data.result) {
      return data.result;
    } else if (data.message === 'No transactions found') {
      return [];
    } else {
      console.error('Etherscan API error:', data.message);
      return [];
    }
  } catch (error) {
    console.error('Error fetching wallet transactions:', error);
    return [];
  }
};

/**
 * Decode transaction input data to extract RCV certificate data
 * Supports both v1.0 (basic) and v2.0 (full entity details) formats
 */
export const decodeTransactionData = (inputData: string): RecoveredCertificate | null => {
  if (!inputData || inputData === '0x') {
    return null;
  }

  try {
    // Remove '0x' prefix and decode hex to UTF-8
    const dataString = ethers.toUtf8String(inputData);
    
    // Try to parse as JSON
    let parsed;
    try {
      parsed = JSON.parse(dataString);
    } catch (jsonError) {
      // Not valid JSON - not an RCV certificate
      return null;
    }
    
    // Verify it's an RCV certificate
    if (parsed.type === 'RCV_CERTIFICATE') {
      const version = parsed.version || '1.0';
      
      return {
        txHash: '', // Will be filled by caller
        blockNumber: 0, // Will be filled by caller
        blockTimestamp: new Date(), // Will be filled by caller
        etherscanUrl: '', // Will be filled by caller
        certificateId: parsed.certificateId || 'UNKNOWN',
        entityType: parsed.entityType || 'company',
        entityName: parsed.entityName || 'Unknown Entity',
        pdfHash: parsed.pdfHash || '',
        originalTimestamp: parsed.timestamp || new Date().toISOString(),
        version,
        // v2.0+ fields - entity details for recovery
        entityData: parsed.entity || undefined,
        // v2.0+ fields - approvers list
        approvers: parsed.approvers || undefined
      };
    }
    
    return null;
  } catch (error) {
    // Could not decode - likely not UTF-8 text or not our data format
    return null;
  }
};

/**
 * Get the server wallet address from environment
 */
export const getServerWalletAddress = (): string | null => {
  if (!WALLET_PRIVATE_KEY) {
    return null;
  }
  
  try {
    const wallet = new ethers.Wallet(WALLET_PRIVATE_KEY);
    return wallet.address;
  } catch {
    return null;
  }
};

/**
 * Scan blockchain and recover missing records
 * This is the main recovery function that demonstrates blockchain persistence
 */
export const recoverFromBlockchain = async (): Promise<RecoveryResult> => {
  const result: RecoveryResult = {
    success: false,
    totalTransactionsScanned: 0,
    certificatesFound: 0,
    productsRecovered: 0,
    companiesRecovered: 0,
    skippedExisting: 0,
    errors: [],
    recoveredRecords: []
  };

  console.log('🔗 Starting Blockchain Recovery Service...');

  // Get server wallet address
  const walletAddress = getServerWalletAddress();
  if (!walletAddress) {
    result.errors.push('Server wallet not configured');
    console.error('❌ Server wallet not configured. Cannot perform recovery.');
    return result;
  }

  console.log(`📍 Server Wallet: ${walletAddress}`);

  // Check if ETHERSCAN_API_KEY is set
  if (!ETHERSCAN_API_KEY) {
    result.errors.push('ETHERSCAN_API_KEY environment variable is not set. Cannot query blockchain transactions.');
    console.error('❌ ETHERSCAN_API_KEY not set!');
    return result;
  }

  // Fetch all transactions from the wallet
  console.log('📡 Fetching transactions from Etherscan...');
  const transactions = await getWalletTransactions(walletAddress);
  result.totalTransactionsScanned = transactions.length;
  console.log(`📊 Found ${transactions.length} total transactions`);

  if (transactions.length === 0) {
    result.success = true;
    console.log('✅ No transactions to process');
    return result;
  }

  // Process each transaction
  const certificates: RecoveredCertificate[] = [];
  
  for (const tx of transactions) {
    // Only process successful transactions
    if (tx.isError === '1' || tx.txreceipt_status === '0') {
      console.log(`⏭️  Skipping failed transaction: ${tx.hash}`);
      continue;
    }

    // Decode the transaction data
    const cert = decodeTransactionData(tx.input);
    if (cert) {
      cert.txHash = tx.hash;
      cert.blockNumber = parseInt(tx.blockNumber);
      cert.blockTimestamp = new Date(parseInt(tx.timeStamp) * 1000);
      cert.etherscanUrl = `https://sepolia.etherscan.io/tx/${tx.hash}`;
      certificates.push(cert);
      console.log(`✅ Found RCV certificate in tx ${tx.hash}: ${cert.entityName} (${cert.entityType})`);
    } else if (tx.input && tx.input !== '0x') {
      // Has data but couldn't decode - log for debugging
      console.log(`⚠️  Transaction ${tx.hash} has data but is not an RCV certificate`);
    }
  }

  result.certificatesFound = certificates.length;
  console.log(`🎫 Found ${certificates.length} RCV certificates on blockchain`);

  // Check each certificate against the database
  for (const cert of certificates) {
    try {
      if (cert.entityType === 'product') {
        // Check if product exists by transaction hash
        const existing = await ProductRepo.findOne({
          where: { sepoliaTransactionId: cert.txHash }
        });

        if (existing) {
          result.skippedExisting++;
          continue;
        }

        // Try to find by certificate ID pattern (PROD_xxx or CERT-PROD-xxx)
        // New format: PROD_{uuid}, Old format: CERT-PROD-{LTONumber}-{timestamp}
        let entityId = cert.certificateId.replace('PROD_', '').replace('CERT-PROD-', '');
        
        // Only try to find by ID if it looks like a valid UUID
        if (isValidUUID(entityId)) {
          const existingById = await ProductRepo.findOne({
            where: { _id: entityId }
          });

          if (existingById) {
            // Update existing record with blockchain transaction
            existingById.sepoliaTransactionId = cert.txHash;
            await ProductRepo.save(existingById);
            result.skippedExisting++;
            console.log(`🔄 Updated existing product ${cert.entityName} with tx hash`);
            continue;
          }
        } else {
          console.log(`ℹ️  Certificate ${cert.certificateId} uses old format (not UUID), skipping ID lookup`);
        }

        // Product doesn't exist - log for recovery
        console.log(`🆕 Product found on blockchain: ${cert.entityName}`);
        
        // Products need manual recovery due to foreign key constraints
        result.productsRecovered++;
        result.recoveredRecords.push(cert);
        console.log(`⚠️  Product "${cert.entityName}" found on blockchain but needs manual data entry`);
        console.log(`   📜 Tx Hash: ${cert.txHash}`);
        console.log(`   🔗 Etherscan: https://sepolia.etherscan.io/tx/${cert.txHash}`);
        console.log(`   📅 Block Time: ${cert.blockTimestamp}`);
        
      } else if (cert.entityType === 'company') {
        // Check if company exists by transaction hash
        const existing = await CompanyRepo.findOne({
          where: { sepoliaTransactionId: cert.txHash }
        });

        if (existing) {
          result.skippedExisting++;
          continue;
        }

        // Try to find by certificate ID pattern (COMP_xxx or CERT-COMP-xxx)
        // New format: COMP_{uuid}, Old format: CERT-COMP-{LicenseNumber}-{timestamp}
        let entityId = cert.certificateId.replace('COMP_', '').replace('CERT-COMP-', '');
        
        // Only try to find by ID if it looks like a valid UUID
        if (isValidUUID(entityId)) {
          const existingById = await CompanyRepo.findOne({
            where: { _id: entityId }
          });

          if (existingById) {
            // Update existing record with blockchain transaction
            existingById.sepoliaTransactionId = cert.txHash;
            await CompanyRepo.save(existingById);
            result.skippedExisting++;
            console.log(`🔄 Updated existing company ${cert.entityName} with tx hash`);
            continue;
          }
        } else {
          console.log(`ℹ️  Certificate ${cert.certificateId} uses old format (not UUID), skipping ID lookup`);
        }

        // Company doesn't exist - we CAN recover this with basic info!
        console.log(`🆕 Recovering company: ${cert.entityName}`);
        
        const recoveredCompany = CompanyRepo.create({
          name: cert.entityName,
          address: 'RECOVERED_FROM_BLOCKCHAIN - Please update',
          licenseNumber: `RECOVERED_${cert.txHash.substring(0, 10)}`,
          description: `This record was recovered from blockchain transaction ${cert.txHash}. Original registration: ${cert.originalTimestamp}. Certificate ID: ${cert.certificateId}. Please update with accurate information.`,
          sepoliaTransactionId: cert.txHash
        });

        await CompanyRepo.save(recoveredCompany);
        result.companiesRecovered++;
        result.recoveredRecords.push(cert);
        console.log(`✅ Company "${cert.entityName}" recovered from blockchain!`);
        console.log(`   📜 Tx Hash: ${cert.txHash}`);
        console.log(`   🔗 Etherscan: https://sepolia.etherscan.io/tx/${cert.txHash}`);
      }
    } catch (error) {
      const errorMsg = `Error processing certificate ${cert.certificateId}: ${error}`;
      result.errors.push(errorMsg);
      console.error(`❌ ${errorMsg}`);
    }
  }

  result.success = result.errors.length === 0;
  
  console.log('\n📊 Blockchain Recovery Summary:');
  console.log(`   Total Transactions Scanned: ${result.totalTransactionsScanned}`);
  console.log(`   Certificates Found: ${result.certificatesFound}`);
  console.log(`   Products Needing Recovery: ${result.productsRecovered}`);
  console.log(`   Companies Recovered: ${result.companiesRecovered}`);
  console.log(`   Already Existing (Skipped): ${result.skippedExisting}`);
  console.log(`   Errors: ${result.errors.length}`);

  return result;
};

/**
 * Verify that a specific transaction exists on blockchain
 * Can be used to prove a record existed even if database is gone
 */
export const verifyRecordOnBlockchain = async (
  txHash: string
): Promise<{
  exists: boolean;
  certificate: RecoveredCertificate | null;
  etherscanUrl: string;
}> => {
  const etherscanUrl = `https://sepolia.etherscan.io/tx/${txHash}`;
  
  if (!INFURA_API_KEY) {
    return { exists: false, certificate: null, etherscanUrl };
  }

  try {
    const provider = new JsonRpcProvider(
      `https://sepolia.infura.io/v3/${INFURA_API_KEY}`
    );

    const tx = await provider.getTransaction(txHash);
    if (!tx) {
      return { exists: false, certificate: null, etherscanUrl };
    }

    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt || receipt.status !== 1) {
      return { exists: false, certificate: null, etherscanUrl };
    }

    // Decode the certificate data
    const cert = decodeTransactionData(tx.data);
    if (!cert) {
      return { exists: true, certificate: null, etherscanUrl };
    }

    // Get block timestamp
    const block = await provider.getBlock(receipt.blockNumber);
    
    cert.txHash = txHash;
    cert.blockNumber = receipt.blockNumber;
    cert.blockTimestamp = block ? new Date(Number(block.timestamp) * 1000) : new Date();

    return { exists: true, certificate: cert, etherscanUrl };
  } catch (error) {
    console.error('Error verifying record on blockchain:', error);
    return { exists: false, certificate: null, etherscanUrl };
  }
};

/**
 * Get recovery status - check how many blockchain records are in DB vs missing
 */
export const getRecoveryStatus = async (): Promise<{
  walletAddress: string | null;
  totalBlockchainRecords: number;
  recordsInDatabase: number;
  missingRecords: number;
  lastCheckTime: Date;
}> => {
  const walletAddress = getServerWalletAddress();
  
  if (!walletAddress || !ETHERSCAN_API_KEY) {
    return {
      walletAddress,
      totalBlockchainRecords: 0,
      recordsInDatabase: 0,
      missingRecords: 0,
      lastCheckTime: new Date()
    };
  }

  const transactions = await getWalletTransactions(walletAddress);
  let certificateCount = 0;
  const txHashes: string[] = [];

  for (const tx of transactions) {
    if (tx.isError === '1') continue;
    const cert = decodeTransactionData(tx.input);
    if (cert) {
      certificateCount++;
      txHashes.push(tx.hash);
    }
  }

  // Count how many of these are in our database
  let inDatabase = 0;
  
  for (const txHash of txHashes) {
    const productExists = await ProductRepo.findOne({
      where: { sepoliaTransactionId: txHash }
    });
    const companyExists = await CompanyRepo.findOne({
      where: { sepoliaTransactionId: txHash }
    });
    
    if (productExists || companyExists) {
      inDatabase++;
    }
  }

  return {
    walletAddress,
    totalBlockchainRecords: certificateCount,
    recordsInDatabase: inDatabase,
    missingRecords: certificateCount - inDatabase,
    lastCheckTime: new Date()
  };
};

/**
 * Recover a specific transaction by its hash
 * This fetches the transaction directly from the blockchain and recovers the entity
 */
export const recoverSpecificTransaction = async (
  txHash: string
): Promise<{
  success: boolean;
  message: string;
  certificate: RecoveredCertificate | null;
  recoveredEntityId: string | null;
  entityType: 'product' | 'company' | null;
}> => {
  console.log(`🔍 Attempting to recover transaction: ${txHash}`);
  
  // First, verify the transaction exists and get the certificate data
  const verification = await verifyRecordOnBlockchain(txHash);
  
  if (!verification.exists || !verification.certificate) {
    return {
      success: false,
      message: verification.certificate === null 
        ? 'Transaction found but does not contain RCV certificate data'
        : 'Transaction not found on blockchain',
      certificate: null,
      recoveredEntityId: null,
      entityType: null
    };
  }

  const cert = verification.certificate;
  console.log(`✅ Found RCV certificate: ${cert.entityName} (${cert.entityType})`);

  // Check if already exists in database
  if (cert.entityType === 'product') {
    const existing = await ProductRepo.findOne({
      where: { sepoliaTransactionId: txHash }
    });
    
    if (existing) {
      return {
        success: true,
        message: `Product "${cert.entityName}" already exists in database with this transaction`,
        certificate: cert,
        recoveredEntityId: existing._id,
        entityType: 'product'
      };
    }

    // For products, we can't fully recover due to foreign key constraints
    // But we log the details for manual recovery
    console.log(`⚠️ Product needs manual recovery:`);
    console.log(`   Name: ${cert.entityName}`);
    console.log(`   Certificate ID: ${cert.certificateId}`);
    console.log(`   PDF Hash: ${cert.pdfHash}`);
    console.log(`   Timestamp: ${cert.originalTimestamp}`);
    
    return {
      success: true,
      message: `Product "${cert.entityName}" found on blockchain. Cannot auto-recover due to missing company/user references. Please create manually with this transaction hash.`,
      certificate: cert,
      recoveredEntityId: null,
      entityType: 'product'
    };
    
  } else if (cert.entityType === 'company') {
    const existing = await CompanyRepo.findOne({
      where: { sepoliaTransactionId: txHash }
    });
    
    if (existing) {
      return {
        success: true,
        message: `Company "${cert.entityName}" already exists in database with this transaction`,
        certificate: cert,
        recoveredEntityId: existing._id,
        entityType: 'company'
      };
    }

    // Recover the company
    console.log(`🆕 Recovering company: ${cert.entityName}`);
    
    const recoveredCompany = CompanyRepo.create({
      name: cert.entityName,
      address: 'RECOVERED_FROM_BLOCKCHAIN - Please update',
      licenseNumber: `RECOVERED_${txHash.substring(0, 10)}`,
      description: `This record was recovered from blockchain transaction ${txHash}. Original registration: ${cert.originalTimestamp}. PDF Hash: ${cert.pdfHash}. Please update with accurate information.`,
      sepoliaTransactionId: txHash
    });

    const saved = await CompanyRepo.save(recoveredCompany);
    console.log(`✅ Company recovered with ID: ${saved._id}`);
    
    return {
      success: true,
      message: `Company "${cert.entityName}" successfully recovered from blockchain!`,
      certificate: cert,
      recoveredEntityId: saved._id,
      entityType: 'company'
    };
  }

  return {
    success: false,
    message: `Unknown entity type: ${cert.entityType}`,
    certificate: cert,
    recoveredEntityId: null,
    entityType: null
  };
};

export default {
  recoverFromBlockchain,
  verifyRecordOnBlockchain,
  getRecoveryStatus,
  getServerWalletAddress,
  getWalletTransactions,
  decodeTransactionData,
  recoverSpecificTransaction
};
