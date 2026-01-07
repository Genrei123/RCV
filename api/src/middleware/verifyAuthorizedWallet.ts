import { Request, Response, NextFunction } from "express";
import { isAuthorizedWallet as checkWalletAuth } from "../services/sepoliaBlockchainService";

/**
 * Middleware to verify that the user has an authorized wallet for blockchain operations
 * Must be used after verifyUser middleware
 */
export const verifyAuthorizedWallet = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!user.walletAddress) {
      return res.status(403).json({
        success: false,
        message: 'No wallet address associated with this account'
      });
    }

    const isAuthorized = await checkWalletAuth(user.walletAddress);
    
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Wallet not authorized for blockchain operations. Please contact an administrator.'
      });
    }

    next();
  } catch (error) {
    console.error('Wallet authorization verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error verifying wallet authorization'
    });
  }
};