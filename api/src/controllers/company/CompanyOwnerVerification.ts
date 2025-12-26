import { Request, Response } from 'express';
import { CompanyOwnerRepo, InviteTokenRepo } from '../../typeorm/data-source';
import nodemailer_transporter from '../../utils/nodemailer';
import crypto from 'crypto';
import CustomError from '../../utils/CustomError';

export const sendVerificationEmail = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    const companyOwner = await CompanyOwnerRepo.findOne({
      where: { email },
    });

    if (!companyOwner) {
      return res.status(404).json({
        message: 'Company owner not found',
      });
    }

    if (companyOwner.emailVerified) {
      return res.status(400).json({
        message: 'Email already verified',
      });
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date();
    verificationExpires.setHours(verificationExpires.getHours() + 24); // 24 hours expiry

    companyOwner.emailVerificationToken = verificationToken;
    companyOwner.emailVerificationExpires = verificationExpires;
    await CompanyOwnerRepo.save(companyOwner);

    // Send verification email
    const verificationUrl = `${process.env.FRONTEND_URL}/company/verify-email?token=${verificationToken}`;
    
    await nodemailer_transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Verify Your Email - RCV Platform',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Verify Your Email Address</h2>
          <p>Hello ${companyOwner.companyName},</p>
          <p>Thank you for registering with RCV Platform. Please click the button below to verify your email address:</p>
          <a href="${verificationUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0;">
            Verify Email
          </a>
          <p>Or copy and paste this link into your browser:</p>
          <p style="color: #666; word-break: break-all;">${verificationUrl}</p>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't create an account, please ignore this email.</p>
          <p>Best regards,<br>RCV Team</p>
        </div>
      `,
    });

    return res.status(200).json({
      message: 'Verification email sent successfully',
    });
  } catch (error) {
    console.error('Error sending verification email:', error);
    return res.status(500).json({
      message: 'Failed to send verification email',
    });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        message: 'Verification token required',
      });
    }

    const companyOwner = await CompanyOwnerRepo.findOne({
      where: { emailVerificationToken: token },
    });

    if (!companyOwner) {
      return res.status(404).json({
        message: 'Invalid verification token',
      });
    }

    if (companyOwner.emailVerified) {
      return res.status(400).json({
        message: 'Email already verified',
      });
    }

    // Check if token expired
    if (companyOwner.emailVerificationExpires && 
        new Date() > companyOwner.emailVerificationExpires) {
      return res.status(400).json({
        message: 'Verification token has expired. Please request a new one.',
      });
    }

    // Verify email
    companyOwner.emailVerified = true;
    companyOwner.emailVerificationToken = undefined;
    companyOwner.emailVerificationExpires = undefined;
    await CompanyOwnerRepo.save(companyOwner);

    return res.status(200).json({
      message: 'Email verified successfully',
      companyOwner: {
        _id: companyOwner._id,
        companyName: companyOwner.companyName,
        email: companyOwner.email,
        emailVerified: companyOwner.emailVerified,
      },
    });
  } catch (error) {
    console.error('Error verifying email:', error);
    return res.status(500).json({
      message: 'Internal server error',
    });
  }
};

export const generateEmployeeInviteLink = async (req: Request, res: Response) => {
  try {
    const { companyOwnerId } = req.body;

    const companyOwner = await CompanyOwnerRepo.findOne({
      where: { _id: companyOwnerId },
    });

    if (!companyOwner) {
      return res.status(404).json({
        message: 'Company owner not found',
      });
    }

    if (!companyOwner.approved) {
      return res.status(403).json({
        message: 'Company must be approved before inviting employees',
      });
    }

    // Generate invite token
    const inviteToken = crypto.randomBytes(32).toString('hex');
    
    // Set expiration to 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Store token in database
    const tokenRecord = InviteTokenRepo.create({
      token: inviteToken,
      companyOwnerId: companyOwnerId,
      expiresAt: expiresAt,
      used: false,
    });
    await InviteTokenRepo.save(tokenRecord);

    const inviteLink = `${process.env.FRONTEND_URL}/login?invite=${inviteToken}`;

    return res.status(200).json({
      message: 'Invite link generated successfully',
      inviteLink,
      inviteToken,
      expiresAt,
    });
  } catch (error) {
    console.error('Error generating invite link:', error);
    return res.status(500).json({
      message: 'Internal server error',
    });
  }
};

export const validateInviteToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const inviteToken = await InviteTokenRepo.findOne({
      where: { token },
      relations: ['companyOwner'],
    });

    if (!inviteToken) {
      return res.status(404).json({
        success: false,
        message: 'Invalid invite token',
      });
    }

    if (inviteToken.used) {
      return res.status(400).json({
        success: false,
        message: 'This invite link has already been used',
      });
    }

    if (inviteToken.expiresAt && new Date() > inviteToken.expiresAt) {
      return res.status(400).json({
        success: false,
        message: 'This invite link has expired',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Valid invite token',
      companyOwner: {
        _id: inviteToken.companyOwner._id,
        companyName: inviteToken.companyOwner.companyName,
        email: inviteToken.companyOwner.email,
      },
    });
  } catch (error) {
    console.error('Error validating invite token:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const markInviteTokenAsUsed = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    const inviteToken = await InviteTokenRepo.findOne({
      where: { token },
    });

    if (!inviteToken) {
      return res.status(404).json({
        message: 'Invalid invite token',
      });
    }

    inviteToken.used = true;
    await InviteTokenRepo.save(inviteToken);

    return res.status(200).json({
      message: 'Invite token marked as used',
    });
  } catch (error) {
    console.error('Error marking invite token as used:', error);
    return res.status(500).json({
      message: 'Internal server error',
    });
  }
};
