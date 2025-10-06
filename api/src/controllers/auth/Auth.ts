import bcryptjs from 'bcryptjs';
import CustomError from '../../utils/CustomError';
import { UserRepo } from '../../typeorm/data-source';
import type { NextFunction, Request, Response } from 'express';
import { createToken, verifyToken } from '../../utils/JWT';
import { UserValidation } from '../../typeorm/entities/user.entity';
import nodemailer_transporter from '../../utils/nodemailer';

export const userSignIn = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    // Find the user by email
    const user = await UserRepo.findOne({
      where: { email },
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

    const token = createToken({
      sub: user._id,
      isAdmin: user.role === 0 ? true : false,
      iat: Date.now()
    });

    return res.status(200).json({
      success: true,
      message: 'User signed in successfully',
      token,
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

export const userSignUp = async (req: Request, res: Response, next: NextFunction) => {
  const newUser = UserValidation.safeParse(req.body);
  if (!newUser || !newUser.success) {
    return next(new CustomError(400, "Parsing failed, incomplete information"));
  }

  if (await UserRepo.findOneBy({ email: newUser.data?.email }) != null) {
    return next(new CustomError(400, "Email already exists", { email: newUser.data.email }));
  }

  const hashPassword = bcryptjs.hashSync(newUser.data.password, bcryptjs.genSaltSync(10));
  newUser.data.password = hashPassword;
  UserRepo.save(newUser.data);
  return res.status(200).json({ message: "User successfully registered", user: newUser.data });
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  // Log logout
  return res.status(500).json({ success: false, message: 'Logout not implemented' });
}

export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  // Refresh token
  return res.status(500).json({ success: false, message: 'Refresh token not implemented' });
}

export const me = async (req: Request, res: Response, next: NextFunction) => {
  const decoded = verifyToken(req.headers.authorization as string);
  if (!decoded) {
    return next(new CustomError(400, "Token is invalid", { token: req.headers.authorization }));
  }
  const User = await UserRepo.findOne({
    where: { _id: decoded.data?.sub },
    select: ['_id', 'firstName', 'middleName', 'lastName', 'email', 'phoneNumber']
  });
  return res.send(User);
}

export const generateForgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  const { email } = req.body;
  if (!email) {
    return next(new CustomError(400, "No email field", { data: req.body }))
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return next(new CustomError(400, "Invalid email", { data: req.body }))
  }

  const hashKey = bcryptjs.hashSync(email, bcryptjs.genSaltSync(10));
  nodemailer_transporter.sendMail({
    from: 'RCV Systems <genreycristobal03@gmail.com>',
    to: "genreycristobal03@gmail.com",
    subject: "Hello ✔",
    text: "Hello world?", // plain‑text body
    html: `<a href=${process.env.BACKEND_URL}/api/v1/auth/forgotPassword/${hashKey}>Link to reset your password</a>`,
  });
  return res.status(200).json({ message: "Forgot password key sent",  email: email, hashKey: hashKey });
}

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.params;
  return res.redirect(`${process.env.FRONTEND_URL}/resetPassword?token=${token}`);
}

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  const { newPassword } = req.body;

  
}

