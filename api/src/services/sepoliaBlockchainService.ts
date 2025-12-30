import { ethers, JsonRpcProvider, Wallet } from 'ethers';

/**
 * Sepolia Blockchain Service
 * Handles storing PDF hashes on the Ethereum Sepolia testnet
 */

// Environment variables (should be set in .env)
const INFURA_API_KEY = process.env.INFURA_API_KEY || '';
const WALLET_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY || '';
const ADMIN_WALLET_ADDRESS = process.env.ADMIN_WALLET_ADDRESS || '';

// Provider and wallet instances
let provider: JsonRpcProvider | null = null;
let wallet: Wallet | null = null;

// Authorized wallet addresses for blockchain operations
const authorizedWallets: Set<string> = new Set([
  ADMIN_WALLET_ADDRESS.toLowerCase()
]);

export interface BlockchainTransaction {
  txHash: string;
  blockNumber: number;
  pdfHash: string;
  certificateId: string;
  timestamp: Date;
  etherscanUrl: string;
}

export interface SepoliaStats {
  isConnected: boolean;
  networkName: string;
  chainId: string | null;
  walletAddress: string;
  balance: string;
  authorizedWallets: string[];
}

/**
 * Initialize the Sepolia blockchain connection
 */
export const initializeSepoliaBlockchain = async (): Promise<boolean> => {
  try {
    console.log('Initializing Sepolia blockchain connection...');
    
    provider = new JsonRpcProvider(
      `https://sepolia.infura.io/v3/${INFURA_API_KEY}`
    );
    
    wallet = new Wallet(WALLET_PRIVATE_KEY, provider);
    
    // Verify connection
    const network = await provider.getNetwork();
    console.log(`Connected to: ${network.name} (Chain ID: ${network.chainId})`);
    
    // Check wallet balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`Wallet address: ${wallet.address}`);
    console.log(`Wallet balance: ${ethers.formatEther(balance)} ETH`);
    
    return true;
  } catch (error) {
    console.error('Failed to initialize Sepolia blockchain:', error);
    return false;
  }
};

/**
 * Check if blockchain is initialized
 */
export const isSepoliaInitialized = (): boolean => {
  return provider !== null && wallet !== null;
};

// Cache for stats to avoid repeated blockchain calls
let cachedStats: SepoliaStats | null = null;
let lastStatsFetch: number = 0;
const STATS_CACHE_DURATION = 30000; // 30 seconds

/**
 * Helper function to add timeout to a promise
 */
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), timeoutMs))
  ]);
};

/**
 * Get blockchain connection stats
 */
export const getSepoliaStats = async (): Promise<SepoliaStats> => {
  if (!provider || !wallet) {
    return {
      isConnected: false,
      networkName: 'Not connected',
      chainId: null,
      walletAddress: '',
      balance: '0',
      authorizedWallets: Array.from(authorizedWallets)
    };
  }
  
  // Return cached stats if still valid
  const now = Date.now();
  if (cachedStats && (now - lastStatsFetch) < STATS_CACHE_DURATION) {
    return cachedStats;
  }
  
  try {
    // Add 5 second timeout for blockchain calls
    const [network, balance] = await Promise.all([
      withTimeout(provider.getNetwork(), 5000, null),
      withTimeout(provider.getBalance(wallet.address), 5000, BigInt(0))
    ]);
    
    if (!network) {
      throw new Error('Network fetch timed out');
    }
    
    cachedStats = {
      isConnected: true,
      networkName: network.name,
      chainId: network.chainId.toString(),
      walletAddress: wallet.address,
      balance: ethers.formatEther(balance),
      authorizedWallets: Array.from(authorizedWallets)
    };
    lastStatsFetch = now;
    
    return cachedStats;
  } catch (error) {
    console.error('Error getting Sepolia stats:', error);
    return {
      isConnected: false,
      networkName: 'Error',
      chainId: null,
      walletAddress: wallet.address,
      balance: '0',
      authorizedWallets: Array.from(authorizedWallets)
    };
  }
};

/**
 * Check if a wallet address is authorized
 */
export const isAuthorizedWallet = (walletAddress: string): boolean => {
  return authorizedWallets.has(walletAddress.toLowerCase());
};

/**
 * Add an authorized wallet address
 */
export const addAuthorizedWallet = (walletAddress: string): boolean => {
  if (!ethers.isAddress(walletAddress)) {
    return false;
  }
  authorizedWallets.add(walletAddress.toLowerCase());
  return true;
};

/**
 * Remove an authorized wallet address
 */
export const removeAuthorizedWallet = (walletAddress: string): boolean => {
  // Cannot remove the main admin wallet
  if (walletAddress.toLowerCase() === ADMIN_WALLET_ADDRESS.toLowerCase()) {
    return false;
  }
  return authorizedWallets.delete(walletAddress.toLowerCase());
};

/**
 * Get the admin wallet address
 */
export const getAdminWalletAddress = (): string => {
  return ADMIN_WALLET_ADDRESS;
};

/**
 * Store a PDF hash on the Sepolia blockchain
 * @param pdfHash The SHA-256 hash of the PDF
 * @param certificateId The certificate ID
 * @param entityType 'product' or 'company'
 * @param entityName Name of the product or company
 */
export const storePDFHashOnBlockchain = async (
  pdfHash: string,
  certificateId: string,
  entityType: 'product' | 'company',
  entityName: string
): Promise<BlockchainTransaction | null> => {
  if (!provider || !wallet) {
    console.error('Sepolia blockchain not initialized');
    return null;
  }
  
  try {
    console.log('Storing PDF hash on Sepolia blockchain...');
    
    // Create the data payload
    const dataPayload = JSON.stringify({
      type: 'RCV_CERTIFICATE',
      version: '1.0',
      certificateId,
      entityType,
      entityName,
      pdfHash,
      timestamp: new Date().toISOString()
    });
    
    // Convert to hex
    const dataInHex = ethers.hexlify(ethers.toUtf8Bytes(dataPayload));
    
    // Get current gas price
    const feeData = await provider.getFeeData();
    
    // Send transaction
    const tx = await wallet.sendTransaction({
      to: wallet.address, // Sending to self to store data
      value: 0,
      data: dataInHex,
      gasLimit: 100000, // Set a reasonable gas limit
      maxFeePerGas: feeData.maxFeePerGas,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas
    });
    
    console.log(`Transaction sent! Tx Hash: ${tx.hash}`);
    
    // Wait for confirmation
    const receipt = await tx.wait();
    
    if (!receipt) {
      throw new Error('Transaction receipt is null');
    }
    
    console.log(`Success! Block Number: ${receipt.blockNumber}`);
    console.log(`View on Etherscan: https://sepolia.etherscan.io/tx/${tx.hash}`);
    
    return {
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      pdfHash,
      certificateId,
      timestamp: new Date(),
      etherscanUrl: `https://sepolia.etherscan.io/tx/${tx.hash}`
    };
  } catch (error) {
    console.error('Error storing PDF hash on blockchain:', error);
    return null;
  }
};

/**
 * Verify a transaction on the Sepolia blockchain
 * @param txHash The transaction hash to verify
 */
export const verifyTransactionOnBlockchain = async (
  txHash: string
): Promise<{
  isValid: boolean;
  data: any | null;
  blockNumber: number | null;
  timestamp: Date | null;
}> => {
  if (!provider) {
    return { isValid: false, data: null, blockNumber: null, timestamp: null };
  }
  
  try {
    // Get transaction
    const tx = await provider.getTransaction(txHash);
    
    if (!tx) {
      return { isValid: false, data: null, blockNumber: null, timestamp: null };
    }
    
    // Get transaction receipt
    const receipt = await provider.getTransactionReceipt(txHash);
    
    if (!receipt || receipt.status !== 1) {
      return { isValid: false, data: null, blockNumber: null, timestamp: null };
    }
    
    // Decode the data
    let decodedData = null;
    if (tx.data && tx.data !== '0x') {
      try {
        const dataString = ethers.toUtf8String(tx.data);
        decodedData = JSON.parse(dataString);
      } catch {
        decodedData = { raw: tx.data };
      }
    }
    
    // Get block timestamp
    const block = await provider.getBlock(receipt.blockNumber);
    const timestamp = block ? new Date(Number(block.timestamp) * 1000) : null;
    
    return {
      isValid: true,
      data: decodedData,
      blockNumber: receipt.blockNumber,
      timestamp
    };
  } catch (error) {
    console.error('Error verifying transaction:', error);
    return { isValid: false, data: null, blockNumber: null, timestamp: null };
  }
};

/**
 * Validate an Ethereum wallet address
 */
export const isValidWalletAddress = (address: string): boolean => {
  return ethers.isAddress(address);
};

/**
 * Certificate data structure stored on blockchain
 */
export interface BlockchainCertificateData {
  type: string;
  version: string;
  certificateId: string;
  entityType: 'product' | 'company';
  entityName: string;
  pdfHash: string;
  timestamp: string;
}

/**
 * Extract certificate data from a transaction
 * This can recover data even if our database is completely wiped
 */
export const extractCertificateFromTransaction = async (
  txHash: string
): Promise<{
  success: boolean;
  certificate: BlockchainCertificateData | null;
  blockNumber: number | null;
  blockTimestamp: Date | null;
  etherscanUrl: string;
  error?: string;
}> => {
  if (!provider) {
    return { 
      success: false, 
      certificate: null, 
      blockNumber: null, 
      blockTimestamp: null,
      etherscanUrl: `https://sepolia.etherscan.io/tx/${txHash}`,
      error: 'Blockchain not initialized'
    };
  }
  
  try {
    // Get transaction
    const tx = await provider.getTransaction(txHash);
    
    if (!tx) {
      return { 
        success: false, 
        certificate: null, 
        blockNumber: null, 
        blockTimestamp: null,
        etherscanUrl: `https://sepolia.etherscan.io/tx/${txHash}`,
        error: 'Transaction not found'
      };
    }
    
    // Get transaction receipt to verify it succeeded
    const receipt = await provider.getTransactionReceipt(txHash);
    
    if (!receipt || receipt.status !== 1) {
      return { 
        success: false, 
        certificate: null, 
        blockNumber: null, 
        blockTimestamp: null,
        etherscanUrl: `https://sepolia.etherscan.io/tx/${txHash}`,
        error: 'Transaction failed or pending'
      };
    }
    
    // Decode the data from the transaction
    let certificate: BlockchainCertificateData | null = null;
    if (tx.data && tx.data !== '0x') {
      try {
        const dataString = ethers.toUtf8String(tx.data);
        const parsed = JSON.parse(dataString);
        
        // Verify it's an RCV certificate
        if (parsed.type === 'RCV_CERTIFICATE') {
          certificate = parsed as BlockchainCertificateData;
        } else {
          return {
            success: false,
            certificate: null,
            blockNumber: receipt.blockNumber,
            blockTimestamp: null,
            etherscanUrl: `https://sepolia.etherscan.io/tx/${txHash}`,
            error: 'Transaction is not an RCV certificate'
          };
        }
      } catch {
        return {
          success: false,
          certificate: null,
          blockNumber: receipt.blockNumber,
          blockTimestamp: null,
          etherscanUrl: `https://sepolia.etherscan.io/tx/${txHash}`,
          error: 'Could not decode transaction data'
        };
      }
    }
    
    // Get block timestamp
    const block = await provider.getBlock(receipt.blockNumber);
    const blockTimestamp = block ? new Date(Number(block.timestamp) * 1000) : null;
    
    return {
      success: true,
      certificate,
      blockNumber: receipt.blockNumber,
      blockTimestamp,
      etherscanUrl: `https://sepolia.etherscan.io/tx/${txHash}`
    };
  } catch (error) {
    console.error('Error extracting certificate from transaction:', error);
    return { 
      success: false, 
      certificate: null, 
      blockNumber: null, 
      blockTimestamp: null,
      etherscanUrl: `https://sepolia.etherscan.io/tx/${txHash}`,
      error: 'Failed to extract certificate data'
    };
  }
};

/**
 * Verify a PDF hash against the blockchain
 * This works purely from blockchain data - no database needed!
 */
export const verifyPDFHashOnBlockchain = async (
  txHash: string,
  pdfHashToVerify: string
): Promise<{
  isValid: boolean;
  matches: boolean;
  certificate: BlockchainCertificateData | null;
  blockNumber: number | null;
  blockTimestamp: Date | null;
  message: string;
}> => {
  const result = await extractCertificateFromTransaction(txHash);
  
  if (!result.success || !result.certificate) {
    return {
      isValid: false,
      matches: false,
      certificate: null,
      blockNumber: null,
      blockTimestamp: null,
      message: result.error || 'Could not verify certificate'
    };
  }
  
  // Compare the hashes
  const matches = result.certificate.pdfHash.toLowerCase() === pdfHashToVerify.toLowerCase();
  
  return {
    isValid: true,
    matches,
    certificate: result.certificate,
    blockNumber: result.blockNumber,
    blockTimestamp: result.blockTimestamp,
    message: matches 
      ? 'Certificate verified! The PDF hash matches the blockchain record.'
      : 'Certificate found but PDF hash does not match. The document may have been tampered with.'
  };
};

export default {
  initializeSepoliaBlockchain,
  isSepoliaInitialized,
  getSepoliaStats,
  isAuthorizedWallet,
  addAuthorizedWallet,
  removeAuthorizedWallet,
  getAdminWalletAddress,
  storePDFHashOnBlockchain,
  verifyTransactionOnBlockchain,
  isValidWalletAddress,
  extractCertificateFromTransaction,
  verifyPDFHashOnBlockchain
};
