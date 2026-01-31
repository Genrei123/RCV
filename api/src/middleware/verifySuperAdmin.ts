import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to verify that the authenticated user is a super admin
 * Must be used after verifyUser middleware
 */
export const verifySuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Check if user is a super admin
    if (!user.isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Super admin access required'
      });
    }

    next();
  } catch (error) {
    console.error('Super admin verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error verifying super admin access'
    });
  }
};
