import bcryptjs from 'bcryptjs';
import CustomError from '../../utils/CustomError';
import { UserRepo } from '../../typeorm/data-source';
import validateSignInForm from '../../utils/validateSignIn';
import validateSignUpForm from '../../utils/validateSignUp';
import type { NextFunction, Request, Response } from 'express';
import { createToken, verifyToken } from '../../utils/JWT';
import { UserValidation } from '../../typeorm/entities/user.entity';

export const Login = async (req: Request, res: Response, next: NextFunction) => {
  const data = validateSignInForm(req);
  // If an error occurs in validation
  if (data.error || !data.form) {
    const error = new CustomError(400, data.error, {
      success: false,
      token: null,
      user: null,
    });
    return next(error);
  }

  try {
    const { email, password } = data.form;

    // Find the user by email
    const user = await UserRepo.findOne({
      where: { email },
      select: ['_id', 'email', 'firstName', 'lastName', 'password', 'role'],
    });

    if (!user) {
      const error = new CustomError(401, 'Invalid email or password', {
        success: false,
        token: null,
        user: null,
      });
      return next(error);
    }

    // Verify the password
    const isPasswordValid = bcryptjs.compareSync(password, user.password);
    if (!isPasswordValid) {
      const error = new CustomError(401, 'Invalid email or password', {
        success: false,
        token: null,
        user: null,
      });
      return next(error);
    }

    const userPayload = {
      id: user._id,
      role: user.role === 0 ? true : false,
      iat: Date.now()
    }

    const token = createToken(userPayload);
    
    return res.status(200).json({
      success: true,
      message: 'User signed in successfully',
      token,
      user: { 
        fullName: `${user.firstName} ${user.lastName}`, 
        email: user.email, 
        isAdmin: user.role === 0 ? true : false 
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
      token: null,
      user: null,
    });
  }
};

export const Register = async (req: Request, res: Response, next: NextFunction) => {
  const data = validateSignUpForm(req);

  // If An error occurs in validation
  if (data.error || !data.form) {
    const error = new CustomError(400, data.error, { success: false });
    return next(error);
  }

  // Validate user with zod
  if(UserValidation.safeParse(data.form)) {
    console.log("User data is valid");
  } else {
    const error = new CustomError(400, "Invalid user data", { success: false });
    return next(error);
  }

  try {
    const { form } = data;
    form.password = bcryptjs.hashSync(form.password, bcryptjs.genSaltSync(10));
    form.dateOfBirth = new Date(form.dateOfBirth);

    const existingUser = await UserRepo.findOne({
      where: { email: form.email },
    });

    if (existingUser) {
      const error = new CustomError(400, 'User already exists.', {
        success: false,
      });
      return next(error);
    }

    


    // Create new user
    const newUser = UserRepo.create({
      ...form,
      isActive: true // Set user as active by default
    });
    const user = await UserRepo.save(newUser);

    return res
      .status(201)
      .json({ success: true, message: 'User Account created successfully.' });
  } catch (error: any) {
    return res.status(403).json({ success: false, message: error.message });
  }
};

export const Logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Extract token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            const error = new CustomError(401, 'No token provided', {
                success: false,
            });
            return next(error);
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Verify the token to ensure it's valid before logout
        try {
            const decodedToken = verifyToken(token);
            console.log('User logged out:', decodedToken);
        } catch (jwtError) {
            // Even if token is invalid/expired, we can still consider it a successful logout
            console.log('Logout with invalid/expired token');
        }

        // In a production environment, you might want to:
        // 1. Add the token to a blacklist/revocation list
        // 2. Store logout event in audit trail
        // 3. Clear any server-side sessions

        return res.status(200).json({
            success: true,
            message: 'User logged out successfully',
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}

export const RefreshToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Extract token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            const error = new CustomError(401, 'No token provided', {
                success: false,
                token: null,
                user: null,
            });
            return next(error);
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Verify the token (even if expired, we can still refresh it)
        let decodedToken: any;
        try {
            decodedToken = verifyToken(token);
        } catch (jwtError) {
            // For refresh token, we might want to be more lenient
            // But for now, let's require a valid token
            const error = new CustomError(401, 'Invalid or expired token', {
                success: false,
                token: null,
                user: null,
            });
            return next(error);
        }

        // Find the user by ID from token to ensure they still exist and are active
        const user = await UserRepo.findOne({
            where: { _id: decodedToken.id },
            select: ['_id', 'firstName', 'lastName', 'email', 'role', 'isActive'],
        });

        if (!user) {
            const error = new CustomError(404, 'User not found', {
                success: false,
                token: null,
                user: null,
            });
            return next(error);
        }

        // Allow token refresh regardless of current activation status

        // Generate new token with updated timestamp
        const userPayload = {
            id: user._id,
            role: user.role === 0 ? true : false,
            iat: Date.now()
        };

        const newToken = createToken(userPayload);

        return res.status(200).json({
            success: true,
            message: 'Token refreshed successfully',
            token: newToken,
            user: {
                fullName: `${user.firstName} ${user.lastName}`,
                email: user.email,
                isAdmin: user.role === 0 ? true : false,
            },
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message,
            token: null,
            user: null,
        });
    }
}

export const Profile = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Extract token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            const error = new CustomError(401, 'No token provided', {
                success: false,
                user: null,
            });
            return next(error);
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Verify the token
        let decodedToken: any;
        try {
            decodedToken = verifyToken(token);
        } catch (jwtError) {
            const error = new CustomError(401, 'Invalid or expired token', {
                success: false,
                user: null,
            });
            return next(error);
        }

        // Find the user by ID from token
        const user = await UserRepo.findOne({
            where: { _id: decodedToken.id },
            select: ['_id', 'firstName', 'lastName', 'middleName', 'email', 'dateOfBirth', 'phoneNumber', 'stationedAt', 'createdAt', 'updatedAt', 'isActive', 'role'],
        });

        if (!user) {
            const error = new CustomError(404, 'User not found', {
                success: false,
                user: null,
            });
            return next(error);
        }

        // Return user profile (excluding sensitive data like password)
        return res.status(200).json({
            success: true,
            message: 'Profile retrieved successfully',
            user: {
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                middleName: user.middleName,
                fullName: `${user.firstName} ${user.lastName}`,
                email: user.email,
                dateOfBirth: user.dateOfBirth,
                phoneNumber: user.phoneNumber,
                stationedAt: user.stationedAt,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
                isActive: user.isActive,
                role: user.role,
                isAdmin: user.role === 0 ? true : false,
            },
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message,
            user: null,
        });
    }
}

