import { Request, Response } from 'express';
import { DB, CompanyOwnerRepo, UserRepo } from '../../typeorm/data-source';
import { CompanyOwner, CompanyOwnerValidation } from '../../typeorm/entities/companyOwner.entity';
import { ZodError } from 'zod';
import bcryptjs from 'bcryptjs';
import nodemailer_transporter from '../../utils/nodemailer';
import crypto from 'crypto';

export const registerCompanyOwner = async (req: Request, res: Response) => {
  try {
    const validatedData = CompanyOwnerValidation.parse(req.body);
    const companyOwnerRepository = CompanyOwnerRepo;

    const existingWallet = await companyOwnerRepository.findOne({
      where: { walletAddress: validatedData.walletAddress },
    });

    if (existingWallet) {
      return res.status(400).json({
        message: 'Wallet address already registered',
      });
    }

    const existingEmail = await companyOwnerRepository.findOne({
      where: { email: validatedData.email },
    });

    if (existingEmail) {
      return res.status(400).json({
        message: 'Email already registered',
      });
    }

    const hashedPassword = bcryptjs.hashSync(validatedData.password, 10);

    const newCompanyOwner = companyOwnerRepository.create({
      ...validatedData,
      password: hashedPassword,
      status: 'Pending',
      approved: false,
    });

    await companyOwnerRepository.save(newCompanyOwner);

    return res.status(201).json({
      message: 'Company registration submitted for approval',
      companyOwner: {
        _id: newCompanyOwner._id,
        companyName: newCompanyOwner.companyName,
        email: newCompanyOwner.email,
        status: newCompanyOwner.status,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        message: 'Validation error',
        errors: error.issues,
      });
    }

    console.error('Error registering company owner:', error);
    return res.status(500).json({
      message: 'Internal server error',
    });
  }
};

export const loginCompanyOwner = async (req: Request, res: Response) => {
  try {
    const { email, password, walletAddress } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required',
      });
    }

    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({
        message: 'Valid wallet address required',
      });
    }

    const companyOwnerRepository = CompanyOwnerRepo;

    const companyOwner = await companyOwnerRepository.findOne({
      where: { email },
      select: ['_id', 'companyName', 'email', 'password', 'emailVerified', 'walletAddress', 'latitude', 'longitude', 'address', 'businessPermitUrl', 'status', 'approved'],
    });

    if (!companyOwner) {
      return res.status(401).json({
        message: 'Invalid email or password',
      });
    }

    const isPasswordValid = bcryptjs.compareSync(password, companyOwner.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        message: 'Invalid email or password',
      });
    }

    if (companyOwner.walletAddress !== walletAddress) {
      return res.status(403).json({
        message: 'Wrong MetaMask wallet connected. Please connect the wallet you registered with.',
      });
    }

    if (companyOwner.status === 'Rejected') {
      return res.status(403).json({
        message: 'Company registration has been rejected',
      });
    }

    if (companyOwner.status === 'Pending') {
      return res.status(403).json({
        message: 'Company registration is pending approval',
        status: 'Pending',
      });
    }

    return res.status(200).json({
      message: 'Login successful',
      companyOwner: {
        _id: companyOwner._id,
        companyName: companyOwner.companyName,
        email: companyOwner.email,
        emailVerified: companyOwner.emailVerified,
        walletAddress: companyOwner.walletAddress,
        latitude: companyOwner.latitude,
        longitude: companyOwner.longitude,
        address: companyOwner.address,
        businessPermitUrl: companyOwner.businessPermitUrl,
        status: companyOwner.status,
        approved: companyOwner.approved,
      },
    });
  } catch (error) {
    console.error('Error during company owner login:', error);
    return res.status(500).json({
      message: 'Internal server error',
    });
  }
};

export const getCompanyOwnerByWallet = async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;

    const companyOwnerRepository = CompanyOwnerRepo;

    const companyOwner = await companyOwnerRepository.findOne({
      where: { walletAddress },
    });

    if (!companyOwner) {
      return res.status(404).json({
        message: 'Company owner not found',
      });
    }

    return res.status(200).json({
      companyOwner: {
        _id: companyOwner._id,
        companyName: companyOwner.companyName,
        email: companyOwner.email,
        walletAddress: companyOwner.walletAddress,
        latitude: companyOwner.latitude,
        longitude: companyOwner.longitude,
        address: companyOwner.address,
        businessPermitUrl: companyOwner.businessPermitUrl,
        status: companyOwner.status,
        approved: companyOwner.approved,
        createdAt: companyOwner.createdAt,
      },
    });
  } catch (error) {
    console.error('Error fetching company owner:', error);
    return res.status(500).json({
      message: 'Internal server error',
    });
  }
};

export const getAllCompanyOwners = async (req: Request, res: Response) => {
  try {
    const companyOwnerRepository = CompanyOwnerRepo;
    
    const companyOwners = await companyOwnerRepository.find({
      order: {
        createdAt: 'DESC',
      },
    });

    return res.status(200).json({
      companyOwners,
      count: companyOwners.length,
    });
  } catch (error) {
    console.error('Error fetching company owners:', error);
    return res.status(500).json({
      message: 'Internal server error',
    });
  }
};

export const approveCompanyOwner = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const companyOwnerRepository = CompanyOwnerRepo;

    const companyOwner = await companyOwnerRepository.findOne({
      where: { _id: id },
    });

    if (!companyOwner) {
      return res.status(404).json({
        message: 'Company owner not found',
      });
    }

    companyOwner.status = 'Approved';
    companyOwner.approved = true;

    await companyOwnerRepository.save(companyOwner);

    return res.status(200).json({
      message: 'Company owner approved successfully',
      companyOwner,
    });
  } catch (error) {
    console.error('Error approving company owner:', error);
    return res.status(500).json({
      message: 'Internal server error',
    });
  }
};

export const rejectCompanyOwner = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const companyOwnerRepository = CompanyOwnerRepo;

    const companyOwner = await companyOwnerRepository.findOne({
      where: { _id: id },
    });

    if (!companyOwner) {
      return res.status(404).json({
        message: 'Company owner not found',
      });
    }

    companyOwner.status = 'Rejected';
    companyOwner.approved = false;

    await companyOwnerRepository.save(companyOwner);

    return res.status(200).json({
      message: 'Company owner rejected',
      companyOwner,
    });
  } catch (error) {
    console.error('Error rejecting company owner:', error);
    return res.status(500).json({
      message: 'Internal server error',
    });
  }
};

export const getEmployeesByCompanyOwner = async (req: Request, res: Response) => {
  try {
    const { companyOwnerId } = req.params;

    const employees = await UserRepo.find({
      where: { companyOwnerId },
      select: [
        '_id',
        'firstName',
        'lastName',
        'fullName',
        'email',
        'phoneNumber',
        'status',
        'approved',
        'role',
        'badgeId',
        'hasWebAccess',
        'hasAppAccess',
        'hasKioskAccess',
        'walletAddress',
        'createdAt',
      ],
      order: { createdAt: 'DESC' },
    });

    return res.status(200).json({
      success: true,
      employees,
    });
  } catch (error) {
    console.error('Error fetching employees:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const updateEmployeeAccess = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { hasWebAccess, hasAppAccess, hasKioskAccess, companyOwnerId } = req.body;

    // Verify the employee belongs to this company owner
    const employee = await UserRepo.findOne({
      where: { _id: employeeId },
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      });
    }

    if (employee.companyOwnerId !== companyOwnerId) {
      return res.status(403).json({
        success: false,
        message: 'You can only modify employees in your organization',
      });
    }

    // Prevent modifying super admin or admin access
    if (employee.isSuperAdmin || employee.role === 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Cannot modify access for administrators',
      });
    }

    // Update access permissions
    employee.hasWebAccess = hasWebAccess ?? employee.hasWebAccess;
    employee.hasAppAccess = hasAppAccess ?? employee.hasAppAccess;
    employee.hasKioskAccess = hasKioskAccess ?? employee.hasKioskAccess;

    await UserRepo.save(employee);

    return res.status(200).json({
      success: true,
      message: 'Employee access updated successfully',
      employee: {
        _id: employee._id,
        fullName: employee.fullName,
        hasWebAccess: employee.hasWebAccess,
        hasAppAccess: employee.hasAppAccess,
        hasKioskAccess: employee.hasKioskAccess,
      },
    });
  } catch (error) {
    console.error('Error updating employee access:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const approveEmployeeByCompanyOwner = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { companyOwnerId } = req.body;

    // Verify the employee belongs to this company owner
    const employee = await UserRepo.findOne({
      where: { _id: employeeId },
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      });
    }

    if (employee.companyOwnerId !== companyOwnerId) {
      return res.status(403).json({
        success: false,
        message: 'You can only approve employees in your organization',
      });
    }

    // Update employee status
    employee.approved = true;
    employee.status = 'Active';

    await UserRepo.save(employee);

    return res.status(200).json({
      success: true,
      message: 'Employee approved successfully',
      employee: {
        _id: employee._id,
        fullName: employee.fullName,
        status: employee.status,
        approved: employee.approved,
      },
    });
  } catch (error) {
    console.error('Error approving employee:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const rejectEmployeeByCompanyOwner = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { companyOwnerId } = req.body;

    // Verify the employee belongs to this company owner
    const employee = await UserRepo.findOne({
      where: { _id: employeeId },
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      });
    }

    if (employee.companyOwnerId !== companyOwnerId) {
      return res.status(403).json({
        success: false,
        message: 'You can only reject employees in your organization',
      });
    }

    // Update employee status
    employee.approved = false;
    employee.status = 'Archived';

    await UserRepo.save(employee);

    return res.status(200).json({
      success: true,
      message: 'Employee rejected',
      employee: {
        _id: employee._id,
        fullName: employee.fullName,
        status: employee.status,
        approved: employee.approved,
      },
    });
  } catch (error) {
    console.error('Error rejecting employee:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const forgotPasswordCompanyOwner = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: 'Email is required',
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        message: 'Invalid email format',
      });
    }

    const companyOwner = await CompanyOwnerRepo.findOne({
      where: { email },
    });

    if (!companyOwner) {
      return res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a reset code has been sent.',
      });
    }

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedCode = bcryptjs.hashSync(resetCode, 10);

    companyOwner.passwordResetToken = hashedCode;
    companyOwner.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);
    await CompanyOwnerRepo.save(companyOwner);

    await nodemailer_transporter.sendMail({
      from: "RCV Systems <genreycristobal03@gmail.com>",
      to: email,
      subject: "Password Reset Code - RCV Company Portal",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #005440;">Password Reset Request</h2>
          <p>You have requested to reset your password for your company account.</p>
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
        </div>
      `,
    });

    return res.status(200).json({
      success: true,
      message: 'If an account exists with this email, a reset code has been sent.',
    });
  } catch (error) {
    console.error('Company owner password reset error:', error);
    return res.status(500).json({
      message: 'Failed to process password reset request',
    });
  }
};

export const verifyResetCodeCompanyOwner = async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        valid: false,
        message: 'Email and code are required',
      });
    }

    if (code.length !== 6 || !/^\d+$/.test(code)) {
      return res.status(200).json({ valid: false });
    }

    const companyOwner = await CompanyOwnerRepo.findOne({
      where: { email },
      select: ['_id', 'email', 'passwordResetToken', 'passwordResetExpires'],
    });

    if (!companyOwner || !companyOwner.passwordResetToken || !companyOwner.passwordResetExpires) {
      return res.status(200).json({ valid: false });
    }

    if (new Date() > companyOwner.passwordResetExpires) {
      return res.status(200).json({ valid: false });
    }

    const isCodeValid = bcryptjs.compareSync(code, companyOwner.passwordResetToken);

    return res.status(200).json({ valid: isCodeValid });
  } catch (error) {
    console.error('Verify reset code error:', error);
    return res.status(500).json({
      valid: false,
      message: 'Failed to verify reset code',
    });
  }
};

export const resetPasswordCompanyOwner = async (req: Request, res: Response) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({
        message: 'Email, code, and new password are required',
      });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters with uppercase, lowercase, and number',
      });
    }

    const companyOwner = await CompanyOwnerRepo.findOne({
      where: { email },
      select: ['_id', 'email', 'companyName', 'passwordResetToken', 'passwordResetExpires'],
    });

    if (!companyOwner || !companyOwner.passwordResetToken || !companyOwner.passwordResetExpires) {
      return res.status(400).json({
        message: 'Invalid or expired reset code',
      });
    }

    if (new Date() > companyOwner.passwordResetExpires) {
      return res.status(400).json({
        message: 'Reset code has expired',
      });
    }

    const isCodeValid = bcryptjs.compareSync(code, companyOwner.passwordResetToken);
    if (!isCodeValid) {
      return res.status(400).json({
        message: 'Invalid reset code',
      });
    }

    const hashedPassword = bcryptjs.hashSync(newPassword, 10);
    companyOwner.password = hashedPassword;
    companyOwner.passwordResetToken = "";
    companyOwner.passwordResetExpires = undefined;
    await CompanyOwnerRepo.save(companyOwner);

    await nodemailer_transporter.sendMail({
      from: "RCV Systems <genreycristobal03@gmail.com>",
      to: email,
      subject: "Password Successfully Reset - RCV Company Portal",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #005440;">Password Successfully Reset</h2>
          <p>Your password has been successfully reset for your company account.</p>
          <p>You can now log in with your new password.</p>
          <p style="color: #666; margin-top: 20px;">
            If you didn't make this change, please contact support immediately.
          </p>
        </div>
      `,
    });

    return res.status(200).json({
      success: true,
      message: 'Password has been successfully reset',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({
      message: 'Failed to reset password',
    });
  }
};
