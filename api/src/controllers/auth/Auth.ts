import bcryptjs from 'bcryptjs';
import CustomError from '../../utils/CustomError';
import { UserRepo } from '../../typeorm/data-source';
import validateSignInForm from '../../utils/validateSignIn';
import validateSignUpForm from '../../utils/validateSignUp';
import type { NextFunction, Request, Response } from 'express';
import { createToken } from '../../utils/JWT';
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
      select: ['email', 'fullName', 'password'],
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
      user: { fullName: user.fullName, email: user.email, isAdmin: user.role === 0 ? true : false },
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
    const newUser = UserRepo.create(form);
    const user = await UserRepo.save(newUser);

    return res
      .status(201)
      .json({ success: true, message: 'User Account created successfully.' });
  } catch (error: any) {
    return res.status(403).json({ success: false, message: error.message });
  }
};

export const Logout = async (req: Request, res: Response, next: NextFunction) => {
    // Log logout
    return res.status(500).json({ success: false, message: 'Logout not implemented' });
}

export const RefreshToken = async (req: Request, res: Response, next: NextFunction) => {
    // Refresh token
    return res.status(500).json({ success: false, message: 'Refresh token not implemented' });
}

export const Profile = async (req: Request, res: Response, next: NextFunction) => {
    // Get user profile
    return res.status(500).json({ success: false, message: 'Profile not implemented' });
}

