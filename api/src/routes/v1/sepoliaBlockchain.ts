import { Router } from 'express';
import {
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
} from '../../controllers/blockchain/SepoliaBlockchain';
import { verifyUser } from '../../middleware/verifyUser';
import { verifyAdmin } from '../../middleware/verifyAdmin';

const router = Router();

// ============ PUBLIC ROUTES (No Auth Required) ============
// These work even if our database is completely wiped!

// Get certificate data directly from blockchain by transaction hash
router.get('/public/certificate/:txHash', getPublicCertificateFromBlockchain);

// Verify a PDF hash against blockchain record
router.post('/public/verify', publicVerifyPDFHash);

// Recover multiple certificates from blockchain (disaster recovery)
router.post('/public/recover', recoverCertificatesFromBlockchain);

// ============ REGULAR ROUTES ============

// Get Sepolia blockchain status
router.get('/status', getSepoliaStatus);

// Get blockchain statistics (products/companies with sepoliaTransactionId)
router.get('/blockchain-stats', getBlockchainStats);

// Get all blockchain-verified certificates
router.get('/certificates', getBlockchainCertificates);

// Get a specific blockchain certificate by type and ID
router.get('/certificates/:type/:id', getBlockchainCertificateById);

// Store PDF hash on Sepolia blockchain
router.post('/store-hash', storeHashOnSepolia);

// Verify a transaction on Sepolia
router.get('/verify/:txHash', verifySepoliaTransaction);

// Check if a wallet is authorized
router.get('/check-wallet/:address', checkWalletAuthorization);

// Verify MetaMask wallet for a user
router.post('/verify-wallet', verifyUserWallet);

// Get admin wallet address
router.get('/admin-wallet', getAdminWallet);

// ============ ADMIN ONLY ROUTES ============
// These routes require authentication and admin role

// Update user's wallet address (Admin only)
router.put('/user-wallet/:userId', verifyUser, verifyAdmin, updateUserWallet);

// Authorize a user's wallet for blockchain operations (Admin only)
router.post('/authorize-wallet', verifyUser, verifyAdmin, authorizeWallet);

// Revoke a user's wallet authorization (Admin only)
router.post('/revoke-wallet', verifyUser, verifyAdmin, revokeWallet);

export default router;
