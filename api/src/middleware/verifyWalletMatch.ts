import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to verify that the wallet address in the request matches
 * the authenticated user's stored wallet address.
 * 
 * This prevents users from using a different MetaMask account than the one
 * associated with their RCV account, which could indicate suspicious activity.
 * 
 * Must be used AFTER verifyUser middleware.
 * 
 * Checks for wallet address in:
 * - req.body.walletAddress
 * - req.body.submitterWallet
 * - req.headers['x-wallet-address']
 */
export const verifyWalletMatch = (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }

    // Get wallet address from various possible sources in the request
    const requestWallet = (
      req.body?.walletAddress ||
      req.body?.submitterWallet ||
      req.headers['x-wallet-address']
    )?.toLowerCase();

    // If no wallet address is provided in the request, skip this check
    // (some endpoints might not require wallet verification)
    if (!requestWallet) {
      return next();
    }

    // Get user's stored wallet address
    const userWallet = user.walletAddress?.toLowerCase();

    // If user has no wallet stored, they shouldn't be making wallet-related requests
    if (!userWallet) {
      return res.status(403).json({
        success: false,
        message: 'No wallet address associated with your account. Please connect your wallet first.',
        code: 'NO_WALLET_LINKED',
      });
    }

    // Check if wallets match
    if (requestWallet !== userWallet) {
      console.warn(
        `[SECURITY] Wallet mismatch detected for user ${user._id}:`,
        `Expected: ${userWallet}`,
        `Received: ${requestWallet}`
      );

      // Clear auth cookies to force logout
      res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
      });

      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
      });

      return res.status(403).json({
        success: false,
        message: 'Wallet address mismatch detected. You have been logged out for security reasons. Please login again with the correct wallet.',
        code: 'WALLET_MISMATCH',
        logout: true, // Signal to frontend to clear local state
      });
    }

    // Wallets match, proceed
    next();
  } catch (error) {
    console.error('Error in verifyWalletMatch middleware:', error);
    return res.status(500).json({
      success: false,
      message: 'Error verifying wallet address',
    });
  }
};

/**
 * Strict version - requires wallet address in request
 * Use this for endpoints that MUST have a wallet address
 */
export const requireWalletMatch = (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }

    // Get wallet address from various possible sources in the request
    const requestWallet = (
      req.body?.walletAddress ||
      req.body?.submitterWallet ||
      req.headers['x-wallet-address']
    )?.toLowerCase();

    // Strict mode: wallet address is required
    if (!requestWallet) {
      return res.status(400).json({
        success: false,
        message: 'Wallet address is required for this operation',
        code: 'WALLET_REQUIRED',
      });
    }

    // Get user's stored wallet address
    const userWallet = user.walletAddress?.toLowerCase();

    if (!userWallet) {
      return res.status(403).json({
        success: false,
        message: 'No wallet address associated with your account. Please connect your wallet first.',
        code: 'NO_WALLET_LINKED',
      });
    }

    // Check if wallets match
    if (requestWallet !== userWallet) {
      console.warn(
        `[SECURITY] Wallet mismatch detected for user ${user._id}:`,
        `Expected: ${userWallet}`,
        `Received: ${requestWallet}`
      );

      // Clear auth cookies to force logout
      res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
      });

      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
      });

      return res.status(403).json({
        success: false,
        message: 'Wallet address mismatch detected. You have been logged out for security reasons. Please login again with the correct wallet.',
        code: 'WALLET_MISMATCH',
        logout: true,
      });
    }

    next();
  } catch (error) {
    console.error('Error in requireWalletMatch middleware:', error);
    return res.status(500).json({
      success: false,
      message: 'Error verifying wallet address',
    });
  }
};
