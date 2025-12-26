import { Request, Response, NextFunction } from 'express';
import { UserRepo } from '../typeorm/data-source';

/**
 * Middleware to verify employee has web access
 * Use this for routes that should be accessible by Web Only employees
 */
export const verifyWebAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const user = await UserRepo.findOne({
      where: { _id: userId },
      select: ['_id', 'hasWebAccess', 'isSuperAdmin', 'role', 'companyOwnerId'],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Allow if super admin or regular admin
    if (user.isSuperAdmin || user.role === 'ADMIN') {
      return next();
    }

    // Check if user has web access
    if (!user.hasWebAccess) {
      return res.status(403).json({
        success: false,
        message: 'Web access required for this action',
      });
    }

    next();
  } catch (error) {
    console.error('Error verifying web access:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Middleware to verify employee has app access
 * Use this for routes that should be accessible by App Only employees
 */
export const verifyAppAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const user = await UserRepo.findOne({
      where: { _id: userId },
      select: ['_id', 'hasAppAccess', 'isSuperAdmin', 'role'],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Allow if super admin
    if (user.isSuperAdmin) {
      return next();
    }

    // Check if user has app access
    if (!user.hasAppAccess) {
      return res.status(403).json({
        success: false,
        message: 'App access required for this action',
      });
    }

    next();
  } catch (error) {
    console.error('Error verifying app access:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Middleware to verify employee has kiosk access
 * Use this for routes that should be accessible by Kiosk Only employees
 */
export const verifyKioskAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const user = await UserRepo.findOne({
      where: { _id: userId },
      select: ['_id', 'hasKioskAccess', 'isSuperAdmin', 'role'],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Allow if super admin
    if (user.isSuperAdmin) {
      return next();
    }

    // Check if user has kiosk access
    if (!user.hasKioskAccess) {
      return res.status(403).json({
        success: false,
        message: 'Kiosk access required for this action',
      });
    }

    next();
  } catch (error) {
    console.error('Error verifying kiosk access:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Middleware to prevent Web Only users from removing company owners
 */
export const preventOwnerRemoval = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?._id;
    const targetUserId = req.params.userId || req.params.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const currentUser = await UserRepo.findOne({
      where: { _id: userId },
      select: ['_id', 'isSuperAdmin', 'role', 'companyOwnerId', 'hasWebAccess'],
    });

    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Super admins and regular admins can do anything
    if (currentUser.isSuperAdmin || currentUser.role === 'ADMIN') {
      return next();
    }

    // If user has web access but is trying to modify someone
    if (currentUser.hasWebAccess && targetUserId) {
      const targetUser = await UserRepo.findOne({
        where: { _id: targetUserId },
        select: ['_id', 'companyOwnerId'],
      });

      // Check if target is a company owner (no companyOwnerId means they ARE an owner)
      if (targetUser && !targetUser.companyOwnerId) {
        return res.status(403).json({
          success: false,
          message: 'Web Only users cannot modify company owners',
        });
      }
    }

    next();
  } catch (error) {
    console.error('Error checking owner removal:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};
