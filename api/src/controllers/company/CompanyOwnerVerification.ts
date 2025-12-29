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
    const { companyOwnerId, employeeEmail, personalMessage, hasWebAccess, hasAppAccess, hasKioskAccess, sendEmail } = req.body;

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

    // Check if there's already an unused invite for this email
    if (employeeEmail) {
      const existingInvite = await InviteTokenRepo.findOne({
        where: { 
          companyOwnerId,
          employeeEmail,
          used: false,
        },
      });

      if (existingInvite) {
        // Update the existing invite instead of creating a new one
        existingInvite.personalMessage = personalMessage || existingInvite.personalMessage;
        existingInvite.hasWebAccess = hasWebAccess ?? existingInvite.hasWebAccess;
        existingInvite.hasAppAccess = hasAppAccess ?? existingInvite.hasAppAccess;
        existingInvite.hasKioskAccess = hasKioskAccess ?? existingInvite.hasKioskAccess;
        existingInvite.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await InviteTokenRepo.save(existingInvite);

        const inviteLink = `${process.env.FRONTEND_URL}/login?invite=${existingInvite.token}`;

        // Send email if requested
        if (sendEmail && employeeEmail) {
          await sendInviteEmailToEmployee(
            employeeEmail,
            companyOwner,
            inviteLink,
            personalMessage,
            { hasWebAccess, hasAppAccess, hasKioskAccess }
          );
          existingInvite.emailSent = true;
          await InviteTokenRepo.save(existingInvite);
        }

        return res.status(200).json({
          message: 'Invite link updated and sent',
          inviteLink,
          inviteToken: existingInvite.token,
          expiresAt: existingInvite.expiresAt,
          emailSent: sendEmail && employeeEmail,
        });
      }
    }

    // Generate invite token
    const inviteToken = crypto.randomBytes(32).toString('hex');
    
    // Set expiration to 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Store token in database with permissions
    const tokenRecord = InviteTokenRepo.create({
      token: inviteToken,
      companyOwnerId: companyOwnerId,
      employeeEmail: employeeEmail || undefined,
      personalMessage: personalMessage || undefined,
      hasWebAccess: hasWebAccess || false,
      hasAppAccess: hasAppAccess || false,
      hasKioskAccess: hasKioskAccess || false,
      expiresAt: expiresAt,
      used: false,
      emailSent: false,
    });
    await InviteTokenRepo.save(tokenRecord);

    const inviteLink = `${process.env.FRONTEND_URL}/login?invite=${inviteToken}`;

    // Send email if requested and email is provided
    if (sendEmail && employeeEmail) {
      await sendInviteEmailToEmployee(
        employeeEmail,
        companyOwner,
        inviteLink,
        personalMessage,
        { hasWebAccess, hasAppAccess, hasKioskAccess }
      );
      tokenRecord.emailSent = true;
      await InviteTokenRepo.save(tokenRecord);
    }

    return res.status(200).json({
      message: sendEmail ? 'Invite sent successfully' : 'Invite link generated successfully',
      inviteLink,
      inviteToken,
      expiresAt,
      emailSent: sendEmail && employeeEmail,
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
      permissions: {
        hasWebAccess: inviteToken.hasWebAccess,
        hasAppAccess: inviteToken.hasAppAccess,
        hasKioskAccess: inviteToken.hasKioskAccess,
      },
      employeeEmail: inviteToken.employeeEmail,
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

// Helper function to send invite email to employee
const sendInviteEmailToEmployee = async (
  employeeEmail: string,
  companyOwner: any,
  inviteLink: string,
  personalMessage?: string,
  permissions?: { hasWebAccess?: boolean; hasAppAccess?: boolean; hasKioskAccess?: boolean }
) => {
  const permissionsList = [];
  if (permissions?.hasWebAccess) permissionsList.push('Web Dashboard Access');
  if (permissions?.hasAppAccess) permissionsList.push('Mobile App Access');
  if (permissions?.hasKioskAccess) permissionsList.push('Kiosk Access');

  const permissionsHtml = permissionsList.length > 0
    ? `<p style="margin: 15px 0;"><strong>Your assigned permissions:</strong></p>
       <ul style="color: #1e40af; margin: 10px 0;">
         ${permissionsList.map(p => `<li>${p}</li>`).join('')}
       </ul>`
    : '';

  const messageHtml = personalMessage
    ? `<div style="background-color: #f0f9ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
         <p style="color: #1e40af; font-style: italic; margin: 0;">"${personalMessage}"</p>
         <p style="color: #64748b; margin: 10px 0 0 0; font-size: 14px;">- ${companyOwner.companyName}</p>
       </div>`
    : '';

  await nodemailer_transporter.sendMail({
    from: `"${companyOwner.companyName}" <${process.env.NODEMAILER_USER}>`,
    replyTo: companyOwner.email,
    to: employeeEmail,
    subject: `You're Invited to Join ${companyOwner.companyName} on RCV Platform`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to RCV Platform</h1>
        </div>
        
        <div style="padding: 30px;">
          <h2 style="color: #1e3a8a; margin-top: 0;">You've Been Invited! 🎉</h2>
          
          <p style="color: #334155; font-size: 16px; line-height: 1.6;">
            <strong>${companyOwner.companyName}</strong> has invited you to join their team on the RCV Platform.
          </p>

          ${messageHtml}
          
          ${permissionsHtml}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteLink}" 
               style="display: inline-block; 
                      background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); 
                      color: white; 
                      padding: 14px 32px; 
                      text-decoration: none; 
                      border-radius: 8px; 
                      font-weight: bold;
                      font-size: 16px;">
              Accept Invitation & Register
            </a>
          </div>
          
          <p style="color: #64748b; font-size: 14px;">
            Or copy and paste this link into your browser:
          </p>
          <p style="color: #2563eb; word-break: break-all; font-size: 14px;">
            ${inviteLink}
          </p>
          
          <div style="border-top: 1px solid #e2e8f0; margin-top: 30px; padding-top: 20px;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
              This invitation link will expire in 7 days.<br>
              If you didn't expect this invitation, you can safely ignore this email.
            </p>
          </div>
        </div>
        
        <div style="background-color: #f8fafc; padding: 20px; text-align: center;">
          <p style="color: #64748b; font-size: 12px; margin: 0;">
            Sent on behalf of ${companyOwner.companyName}<br>
            © ${new Date().getFullYear()} RCV Platform
          </p>
        </div>
      </div>
    `,
  });
};

// Bulk invite employees via email list
export const bulkInviteEmployees = async (req: Request, res: Response) => {
  try {
    const { companyOwnerId, employees, personalMessage, hasWebAccess, hasAppAccess, hasKioskAccess } = req.body;

    // employees should be an array of objects with at least { email: string }
    if (!employees || !Array.isArray(employees) || employees.length === 0) {
      return res.status(400).json({
        message: 'Please provide a list of employees with email addresses',
      });
    }

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

    const results: { email: string; success: boolean; error?: string }[] = [];
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    for (const employee of employees) {
      const email = employee.email?.trim()?.toLowerCase();
      
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        results.push({ email: email || 'invalid', success: false, error: 'Invalid email format' });
        continue;
      }

      try {
        // Check for existing unused invite
        let tokenRecord = await InviteTokenRepo.findOne({
          where: { companyOwnerId, employeeEmail: email, used: false },
        });

        if (!tokenRecord) {
          // Generate new invite token
          const inviteToken = crypto.randomBytes(32).toString('hex');
          
          tokenRecord = InviteTokenRepo.create({
            token: inviteToken,
            companyOwnerId,
            employeeEmail: email,
            personalMessage: personalMessage || undefined,
            hasWebAccess: hasWebAccess || false,
            hasAppAccess: hasAppAccess || false,
            hasKioskAccess: hasKioskAccess || false,
            expiresAt,
            used: false,
            emailSent: false,
          });
          await InviteTokenRepo.save(tokenRecord);
        }

        const inviteLink = `${process.env.FRONTEND_URL}/login?invite=${tokenRecord.token}`;

        // Send email
        await sendInviteEmailToEmployee(
          email,
          companyOwner,
          inviteLink,
          personalMessage,
          { hasWebAccess, hasAppAccess, hasKioskAccess }
        );

        tokenRecord.emailSent = true;
        await InviteTokenRepo.save(tokenRecord);

        results.push({ email, success: true });
      } catch (emailError: any) {
        console.error(`Failed to send invite to ${email}:`, emailError);
        results.push({ email, success: false, error: 'Failed to send email' });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return res.status(200).json({
      message: `Sent ${successCount} invites successfully${failCount > 0 ? `, ${failCount} failed` : ''}`,
      results,
      summary: {
        total: employees.length,
        success: successCount,
        failed: failCount,
      },
    });
  } catch (error) {
    console.error('Error bulk inviting employees:', error);
    return res.status(500).json({
      message: 'Internal server error',
    });
  }
};

// Get all pending invites for a company
export const getPendingInvites = async (req: Request, res: Response) => {
  try {
    const { companyOwnerId } = req.params;

    const invites = await InviteTokenRepo.find({
      where: { companyOwnerId, used: false },
      order: { createdAt: 'DESC' },
    });

    return res.status(200).json({
      invites: invites.map(invite => ({
        _id: invite._id,
        employeeEmail: invite.employeeEmail,
        hasWebAccess: invite.hasWebAccess,
        hasAppAccess: invite.hasAppAccess,
        hasKioskAccess: invite.hasKioskAccess,
        emailSent: invite.emailSent,
        expiresAt: invite.expiresAt,
        createdAt: invite.createdAt,
        expired: invite.expiresAt ? new Date() > invite.expiresAt : false,
      })),
    });
  } catch (error) {
    console.error('Error fetching pending invites:', error);
    return res.status(500).json({
      message: 'Internal server error',
    });
  }
};

// Cancel/delete a pending invite
export const cancelInvite = async (req: Request, res: Response) => {
  try {
    const { inviteId } = req.params;
    const { companyOwnerId } = req.body;

    const invite = await InviteTokenRepo.findOne({
      where: { _id: inviteId, companyOwnerId },
    });

    if (!invite) {
      return res.status(404).json({
        message: 'Invite not found',
      });
    }

    await InviteTokenRepo.remove(invite);

    return res.status(200).json({
      message: 'Invite cancelled successfully',
    });
  } catch (error) {
    console.error('Error cancelling invite:', error);
    return res.status(500).json({
      message: 'Internal server error',
    });
  }
};

// Resend invite email
export const resendInvite = async (req: Request, res: Response) => {
  try {
    const { inviteId } = req.params;
    const { companyOwnerId } = req.body;

    const invite = await InviteTokenRepo.findOne({
      where: { _id: inviteId, companyOwnerId },
      relations: ['companyOwner'],
    });

    if (!invite) {
      return res.status(404).json({
        message: 'Invite not found',
      });
    }

    if (!invite.employeeEmail) {
      return res.status(400).json({
        message: 'No email address associated with this invite',
      });
    }

    // Extend expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    invite.expiresAt = expiresAt;

    const inviteLink = `${process.env.FRONTEND_URL}/login?invite=${invite.token}`;

    await sendInviteEmailToEmployee(
      invite.employeeEmail,
      invite.companyOwner,
      inviteLink,
      invite.personalMessage || undefined,
      { 
        hasWebAccess: invite.hasWebAccess, 
        hasAppAccess: invite.hasAppAccess, 
        hasKioskAccess: invite.hasKioskAccess 
      }
    );

    invite.emailSent = true;
    await InviteTokenRepo.save(invite);

    return res.status(200).json({
      message: 'Invite resent successfully',
      expiresAt,
    });
  } catch (error) {
    console.error('Error resending invite:', error);
    return res.status(500).json({
      message: 'Internal server error',
    });
  }
};
