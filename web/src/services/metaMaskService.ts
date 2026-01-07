import { apiClient } from './axiosConfig';

// MetaMask window ethereum interface
declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, handler: (...args: any[]) => void) => void;
      removeListener: (event: string, handler: (...args: any[]) => void) => void;
      selectedAddress: string | null;
    };
  }
}

export interface WalletConnection {
  address: string;
  chainId: string;
  isConnected: boolean;
}

export interface WalletVerificationResult {
  userId: string;
  walletAddress: string;
  isAuthorized: boolean;
  isAdmin: boolean;
  canPerformBlockchainOps: boolean;
  userRole: string;
}

export interface SepoliaStatus {
  isConnected: boolean;
  networkName: string;
  chainId: string | null;
  walletAddress: string;
  balance: string;
  authorizedWallets: string[];
}

export interface BlockchainTransaction {
  txHash: string;
  blockNumber: number;
  pdfHash: string;
  certificateId: string;
  timestamp: string;
  etherscanUrl: string;
}

// Session storage key for connected wallet
const WALLET_SESSION_KEY = 'rcv_connected_wallet';

export class MetaMaskService {
  /**
   * Check if MetaMask is installed
   */
  static isMetaMaskInstalled(): boolean {
    return typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask === true;
  }

  /**
   * Get the currently connected wallet from session
   */
  static getSessionWallet(): string | null {
    return sessionStorage.getItem(WALLET_SESSION_KEY);
  }

  /**
   * Set the connected wallet in session
   */
  static setSessionWallet(address: string): void {
    sessionStorage.setItem(WALLET_SESSION_KEY, address);
  }

  /**
   * Clear the wallet from session (on logout or disconnect)
   */
  static clearSessionWallet(): void {
    sessionStorage.removeItem(WALLET_SESSION_KEY);
  }

  /**
   * Connect to MetaMask and get wallet address
   * @param requestNewAccount - If true, forces MetaMask to show account selection
   */
  static async connectWallet(requestNewAccount: boolean = false): Promise<WalletConnection | null> {
    if (!this.isMetaMaskInstalled()) {
      throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
    }

    try {
      let accounts: string[];
      
      if (requestNewAccount) {
        // Force MetaMask to show account selection popup
        accounts = await window.ethereum!.request({
          method: 'wallet_requestPermissions',
          params: [{ eth_accounts: {} }]
        }).then(() => 
          window.ethereum!.request({ method: 'eth_accounts' })
        );
      } else {
        // Request account access normally
        accounts = await window.ethereum!.request({
          method: 'eth_requestAccounts'
        });
      }

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found. Please unlock MetaMask.');
      }

      // Get chain ID
      const chainId = await window.ethereum!.request({
        method: 'eth_chainId'
      });

      const address = accounts[0];
      
      // Store in session
      this.setSessionWallet(address);

      return {
        address,
        chainId,
        isConnected: true
      };
    } catch (error: any) {
      console.error('MetaMask connection error:', error);
      if (error.code === 4001) {
        throw new Error('Connection rejected. Please approve the connection in MetaMask.');
      }
      throw error;
    }
  }

  /**
   * Disconnect wallet (clear session)
   */
  static disconnectWallet(): void {
    this.clearSessionWallet();
  }

  /**
   * Check if currently connected to Sepolia testnet
   */
  static async isOnSepolia(): Promise<boolean> {
    if (!this.isMetaMaskInstalled()) return false;

    try {
      const chainId = await window.ethereum!.request({
        method: 'eth_chainId'
      });
      // Sepolia chain ID is 0xaa36a7 (11155111 in decimal)
      return chainId === '0xaa36a7';
    } catch {
      return false;
    }
  }

  /**
   * Switch to Sepolia network
   */
  static async switchToSepolia(): Promise<boolean> {
    if (!this.isMetaMaskInstalled()) return false;

    try {
      await window.ethereum!.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xaa36a7' }]
      });
      return true;
    } catch (error: any) {
      // Chain not added, add it
      if (error.code === 4902) {
        try {
          await window.ethereum!.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0xaa36a7',
              chainName: 'Sepolia Testnet',
              nativeCurrency: {
                name: 'SepoliaETH',
                symbol: 'ETH',
                decimals: 18
              },
              rpcUrls: ['https://sepolia.infura.io/v3/'],
              blockExplorerUrls: ['https://sepolia.etherscan.io']
            }]
          });
          return true;
        } catch {
          return false;
        }
      }
      return false;
    }
  }

  /**
   * Get current connected accounts
   */
  static async getConnectedAccounts(): Promise<string[]> {
    if (!this.isMetaMaskInstalled()) return [];

    try {
      const accounts = await window.ethereum!.request({
        method: 'eth_accounts'
      });
      return accounts || [];
    } catch {
      return [];
    }
  }

  /**
   * Listen for account changes
   */
  static onAccountsChanged(handler: (accounts: string[]) => void): void {
    if (this.isMetaMaskInstalled()) {
      window.ethereum!.on('accountsChanged', handler);
    }
  }

  /**
   * Listen for chain changes
   */
  static onChainChanged(handler: (chainId: string) => void): void {
    if (this.isMetaMaskInstalled()) {
      window.ethereum!.on('chainChanged', handler);
    }
  }

  /**
   * Remove account change listener
   */
  static removeAccountsListener(handler: (accounts: string[]) => void): void {
    if (this.isMetaMaskInstalled()) {
      window.ethereum!.removeListener('accountsChanged', handler);
    }
  }

  /**
   * Remove chain change listener
   */
  static removeChainListener(handler: (chainId: string) => void): void {
    if (this.isMetaMaskInstalled()) {
      window.ethereum!.removeListener('chainChanged', handler);
    }
  }

  /**
   * Sign a message with the connected wallet
   * Uses personal_sign for human-readable messages
   * @param message - The message to sign
   * @param walletAddress - The address to sign with (must be connected)
   * @returns The signature string
   */
  static async signMessage(message: string, walletAddress: string): Promise<string> {
    if (!this.isMetaMaskInstalled()) {
      throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
    }

    // Verify the wallet is connected
    const accounts = await this.getConnectedAccounts();
    if (!accounts.some(acc => acc.toLowerCase() === walletAddress.toLowerCase())) {
      throw new Error('Wallet not connected. Please connect your wallet first.');
    }

    try {
      // Use personal_sign for human-readable messages
      const signature = await window.ethereum!.request({
        method: 'personal_sign',
        params: [message, walletAddress]
      });

      return signature;
    } catch (error: any) {
      console.error('Signature error:', error);
      if (error.code === 4001) {
        throw new Error('Signature rejected. Please approve the signature request in MetaMask.');
      }
      throw new Error(`Failed to sign message: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Sign typed data (EIP-712) - more structured signing for complex data
   * @param domain - The signing domain
   * @param types - The type definitions
   * @param value - The data to sign
   * @param walletAddress - The address to sign with
   */
  static async signTypedData(
    domain: {
      name: string;
      version: string;
      chainId: number;
      verifyingContract?: string;
    },
    types: Record<string, Array<{ name: string; type: string }>>,
    value: Record<string, any>,
    walletAddress: string
  ): Promise<string> {
    if (!this.isMetaMaskInstalled()) {
      throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
    }

    const accounts = await this.getConnectedAccounts();
    if (!accounts.some(acc => acc.toLowerCase() === walletAddress.toLowerCase())) {
      throw new Error('Wallet not connected. Please connect your wallet first.');
    }

    try {
      const signature = await window.ethereum!.request({
        method: 'eth_signTypedData_v4',
        params: [walletAddress, JSON.stringify({ domain, types, primaryType: Object.keys(types)[0], message: value })]
      });

      return signature;
    } catch (error: any) {
      console.error('Typed data signature error:', error);
      if (error.code === 4001) {
        throw new Error('Signature rejected. Please approve the signature request in MetaMask.');
      }
      throw new Error(`Failed to sign typed data: ${error.message || 'Unknown error'}`);
    }
  }

  // ============ API Methods ============

  /**
   * Verify wallet with backend
   */
  static async verifyWalletWithBackend(userId: string, walletAddress: string): Promise<{
    success: boolean;
    data?: WalletVerificationResult;
    error?: string;
  }> {
    try {
      const response = await apiClient.post('/sepolia/verify-wallet', {
        userId,
        walletAddress
      });
      return {
        success: true,
        data: response.data.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Wallet verification failed'
      };
    }
  }

  /**
   * Get Sepolia blockchain status
   */
  static async getSepoliaStatus(): Promise<{
    success: boolean;
    data?: SepoliaStatus;
    error?: string;
  }> {
    try {
      const response = await apiClient.get('/sepolia/status');
      return {
        success: true,
        data: response.data.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to get status'
      };
    }
  }

  /**
   * Check if a wallet is authorized
   */
  static async checkWalletAuthorization(address: string): Promise<{
    success: boolean;
    isAuthorized: boolean;
    isAdmin: boolean;
    error?: string;
  }> {
    try {
      const response = await apiClient.get(`/sepolia/check-wallet/${address}`);
      return {
        success: true,
        isAuthorized: response.data.data.isAuthorized,
        isAdmin: response.data.data.isAdmin
      };
    } catch (error: any) {
      return {
        success: false,
        isAuthorized: false,
        isAdmin: false,
        error: error.response?.data?.message || 'Failed to check wallet'
      };
    }
  }

  /**
   * Get admin wallet address
   */
  static async getAdminWalletAddress(): Promise<string | null> {
    try {
      const response = await apiClient.get('/sepolia/admin-wallet');
      return response.data.data.adminWalletAddress;
    } catch {
      return null;
    }
  }

  /**
   * Store PDF hash on Sepolia blockchain
   */
  static async storeHashOnBlockchain(
    pdfHash: string,
    certificateId: string,
    entityType: 'product' | 'company',
    entityName: string,
    walletAddress?: string
  ): Promise<{
    success: boolean;
    data?: BlockchainTransaction;
    error?: string;
  }> {
    try {
      const response = await apiClient.post('/sepolia/store-hash', {
        pdfHash,
        certificateId,
        entityType,
        entityName,
        walletAddress
      });
      return {
        success: true,
        data: response.data.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to store hash'
      };
    }
  }

  /**
   * Verify transaction on Sepolia
   */
  static async verifyTransaction(txHash: string): Promise<{
    success: boolean;
    data?: {
      isValid: boolean;
      data: any;
      blockNumber: number;
      timestamp: string;
    };
    error?: string;
  }> {
    try {
      const response = await apiClient.get(`/sepolia/verify/${txHash}`);
      return {
        success: response.data.success,
        data: response.data.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Verification failed'
      };
    }
  }

  /**
   * Update user wallet address (admin only)
   */
  static async updateUserWallet(
    userId: string,
    walletAddress: string,
    authorize: boolean = false
  ): Promise<{
    success: boolean;
    data?: {
      userId: string;
      walletAddress: string;
      walletAuthorized: boolean;
      isAuthorized: boolean;
    };
    error?: string;
  }> {
    try {
      const response = await apiClient.put(`/sepolia/user-wallet/${userId}`, {
        walletAddress,
        authorize
      });
      return { 
        success: true,
        data: response.data?.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update wallet'
      };
    }
  }

  /**
   * Get blockchain certificates (products/companies with sepoliaTransactionId)
   */
  static async getBlockchainCertificates(
    page: number = 1,
    limit: number = 20
  ): Promise<{
    success: boolean;
    certificates: BlockchainCertificate[];
    pagination?: {
      current_page: number;
      total_pages: number;
      total_items: number;
      items_per_page: number;
      has_next: boolean;
      has_previous: boolean;
    };
    stats?: {
      totalCertificates: number;
      productCertificates: number;
      companyCertificates: number;
    };
    error?: string;
  }> {
    try {
      const response = await apiClient.get(`/sepolia/certificates`, {
        params: { page, limit }
      });
      return {
        success: true,
        certificates: response.data.certificates,
        pagination: response.data.pagination,
        stats: response.data.stats
      };
    } catch (error: any) {
      return {
        success: false,
        certificates: [],
        error: error.response?.data?.message || 'Failed to fetch certificates'
      };
    }
  }

  /**
   * Get a specific blockchain certificate
   */
  static async getBlockchainCertificateById(
    type: 'product' | 'company',
    id: string
  ): Promise<{
    success: boolean;
    certificate?: BlockchainCertificateDetail;
    error?: string;
  }> {
    try {
      const response = await apiClient.get(`/sepolia/certificates/${type}/${id}`);
      return {
        success: true,
        certificate: response.data.certificate
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch certificate'
      };
    }
  }

  /**
   * Get blockchain statistics
   */
  static async getBlockchainStats(): Promise<{
    success: boolean;
    stats?: {
      totalCertificates: number;
      productCertificates: number;
      companyCertificates: number;
      chainIntegrity: boolean;
      latestCertificate?: {
        entityName: string;
        entityType: string;
        certificateId: string;
        sepoliaTransactionId: string;
      };
    };
    error?: string;
  }> {
    try {
      const response = await apiClient.get(`/sepolia/blockchain-stats`);
      return {
        success: true,
        stats: response.data.stats
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch stats'
      };
    }
  }

  /**
   * PUBLIC: Get certificate data directly from blockchain
   * Works even if database is completely wiped!
   */
  static async getPublicCertificateFromBlockchain(txHash: string): Promise<{
    success: boolean;
    certificate?: BlockchainRecoveredCertificate;
    message?: string;
    etherscanUrl?: string;
    error?: string;
  }> {
    try {
      const response = await apiClient.get(`/sepolia/public/certificate/${txHash}`);
      return {
        success: true,
        certificate: response.data.certificate,
        message: response.data.message
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch certificate from blockchain',
        etherscanUrl: `https://sepolia.etherscan.io/tx/${txHash}`
      };
    }
  }

  /**
   * PUBLIC: Verify a PDF hash against blockchain record
   * Works even if database is completely wiped!
   */
  static async publicVerifyPDFHash(txHash: string, pdfHash: string): Promise<{
    success: boolean;
    verified: boolean;
    message: string;
    certificate?: BlockchainRecoveredCertificate;
    blockNumber?: number;
    blockTimestamp?: string;
    etherscanUrl?: string;
    error?: string;
  }> {
    try {
      const response = await apiClient.post(`/sepolia/public/verify`, {
        txHash,
        pdfHash
      });
      return {
        success: response.data.success,
        verified: response.data.verified,
        message: response.data.message,
        certificate: response.data.certificate,
        blockNumber: response.data.blockNumber,
        blockTimestamp: response.data.blockTimestamp,
        etherscanUrl: response.data.etherscanUrl
      };
    } catch (error: any) {
      return {
        success: false,
        verified: false,
        message: error.response?.data?.message || 'Verification failed',
        error: error.response?.data?.message || 'Failed to verify'
      };
    }
  }

  /**
   * PUBLIC: Recover multiple certificates from blockchain
   * Disaster recovery feature
   */
  static async recoverCertificatesFromBlockchain(txHashes: string[]): Promise<{
    success: boolean;
    recovered: Array<{
      txHash: string;
      certificate: BlockchainRecoveredCertificate;
      blockNumber: number;
      blockTimestamp: string;
    }>;
    failed: Array<{
      txHash: string;
      error: string;
    }>;
    summary: {
      total: number;
      recovered: number;
      failed: number;
    };
    error?: string;
  }> {
    try {
      const response = await apiClient.post(`/sepolia/public/recover`, {
        txHashes
      });
      return {
        success: true,
        recovered: response.data.recovered,
        failed: response.data.failed,
        summary: response.data.summary
      };
    } catch (error: any) {
      return {
        success: false,
        recovered: [],
        failed: txHashes.map(h => ({ txHash: h, error: 'Request failed' })),
        summary: { total: txHashes.length, recovered: 0, failed: txHashes.length },
        error: error.response?.data?.message || 'Recovery failed'
      };
    }
  }
}

// Types for blockchain certificates
export interface BlockchainCertificate {
  id: string;
  certificateId: string;
  entityType: 'product' | 'company';
  entityName: string;
  sepoliaTransactionId: string;
  issuedDate: string;
  additionalInfo: {
    brandName?: string;
    cfprNumber?: string;
    companyName?: string;
    classification?: string;
    licenseNumber?: string;
    address?: string;
    businessType?: string;
  };
}

export interface BlockchainCertificateDetail {
  id: string;
  certificateId: string;
  entityType: 'product' | 'company';
  entityName: string;
  sepoliaTransactionId: string;
  issuedDate: string;
  etherscanUrl: string | null;
  details: Record<string, any>;
}

// Certificate data recovered directly from blockchain
export interface BlockchainRecoveredCertificate {
  type: string;
  version: string;
  certificateId: string;
  entityType: 'product' | 'company';
  entityName: string;
  pdfHash: string;
  timestamp: string;
  blockNumber?: number;
  blockTimestamp?: string;
  etherscanUrl?: string;
  verificationNote?: string;
}

export default MetaMaskService;
