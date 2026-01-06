import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to verify that the authenticated user has admin privileges
 * Must be used after verifyUser middleware
 */
export const verifyAdmin = (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Check if user has admin role or is a super admin
    if (user.role !== 'ADMIN' && !user.isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    next();
  } catch (error) {
    console.error('Admin verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error verifying admin access'
    });
  }
};
