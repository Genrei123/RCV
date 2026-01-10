import { ethers, JsonRpcProvider, Wallet } from 'ethers';
import { UserRepo } from '../typeorm/data-source';
import { Not, IsNull } from 'typeorm';

/**
 * Sepolia Blockchain Service
 * Handles storing PDF hashes on the Ethereum Sepolia testnet
 * 
 * Authorization is now database-driven:
 * - Users with walletAddress set and walletAuthorized=true can perform blockchain operations
 * - Only ADMIN users can authorize other users' wallets
 * - The admin wallet is determined by the first ADMIN user with an authorized wallet
 */

// Environment variables (should be set in .env)
const INFURA_API_KEY = process.env.INFURA_API_KEY || '';
const WALLET_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY || '';

// Provider and wallet instances
let provider: JsonRpcProvider | null = null;
let wallet: Wallet | null = null;

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
 * Get all authorized wallet addresses from the database
 */
export const getAuthorizedWalletsFromDB = async (): Promise<string[]> => {
  try {
    const authorizedUsers = await UserRepo.find({
      where: {
        walletAddress: Not(IsNull()),
        walletAuthorized: true
      },
      select: ['walletAddress']
    });
    return authorizedUsers
      .map(u => u.walletAddress)
      .filter((addr): addr is string => addr !== undefined && addr !== null);
  } catch (error) {
    console.error('Error fetching authorized wallets from DB:', error);
    return [];
  }
};

/**
 * Get blockchain connection stats
 */
export const getSepoliaStats = async (): Promise<SepoliaStats> => {
  // Get authorized wallets from database
  const authorizedWallets = await getAuthorizedWalletsFromDB();
  
  if (!provider || !wallet) {
    return {
      isConnected: false,
      networkName: 'Not connected',
      chainId: null,
      walletAddress: '',
      balance: '0',
      authorizedWallets
    };
  }
  
  // Return cached stats if still valid (but always refresh authorized wallets)
  const now = Date.now();
  if (cachedStats && (now - lastStatsFetch) < STATS_CACHE_DURATION) {
    return { ...cachedStats, authorizedWallets };
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
      authorizedWallets
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
      authorizedWallets
    };
  }
};

/**
 * Check if a wallet address is authorized (database-driven)
 */
export const isAuthorizedWallet = async (walletAddress: string): Promise<boolean> => {
  try {
    const user = await UserRepo.findOne({
      where: {
        walletAddress: walletAddress.toLowerCase(),
        walletAuthorized: true
      }
    });
    return user !== null;
  } catch (error) {
    console.error('Error checking wallet authorization:', error);
    return false;
  }
};

/**
 * Authorize a user's wallet address (Admin only operation - call from controller with admin check)
 * @param userId The user ID whose wallet to authorize
 * @param walletAddress The wallet address to set and authorize
 * @returns Object with success status and message
 */
export const authorizeUserWallet = async (
  userId: string,
  walletAddress: string
): Promise<{ success: boolean; message: string; user?: any }> => {
  try {
    if (!ethers.isAddress(walletAddress)) {
      return { success: false, message: 'Invalid Ethereum wallet address' };
    }

    const normalizedAddress = walletAddress.toLowerCase();

    // Check if wallet is already used by another user
    const existingUser = await UserRepo.findOne({
      where: { walletAddress: normalizedAddress }
    });

    if (existingUser && existingUser._id !== userId) {
      return { 
        success: false, 
        message: 'This wallet address is already associated with another user' 
      };
    }

    // Get the user to authorize
    const user = await UserRepo.findOne({ where: { _id: userId } });
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    // Update wallet address and authorize
    user.walletAddress = normalizedAddress;
    user.walletAuthorized = true;
    await UserRepo.save(user);

    return { 
      success: true, 
      message: 'Wallet authorized successfully',
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        walletAddress: user.walletAddress,
        walletAuthorized: user.walletAuthorized,
        role: user.role
      }
    };
  } catch (error) {
    console.error('Error authorizing wallet:', error);
    return { success: false, message: 'Failed to authorize wallet' };
  }
};

/**
 * Revoke wallet authorization for a user (Admin only operation)
 * @param userId The user ID whose wallet authorization to revoke
 */
export const revokeWalletAuthorization = async (
  userId: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const user = await UserRepo.findOne({ where: { _id: userId } });
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    user.walletAuthorized = false;
    await UserRepo.save(user);

    return { success: true, message: 'Wallet authorization revoked successfully' };
  } catch (error) {
    console.error('Error revoking wallet authorization:', error);
    return { success: false, message: 'Failed to revoke wallet authorization' };
  }
};

/**
 * Link wallet address to a user (user can link their own wallet, but only Admin can authorize)
 * @param userId The user ID to link the wallet to
 * @param walletAddress The wallet address to link
 * @returns Object with success status and user data
 */
export const linkUserWallet = async (
  userId: string,
  walletAddress: string
): Promise<{ success: boolean; message: string; user?: any }> => {
  try {
    if (!ethers.isAddress(walletAddress)) {
      return { success: false, message: 'Invalid Ethereum wallet address' };
    }

    const normalizedAddress = walletAddress.toLowerCase();

    // Check if wallet is already used by another user
    const existingUser = await UserRepo.findOne({
      where: { walletAddress: normalizedAddress }
    });

    if (existingUser && existingUser._id !== userId) {
      return { 
        success: false, 
        message: 'This wallet address is already associated with another user' 
      };
    }

    // Get the user
    const user = await UserRepo.findOne({ where: { _id: userId } });
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    // Link wallet but DON'T authorize (only Admin can authorize)
    // If user already had a different wallet, they lose authorization
    if (user.walletAddress !== normalizedAddress) {
      user.walletAuthorized = false; // Reset authorization when wallet changes
    }
    user.walletAddress = normalizedAddress;
    await UserRepo.save(user);

    return { 
      success: true, 
      message: 'Wallet linked successfully. Please contact an administrator to authorize your wallet for blockchain operations.',
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        walletAddress: user.walletAddress,
        walletAuthorized: user.walletAuthorized,
        role: user.role
      }
    };
  } catch (error) {
    console.error('Error linking wallet:', error);
    return { success: false, message: 'Failed to link wallet' };
  }
};

/**
 * Check if a wallet address is already in use
 */
export const isWalletAddressInUse = async (
  walletAddress: string,
  excludeUserId?: string
): Promise<boolean> => {
  try {
    const normalizedAddress = walletAddress.toLowerCase();
    const query: any = { walletAddress: normalizedAddress };
    
    const existingUser = await UserRepo.findOne({ where: query });
    
    if (!existingUser) return false;
    if (excludeUserId && existingUser._id === excludeUserId) return false;
    
    return true;
  } catch (error) {
    console.error('Error checking wallet address:', error);
    return false;
  }
};

/**
 * Get the admin wallet address (from the first ADMIN user with an authorized wallet)
 */
export const getAdminWalletAddress = async (): Promise<string | null> => {
  try {
    const adminUser = await UserRepo.findOne({
      where: {
        role: 'ADMIN',
        walletAddress: Not(IsNull()),
        walletAuthorized: true
      },
      order: { createdAt: 'ASC' }
    });
    return adminUser?.walletAddress || null;
  } catch (error) {
    console.error('Error getting admin wallet address:', error);
    return null;
  }
};

/**
 * Check if a user is an admin with authorized wallet
 */
export const isAdminWallet = async (walletAddress: string): Promise<boolean> => {
  try {
    const user = await UserRepo.findOne({
      where: {
        walletAddress: walletAddress.toLowerCase(),
        walletAuthorized: true,
        role: 'ADMIN'
      }
    });
    return user !== null;
  } catch (error) {
    console.error('Error checking admin wallet:', error);
    return false;
  }
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
  getAuthorizedWalletsFromDB,
  isAuthorizedWallet,
  authorizeUserWallet,
  revokeWalletAuthorization,
  linkUserWallet,
  isWalletAddressInUse,
  getAdminWalletAddress,
  isAdminWallet,
  storePDFHashOnBlockchain,
  verifyTransactionOnBlockchain,
  isValidWalletAddress,
  extractCertificateFromTransaction,
  verifyPDFHashOnBlockchain
};
