import { Request, Response, NextFunction } from "express";
import { UserRepo } from "../typeorm/data-source";
import CustomError from "../utils/CustomError";

/**
 * Middleware to verify if the authenticated user is an admin
 * This should be used after verifyUser middleware
 */
export const verifyAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new CustomError(401, 'User not authenticated', { success: false });
    }

    const user = await UserRepo.findOne({ where: { _id: req.user._id } });
    
    if (!user) {
      throw new CustomError(404, 'User not found', { success: false });
    }

    if (user.role !== 'ADMIN') {
      throw new CustomError(403, 'Access denied. Admin privileges required.', { success: false });
    }

    next();
  } catch (error) {
    if (error instanceof CustomError) return next(error);
    return next(
      new CustomError(500, 'Internal server error', { success: false })
    );
  }
};

/**
 * Middleware to verify if the authenticated user is a super admin
 * Super admin is identified by role='ADMIN' and isSuperAdmin=true
 * This should be used after verifyUser middleware
 */
export const verifySuperAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new CustomError(401, 'User not authenticated', { success: false });
    }

    const user = await UserRepo.findOne({ where: { _id: req.user._id } });
    
    if (!user) {
      throw new CustomError(404, 'User not found', { success: false });
    }

    if (user.role !== 'ADMIN' || !user.isSuperAdmin) {
      throw new CustomError(403, 'Access denied. Super Admin privileges required.', { success: false });
    }

    next();
  } catch (error) {
    if (error instanceof CustomError) return next(error);
    return next(
      new CustomError(500, 'Internal server error', { success: false })
    );
  }
};
