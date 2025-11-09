import bcryptjs from 'bcryptjs';
import CustomError from '../../utils/CustomError';
import { ForgotPasswordRepo, UserRepo } from '../../typeorm/data-source';
import type { NextFunction, Request, Response } from 'express';
import { createForgotPasswordToken, createToken, createMobileToken, verifyToken } from '../../utils/JWT';
import { UserValidation } from '../../typeorm/entities/user.entity';
import nodemailer_transporter from '../../utils/nodemailer';
import { AuditLogService } from '../../services/auditLogService';
import CryptoJS from 'crypto-js';
import * as dotenv from 'dotenv';
dotenv.config();

export const userSignIn = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, rememberMe } = req.body;

    // Find the user by email
    const user = await UserRepo.findOne({
      where: { email },
      select: [
        "_id",
        "email",
        "password",
        "role",
        "approved",
        "firstName",
        "lastName",
      ],
    });

    if (!user) {
      const error = new CustomError(401, "Invalid email or password", {
        success: false,
        token: null,
        user: null,
      });
      return next(error);
    }

    // Verify the password
    const isPasswordValid = bcryptjs.compareSync(password, user.password);
    if (!isPasswordValid) {
      const error = new CustomError(401, "Invalid email or password", {
        success: false,
        token: null,
        user: null,
      });
      return next(error);
    }

    // Check if user is approved
    if (!user.approved) {
      return res.status(403).json({
        success: false,
        message:
          "Your account is pending approval. Please wait for an administrator to approve your account.",
        approved: false,
        email: user.email,
      });
    }

    const token = createToken({
      sub: user._id,
      isAdmin: user.role === "ADMIN" ? true : false,
      iat: Date.now(),
    });

    // Log the login action
    await AuditLogService.logLogin(user._id, req, "WEB");

    // Set cookie with proper options based on rememberMe
    const cookieMaxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000; // 30 days or 24 hours
    const encryptedCookie = CryptoJS.DES.encrypt(token, process.env.COOKIE_SECRET || 'key').toString();

    res.cookie('token', encryptedCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
      maxAge: cookieMaxAge,
      path: '/'
    });

    return res.status(200).json({
      success: true,
      message: "User signed in successfully",
      token,
      rememberMe: rememberMe || false,
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        approved: user.approved,
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

export const mobileSignIn = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, rememberMe } = req.body;

    // Find the user by email with all necessary fields
    const user = await UserRepo.findOne({
      where: { email },
      select: [
        "_id",
        "email",
        "password",
        "role",
        "approved",
        "firstName",
        "middleName",
        "lastName",
        "extName",
        "status",
        "badgeId",
        "location",
        "phoneNumber",
        "dateOfBirth",
        "avatarUrl",
      ],
    });

    if (!user) {
      const error = new CustomError(401, "Invalid email or password", {
        success: false,
        token: null,
        user: null,
      });
      return next(error);
    }

    // Verify the password
    const isPasswordValid = bcryptjs.compareSync(password, user.password);
    if (!isPasswordValid) {
      const error = new CustomError(401, "Invalid email or password", {
        success: false,
        token: null,
        user: null,
      });
      return next(error);
    }

    // Check if user is approved
    if (!user.approved) {
      return res.status(403).json({
        success: false,
        message:
          "Your account is pending approval. Please wait for an administrator to approve your account.",
        approved: false,
        email: user.email,
      });
    }

    // Create mobile token with full user data
    const fullName = `${user.firstName} ${user.middleName ? user.middleName + ' ' : ''}${user.lastName}${user.extName ? ' ' + user.extName : ''}`.trim();
    
    const mobileToken = createMobileToken({
      sub: user._id,
      email: user.email,
      firstName: user.firstName,
      middleName: user.middleName || null,
      lastName: user.lastName,
      extName: user.extName || null,
      fullName: fullName,
      role: user.role,
      status: user.status || "active",
      badgeId: user.badgeId || null,
      location: user.location || null,
      phoneNumber: user.phoneNumber || null,
      dateOfBirth: user.dateOfBirth || null,
      avatarUrl: user.avatarUrl || null,
      isAdmin: user.role === "ADMIN",
      iat: Date.now(),
    });

    // Log the login action
    await AuditLogService.logLogin(user._id, req, "MOBILE");

    // Set cookie with proper options based on rememberMe (same as web login)
    const cookieMaxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000; // 30 days or 24 hours
    const encryptedCookie = CryptoJS.DES.encrypt(mobileToken, process.env.COOKIE_SECRET || 'key').toString();

    res.cookie('token', encryptedCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: cookieMaxAge,
      path: '/'
    });

    return res.status(200).json({
      success: true,
      message: "Mobile sign in successful",
      token: mobileToken,
      rememberMe: rememberMe || false,
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        middleName: user.middleName,
        lastName: user.lastName,
        extName: user.extName,
        fullName: fullName,
        role: user.role,
        status: user.status,
        badgeId: user.badgeId,
        location: user.location,
        phoneNumber: user.phoneNumber,
        dateOfBirth: user.dateOfBirth,
        avatarUrl: user.avatarUrl,
        approved: user.approved,
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


export const mobileSignUp = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const newUser = UserValidation.safeParse(req.body);
  if (!newUser || !newUser.success) {
    console.error("Validation errors:", newUser.error?.issues);
    return next(
      new CustomError(400, "Parsing failed, incomplete information", {
        errors: newUser.error?.issues,
      })
    );
  }

  if ((await UserRepo.findOneBy({ email: newUser.data?.email })) != null) {
    return next(
      new CustomError(400, "Email already exists", {
        email: newUser.data.email,
      })
    );
  }

  const hashPassword = bcryptjs.hashSync(
    newUser.data.password,
    bcryptjs.genSaltSync(10)
  );
  newUser.data.password = hashPassword;

  // Set approved to false by default
  newUser.data.approved = false;

  await UserRepo.save(newUser.data);

  return res.status(200).json({
    success: true,
    message:
      "Registration successful! Your account is pending approval. You will be notified once an administrator approves your account.",
    user: {
      email: newUser.data.email,
      firstName: newUser.data.firstName,
      middleName: newUser.data.middleName,
      lastName: newUser.data.lastName,
      extName: newUser.data.extName,
      approved: false,
    },
    pendingApproval: true,
  });
};

export const userSignUp = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const newUser = UserValidation.safeParse(req.body);
  if (!newUser || !newUser.success) {
    console.error("Validation errors:", newUser.error?.issues);
    return next(
      new CustomError(400, "Parsing failed, incomplete information", {
        errors: newUser.error?.issues,
      })
    );
  }

  if ((await UserRepo.findOneBy({ email: newUser.data?.email })) != null) {
    return next(
      new CustomError(400, "Email already exists", {
        email: newUser.data.email,
      })
    );
  }

  const hashPassword = bcryptjs.hashSync(
    newUser.data.password,
    bcryptjs.genSaltSync(10)
  );
  newUser.data.password = hashPassword;

  // Set approved to false by default
  newUser.data.approved = false;

  await UserRepo.save(newUser.data);

  return res.status(200).json({
    success: true,
    message:
      "Registration successful! Your account is pending approval. You will be notified once an administrator approves your account.",
    user: {
      email: newUser.data.email,
      firstName: newUser.data.firstName,
      lastName: newUser.data.lastName,
      approved: false,
    },
    pendingApproval: true,
  });
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Clear the httpOnly cookie
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });

    return res.status(200).json({
      success: true,
      message: "Logged out successfully"
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Logout failed"
    });
  }
};

export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Refresh token
  return res
    .status(500)
    .json({ success: false, message: "Refresh token not implemented" });
};

export const me = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Try to get token from Authorization header first, then from cookie
    let token: string | undefined;
    
    if (req.headers.authorization) {
      token = req.headers.authorization;
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    
    if (!token) {
      return next(
        new CustomError(400, "No token provided", {
          token: null,
        })
      );
    }
    
    const decoded = verifyToken(token);
    if (!decoded || !decoded.success) {
      return next(
        new CustomError(400, "Token is invalid", {
          token: token,
        })
      );
    }
    
    const User = await UserRepo.findOne({
      where: { _id: decoded.data?.sub },
      select: [
        "_id",
        "firstName",
        "middleName",
        "lastName",
        "email",
        "phoneNumber",
        "location",
        "role",
        "badgeId",
        "avatarUrl",
      ],
    });
    
    return res.send(User);
  } catch (error) {
    return next(error);
  }
};

export const meMobile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // User is already verified by verifyMobileUser middleware
    // and attached to req.user
    if (!req.user) {
      return next(
        new CustomError(401, "User not authenticated", {
          success: false,
        })
      );
    }

    // Fetch fresh user data from database
    const user = await UserRepo.findOne({
      where: { _id: req.user._id },
      select: [
        "_id",
        "firstName",
        "middleName",
        "lastName",
        "email",
        "phoneNumber",
        "location",
        "role",
        "badgeId",
        "avatarUrl",
        "status",
        "dateOfBirth",
        "extName",
      ],
    });
    
    if (!user) {
      return next(new CustomError(404, "User not found"));
    }
    
    return res.status(200).json(user);
  } catch (error) {
    return next(error);
  }
};

export const requestPasswordReset = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.body;

    if (!email) {
      return next(new CustomError(400, "Email is required"));
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return next(new CustomError(400, "Invalid email format"));
    }

    const user = await UserRepo.findOneBy({ email: email });
    if (!user) {
      // Return success even if user not found (security best practice)
      return res.status(200).json({
        success: true,
        message:
          "If an account exists with this email, a reset code has been sent.",
      });
    }

    // Generate 6-digit code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash the code before storing
    const hashedCode = bcryptjs.hashSync(resetCode, bcryptjs.genSaltSync(10));

    // Delete any existing reset requests for this user
    await ForgotPasswordRepo.delete({ requestedBy: { _id: user._id } });

    // Save new reset request with expiration (15 minutes)
    const resetRequest = ForgotPasswordRepo.create({
      requestedBy: user,
      key: hashedCode,
    });
    await ForgotPasswordRepo.save(resetRequest);

    // Send email with 6-digit code
    try {
      await nodemailer_transporter.sendMail({
        from: "RCV Systems <genreycristobal03@gmail.com>",
        to: email,
        subject: "Password Reset Code - RCV System",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #005440;">Password Reset Request</h2>
            <p>You have requested to reset your password for your RCV System account.</p>
            <p>Your 6-digit verification code is:</p>
            <div style="background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #005440;">
              ${resetCode}
            </div>
            <p style="color: #666; margin-top: 20px;">
              This code will expire in 15 minutes.
            </p>
            <p style="color: #666;">
              If you didn't request this password reset, please ignore this email.
            </p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;" />
            <p style="color: #999; font-size: 12px;">
              This is an automated message from RCV System. Please do not reply to this email.
            </p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error("Error sending email:", emailError);
      return next(new CustomError(500, "Failed to send reset code email"));
    }

    return res.status(200).json({
      success: true,
      message:
        "If an account exists with this email, a reset code has been sent.",
    });
  } catch (error) {
    console.error("Password reset request error:", error);
    return next(
      new CustomError(500, "Failed to process password reset request")
    );
  }
};

export const verifyResetCode = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return next(new CustomError(400, "Email and code are required"));
    }

    if (code.length !== 6 || !/^\d+$/.test(code)) {
      return res.status(200).json({ valid: false });
    }

    const user = await UserRepo.findOneBy({ email: email });
    if (!user) {
      return res.status(200).json({ valid: false });
    }

    // Find the reset request
    const resetRequest = await ForgotPasswordRepo.findOne({
      where: { requestedBy: { _id: user._id } },
      relations: ["requestedBy"],
    });

    if (!resetRequest) {
      return res.status(200).json({ valid: false });
    }

    // Verify the code
    const isCodeValid = bcryptjs.compareSync(code, resetRequest.key);

    return res.status(200).json({ valid: isCodeValid });
  } catch (error: any) {
    console.error("Verify reset code error:", error);
    return next(new CustomError(500, "Failed to verify reset code"));
  }
};

export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return next(
        new CustomError(400, "Email, code, and new password are required")
      );
    }

    // Validate password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return next(
        new CustomError(
          400,
          "Password must be at least 8 characters with uppercase, lowercase, and number"
        )
      );
    }

    const user = await UserRepo.findOneBy({ email: email });
    if (!user) {
      return next(new CustomError(400, "Invalid reset request"));
    }

    // Find and verify the reset request
    const resetRequest = await ForgotPasswordRepo.findOne({
      where: { requestedBy: { _id: user._id } },
      relations: ["requestedBy"],
    });

    if (!resetRequest) {
      return next(new CustomError(400, "Invalid or expired reset code"));
    }

    // Verify the code
    const isCodeValid = bcryptjs.compareSync(code, resetRequest.key);
    if (!isCodeValid) {
      return next(new CustomError(400, "Invalid reset code"));
    }

    // Hash the new password
    const hashedPassword = bcryptjs.hashSync(
      newPassword,
      bcryptjs.genSaltSync(10)
    );

    // Update user password
    user.password = hashedPassword;
    await UserRepo.save(user);

    // Delete the used reset request
    await ForgotPasswordRepo.delete({ id: resetRequest.id });

    // Send confirmation email
    try {
      await nodemailer_transporter.sendMail({
        from: "RCV Systems <genreycristobal03@gmail.com>",
        to: email,
        subject: "Password Successfully Reset - RCV System",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #005440;">Password Successfully Reset</h2>
            <p>Your password has been successfully reset for your RCV System account.</p>
            <p>You can now log in with your new password.</p>
            <p style="color: #666; margin-top: 20px;">
              If you didn't make this change, please contact support immediately.
            </p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;" />
            <p style="color: #999; font-size: 12px;">
              This is an automated message from RCV System. Please do not reply to this email.
            </p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error("Error sending confirmation email:", emailError);
      // Don't fail the request if email fails
    }

    return res.status(200).json({
      success: true,
      message: "Password has been successfully reset",
    });
  } catch (error: any) {
    console.error("Reset password error:", error);
    return next(new CustomError(500, "Failed to reset password"));
  }
};

export const generateForgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { email } = req.body;
  if (!email) {
    return next(new CustomError(400, "No email field", { data: req.body }));
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return next(new CustomError(400, "Invalid email", { data: req.body }));
  }

  const User = await UserRepo.findOneBy({ email: email });
  if (!User) {
    return next(new CustomError(200, "User not found"));
  }

  const hashKey = createForgotPasswordToken({ email: email, iat: Date.now() });
  ForgotPasswordRepo.save({ requestedBy: User, key: hashKey });

  nodemailer_transporter.sendMail({
    from: "RCV Systems <genreycristobal03@gmail.com>",
    to: "genreycristobal03@gmail.com",
    subject: "Hello ✔",
    text: "Hello world?",
    html: `<a href=${process.env.BACKEND_URL}/api/v1/auth/forgotPassword/${hashKey}>Link to reset your password</a>`,
  });
  return res
    .status(200)
    .json({
      message: "Forgot password key sent",
      email: email,
      hashKey: hashKey,
    });
};

export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = req.params;
  return res.redirect(
    `${process.env.FRONTEND_URL}/resetPassword?token=${token}`
  );
};

// Change password for authenticated user
export const changePassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long",
      });
    }

    // Find user with password field
    const user = await UserRepo.findOne({
      where: { _id: userId },
      select: ["_id", "email", "password", "firstName", "lastName"],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Verify current password
    const isPasswordValid = bcryptjs.compareSync(
      currentPassword,
      user.password
    );
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Hash new password
    const hashedPassword = bcryptjs.hashSync(newPassword, 10);
    user.password = hashedPassword;
    await UserRepo.save(user);

    // Log password change
    await AuditLogService.createLog({
      action: "User changed their password",
      actionType: "CHANGE_PASSWORD",
      userId,
      platform: "WEB",
      metadata: { email: user.email },
      req,
    });

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    next(error);
    return res.status(500).json({
      success: false,
      message: "Server error while changing password",
    });
  }
};
