import { Request, Response, NextFunction } from "express";
import jwt, { Jwt } from "jsonwebtoken";
import { UserRepo } from "../typeorm/data-source";
import CustomError from "../utils/CustomError";
import { verifyToken, decryptToken } from "../utils/JWT";
import * as dotenv from "dotenv";
dotenv.config();

/**
 * Middleware to verify user authentication using JWT.
 *
 * This middleware performs the following steps:
 * 1. Extracts the JWT from the Authorization header
 * 2. Verifies the JWT using the secret key
 * 3. Finds the user in the database based on the userId in the JWT payload
 * 4. Attaches the user object to the request for use in subsequent middleware or route handlers
 *
 * @throws {CustomError} 401 - If no token is provided or the token is invalid
 * @throws {CustomError} 401 - If the token has expired
 * @throws {CustomError} 404 - If the user associated with the token is not found
 * @throws {CustomError} 500 - For any other unexpected errors
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 */

export const verifyUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Try to get token from Authorization header first, then from cookie
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (req.cookies && req.cookies.token) {
      // Fallback to cookie if no Authorization header
      // Token in cookie is encrypted, so we need to decrypt it
      try {
        const encryptedToken = req.cookies.token;
        token = decryptToken(encryptedToken);
      } catch (decryptError) {
        console.error("Error decrypting token from cookie:", decryptError);
        throw new CustomError(401, "Failed to decrypt authentication token", {
          success: false,
        });
      }
    }

    if (!token) {
      throw new CustomError(
        401,
        'No token provided in Authorization header or cookies',
        { success: false }
      );
    }

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

    if (error instanceof CustomError) return next(error);

    return next(
      new CustomError(500, 'Internal server error', { success: false })
    );
  }
};

export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  try {
    const decoded = verifyToken(token) as jwt.JwtPayload;
    if (decoded.role !== true) { // Assuming role 'true' indicates admin
      return res.status(403).json({ success: false, message: 'Access denied. Admins only.' });
    }
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
  
}

const extractRole = (role: number) => {
  switch (role) {
    case 0:
      return 'ADMIN';
    case 1:
      return 'AGENT';
  }
}

