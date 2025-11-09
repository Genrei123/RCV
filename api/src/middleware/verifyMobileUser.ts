import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRepo } from '../typeorm/data-source';
import CustomError from '../utils/CustomError';
import { verifyToken } from '../utils/JWT';

/**
 * Middleware to verify mobile user authentication using JWT from Authorization header only.
 * 
 * This middleware is specifically for mobile apps that use Bearer tokens,
 * and does NOT attempt to read or decrypt cookies.
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 */

export const verifyMobileUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from Authorization header only (no cookie fallback)
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new CustomError(
        401,
        'No token provided in Authorization header',
        { success: false }
      );
    }

    const token = authHeader.split(' ')[1];

    // Verify the token
    const decoded = verifyToken(token);
    if (!decoded || !decoded.success || !decoded.data) {
      throw new CustomError(401, 'Invalid token', { success: false });
    }

    const userId = decoded.data.sub;
    const user = await UserRepo.findOne({ where: { _id: userId } });
    if (!user) throw new CustomError(404, 'User not found', { success: false });

    // Add the user to the request object
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(
        new CustomError(
          401,
          'Sorry, token has expired. Sign in again to get a new token.',
          { success: false }
        )
      );
    }
    if (error instanceof jwt.JsonWebTokenError)
      return next(
        new CustomError(
          401,
          'Unauthorized Access. You have provided an invalid token',
          { success: false }
        )
      );
    return next(error);
  }
};
