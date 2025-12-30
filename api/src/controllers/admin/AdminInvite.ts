import { Request, Response } from 'express';
import { AdminInviteRepo, UserRepo } from '../../typeorm/data-source';
import { AdminInvite } from '../../typeorm/entities/adminInvite.entity';
import { sendMail } from '../../utils/nodemailer';
import { v4 as uuidv4 } from 'uuid';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

/**
 * Admin creates an invite for a potential agent
 * POST /api/v1/admin-invite/create
 */
export const createAdminInvite = async (req: Request, res: Response) => {
  try {
    const { badgeId, email, personalMessage, webAccess = false, appAccess = true } = req.body;
    const adminUser = (req as any).user;

    if (!badgeId || !email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Badge ID and email are required' 
      });
    }

    // Check if admin has permission (must be ADMIN role)
    if (adminUser.role !== 'ADMIN' && !adminUser.isSuperAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Only administrators can invite agents' 
      });
    }

    // Check if email already has a pending invite
    const existingInvite = await AdminInviteRepo.findOne({
      where: { email, status: 'pending' }
    });

    if (existingInvite) {
      return res.status(400).json({ 
        success: false, 
        message: 'An invite is already pending for this email address' 
      });
    }

    // Check if badge ID already exists in the system
    const existingUser = await UserRepo.findOne({
      where: { badgeId }
    });

    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'This badge ID is already registered in the system' 
      });
    }

    // Check if email already exists in users
    const existingEmailUser = await UserRepo.findOne({
      where: { email }
    });

    if (existingEmailUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'This email is already registered in the system' 
      });
    }

    // Create the invite
    const invite = new AdminInvite();
    invite.badgeId = badgeId;
    invite.email = email;
    invite.personalMessage = personalMessage;
    invite.invitedBy = adminUser._id;
    invite.invitedByName = adminUser.fullName || `${adminUser.firstName} ${adminUser.lastName}`;
    invite.token = uuidv4();
    invite.status = 'pending';
    invite.emailSent = false;
    invite.webAccess = webAccess;
    invite.appAccess = appAccess;

    await AdminInviteRepo.save(invite);

    // Send invitation email
    const inviteLink = `${FRONTEND_URL}/login?invite=${invite.token}`;
    
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">RCV Agent Invitation</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <p style="font-size: 16px; color: #374151;">Hello,</p>
          <p style="font-size: 16px; color: #374151;">
            You have been invited by <strong>${invite.invitedByName}</strong> to join the RCV platform as an Agent.
          </p>
          ${personalMessage ? `
            <div style="background: #e0f2fe; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #0369a1; font-style: italic;">"${personalMessage}"</p>
            </div>
          ` : ''}
          <p style="font-size: 16px; color: #374151;">
            To complete your registration, please click the button below and verify your badge number.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteLink}" style="background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Complete Registration
            </a>
          </div>
          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #92400e; font-size: 14px;">
              <strong>Important:</strong> You will need to verify your badge number: <strong>${badgeId}</strong>
            </p>
          </div>
          <p style="font-size: 14px; color: #6b7280;">
            This invitation link will expire in 7 days.
          </p>
        </div>
        <div style="background: #1f2937; padding: 20px; text-align: center;">
          <p style="color: #9ca3af; margin: 0; font-size: 12px;">
            © ${new Date().getFullYear()} RCV Platform. All rights reserved.
          </p>
        </div>
      </div>
    `;

    try {
      await sendMail(email, 'You have been invited to join RCV Platform', emailHtml);
      invite.emailSent = true;
      await AdminInviteRepo.save(invite);
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);
      // Still return success but note email wasn't sent
    }

    return res.status(201).json({
      success: true,
      message: 'Invitation created successfully',
      invite: {
        _id: invite._id,
        email: invite.email,
        badgeId: invite.badgeId,
        status: invite.status,
        emailSent: invite.emailSent,
        createdAt: invite.createdAt,
      }
    });

  } catch (error: any) {
    console.error('Create admin invite error:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to create invitation' 
    });
  }
};

/**
 * Verify invite token and get invite details
 * GET /api/v1/admin-invite/verify/:token
 */
export const verifyInviteToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const invite = await AdminInviteRepo.findOne({
      where: { token }
    });

    if (!invite) {
      return res.status(404).json({ 
        success: false, 
        message: 'Invalid invitation link' 
      });
    }

    // Check if expired
    if (invite.expiresAt && new Date() > invite.expiresAt) {
      return res.status(400).json({ 
        success: false, 
        message: 'This invitation has expired' 
      });
    }

    // Check status
    if (invite.status === 'approved') {
      return res.status(400).json({ 
        success: false, 
        message: 'This invitation has already been used' 
      });
    }

    if (invite.status === 'rejected') {
      return res.status(400).json({ 
        success: false, 
        message: 'This invitation was rejected',
        rejectionReason: invite.rejectionReason
      });
    }

    if (invite.status === 'revoked') {
      return res.status(400).json({ 
        success: false, 
        message: 'This invitation has been revoked by the administrator' 
      });
    }

    if (invite.status === 'archived') {
      return res.status(400).json({ 
        success: false, 
        message: 'This invitation is no longer active' 
      });
    }

    return res.status(200).json({
      success: true,
      invite: {
        _id: invite._id,
        email: invite.email,
        status: invite.status,
        invitedByName: invite.invitedByName,
        personalMessage: invite.personalMessage,
        // Don't send badge ID - user must verify it
        requiresBadgeVerification: invite.status === 'pending',
      }
    });

  } catch (error: any) {
    console.error('Verify invite token error:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to verify invitation' 
    });
  }
};

/**
 * Verify badge number for the invite
 * POST /api/v1/admin-invite/verify-badge
 */
export const verifyBadgeNumber = async (req: Request, res: Response) => {
  try {
    const { token, badgeId } = req.body;

    if (!token || !badgeId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Token and badge ID are required' 
      });
    }

    const invite = await AdminInviteRepo.findOne({
      where: { token }
    });

    if (!invite) {
      return res.status(404).json({ 
        success: false, 
        message: 'Invalid invitation' 
      });
    }

    // Check if badge ID matches (don't save status yet - wait for complete registration)
    if (invite.badgeId !== badgeId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Badge number does not match our records' 
      });
    }

    // Just return success - don't save status change
    // Status will be updated when registration is completed
    return res.status(200).json({
      success: true,
      message: 'Badge number verified successfully',
      invite: {
        _id: invite._id,
        email: invite.email,
        badgeId: invite.badgeId,
        status: invite.status, // Keep original status
      }
    });

  } catch (error: any) {
    console.error('Verify badge error:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to verify badge number' 
    });
  }
};

/**
 * Complete registration with documents
 * POST /api/v1/admin-invite/complete-registration
 */
export const completeRegistration = async (req: Request, res: Response) => {
  try {
    const { 
      token, 
      firstName, 
      lastName, 
      middleName,
      extName,
      password, 
      phoneNumber, 
      location, 
      dateOfBirth,
      idDocumentUrl,
      selfieWithIdUrl 
    } = req.body;

    if (!token) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invitation token is required' 
      });
    }

    const invite = await AdminInviteRepo.findOne({
      where: { token }
    });

    if (!invite) {
      return res.status(404).json({ 
        success: false, 
        message: 'Invalid invitation' 
      });
    }

    // Invite must be pending or badge_verified (badge_verified is legacy from previous registrations)
    if (invite.status !== 'pending' && invite.status !== 'badge_verified') {
      return res.status(400).json({ 
        success: false, 
        message: 'This invitation has already been processed' 
      });
    }

    // Verify badge number from request body
    const { badgeId } = req.body;
    if (!badgeId || invite.badgeId !== badgeId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Badge number verification failed' 
      });
    }

    // Validate required fields
    if (!firstName || !lastName || !password || !phoneNumber || !location || !dateOfBirth) {
      return res.status(400).json({ 
        success: false, 
        message: 'All required fields must be filled' 
      });
    }

    // Validate documents
    if (!idDocumentUrl || !selfieWithIdUrl) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID document and selfie with ID are required for verification' 
      });
    }

    // Hash password
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user account (pending approval)
    const fullName = `${firstName} ${middleName || ''} ${lastName} ${extName || ''}`.replace(/\s+/g, ' ').trim();
    
    const user = UserRepo.create({
      firstName,
      lastName,
      middleName: middleName || undefined,
      extName: extName || undefined,
      fullName,
      email: invite.email,
      password: hashedPassword,
      phoneNumber,
      location,
      dateOfBirth,
      badgeId: invite.badgeId,
      role: 'AGENT',
      status: 'Pending',
      approved: false,
      // Store document URLs on user for easy access
      idDocumentUrl,
      selfieWithIdUrl,
      // Use selfie as avatar by default
      avatarUrl: selfieWithIdUrl,
      // Copy access permissions from invite
      webAccess: invite.webAccess,
      appAccess: invite.appAccess,
    });

    await UserRepo.save(user);

    // Update invite with user ID and document URLs
    invite.status = 'registered';
    invite.userId = user._id;
    invite.idDocumentUrl = idDocumentUrl;
    invite.selfieWithIdUrl = selfieWithIdUrl;
    await AdminInviteRepo.save(invite);

    return res.status(201).json({
      success: true,
      message: 'Registration completed. Your account is pending admin approval.',
      pendingApproval: true,
    });

  } catch (error: any) {
    console.error('Complete registration error:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to complete registration' 
    });
  }
};

/**
 * Get all pending invites (admin only)
 * GET /api/v1/admin-invite/pending
 */
export const getPendingInvites = async (req: Request, res: Response) => {
  try {
    const adminUser = (req as any).user;

    if (adminUser.role !== 'ADMIN' && !adminUser.isSuperAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    const invites = await AdminInviteRepo.find({
      where: [
        { status: 'pending' },
        { status: 'badge_verified' },
        { status: 'registered' }
      ],
      order: { createdAt: 'DESC' }
    });

    return res.status(200).json({
      success: true,
      invites,
    });

  } catch (error: any) {
    console.error('Get pending invites error:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to get pending invites' 
    });
  }
};

/**
 * Get all invites (admin only)
 * GET /api/v1/admin-invite/all
 */
export const getAllInvites = async (req: Request, res: Response) => {
  try {
    const adminUser = (req as any).user;

    if (adminUser.role !== 'ADMIN' && !adminUser.isSuperAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    const invites = await AdminInviteRepo.find({
      order: { createdAt: 'DESC' }
    });

    return res.status(200).json({
      success: true,
      invites,
    });

  } catch (error: any) {
    console.error('Get all invites error:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to get invites' 
    });
  }
};

/**
 * Approve agent registration
 * POST /api/v1/admin-invite/approve/:inviteId
 */
export const approveAgent = async (req: Request, res: Response) => {
  try {
    const { inviteId } = req.params;
    const adminUser = (req as any).user;

    if (adminUser.role !== 'ADMIN' && !adminUser.isSuperAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    const invite = await AdminInviteRepo.findOne({
      where: { _id: inviteId }
    });

    if (!invite) {
      return res.status(404).json({ 
        success: false, 
        message: 'Invitation not found' 
      });
    }

    if (invite.status !== 'registered') {
      return res.status(400).json({ 
        success: false, 
        message: 'This invitation cannot be approved' 
      });
    }

    if (!invite.userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'No user associated with this invitation' 
      });
    }

    // Approve the user
    const user = await UserRepo.findOne({ where: { _id: invite.userId } });
    if (user) {
      user.approved = true;
      user.status = 'Active';
      await UserRepo.save(user);
    }

    // Update invite status
    invite.status = 'approved';
    await AdminInviteRepo.save(invite);

    // Send approval email
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">🎉 Welcome to RCV!</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <p style="font-size: 16px; color: #374151;">Hello ${user?.firstName || 'Agent'},</p>
          <p style="font-size: 16px; color: #374151;">
            Great news! Your agent registration has been <strong style="color: #10b981;">approved</strong>.
          </p>
          <p style="font-size: 16px; color: #374151;">
            You can now log in to the RCV platform and start using your account.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${FRONTEND_URL}/login" style="background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Log In Now
            </a>
          </div>
        </div>
        <div style="background: #1f2937; padding: 20px; text-align: center;">
          <p style="color: #9ca3af; margin: 0; font-size: 12px;">
            © ${new Date().getFullYear()} RCV Platform. All rights reserved.
          </p>
        </div>
      </div>
    `;

    try {
      await sendMail(invite.email, 'Your RCV Agent Registration has been Approved!', emailHtml);
    } catch (emailError) {
      console.error('Failed to send approval email:', emailError);
    }

    return res.status(200).json({
      success: true,
      message: 'Agent approved successfully',
    });

  } catch (error: any) {
    console.error('Approve agent error:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to approve agent' 
    });
  }
};

/**
 * Reject agent registration
 * POST /api/v1/admin-invite/reject/:inviteId
 */
export const rejectAgent = async (req: Request, res: Response) => {
  try {
    const { inviteId } = req.params;
    const { rejectionReason } = req.body;
    const adminUser = (req as any).user;

    if (adminUser.role !== 'ADMIN' && !adminUser.isSuperAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    if (!rejectionReason) {
      return res.status(400).json({ 
        success: false, 
        message: 'Rejection reason is required' 
      });
    }

    const invite = await AdminInviteRepo.findOne({
      where: { _id: inviteId }
    });

    if (!invite) {
      return res.status(404).json({ 
        success: false, 
        message: 'Invitation not found' 
      });
    }

    // Update invite status
    invite.status = 'rejected';
    invite.rejectionReason = rejectionReason;
    await AdminInviteRepo.save(invite);

    // If user was created, archive them
    if (invite.userId) {
      const user = await UserRepo.findOne({ where: { _id: invite.userId } });
      if (user) {
        user.status = 'Archived';
        await UserRepo.save(user);
      }
    }

    // Send rejection email
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Registration Update</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <p style="font-size: 16px; color: #374151;">Hello,</p>
          <p style="font-size: 16px; color: #374151;">
            We regret to inform you that your agent registration for the RCV platform has not been approved at this time.
          </p>
          <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
            <p style="margin: 0; color: #991b1b; font-weight: bold;">Reason:</p>
            <p style="margin: 10px 0 0 0; color: #991b1b;">${rejectionReason}</p>
          </div>
          <p style="font-size: 16px; color: #374151;">
            If you believe this was a mistake or would like more information, please contact the administrator.
          </p>
        </div>
        <div style="background: #1f2937; padding: 20px; text-align: center;">
          <p style="color: #9ca3af; margin: 0; font-size: 12px;">
            © ${new Date().getFullYear()} RCV Platform. All rights reserved.
          </p>
        </div>
      </div>
    `;

    try {
      await sendMail(invite.email, 'RCV Registration Update', emailHtml);
    } catch (emailError) {
      console.error('Failed to send rejection email:', emailError);
    }

    return res.status(200).json({
      success: true,
      message: 'Agent registration rejected',
    });

  } catch (error: any) {
    console.error('Reject agent error:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to reject agent' 
    });
  }
};

/**
 * Resend invitation email
 * POST /api/v1/admin-invite/resend/:inviteId
 */
export const resendInvite = async (req: Request, res: Response) => {
  try {
    const { inviteId } = req.params;
    const adminUser = (req as any).user;

    if (adminUser.role !== 'ADMIN' && !adminUser.isSuperAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    const invite = await AdminInviteRepo.findOne({
      where: { _id: inviteId }
    });

    if (!invite) {
      return res.status(404).json({ 
        success: false, 
        message: 'Invitation not found' 
      });
    }

    if (invite.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: 'Can only resend pending invitations' 
      });
    }

    // Regenerate token and extend expiry
    invite.token = uuidv4();
    invite.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const inviteLink = `${FRONTEND_URL}/login?invite=${invite.token}`;
    
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">RCV Agent Invitation (Reminder)</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <p style="font-size: 16px; color: #374151;">Hello,</p>
          <p style="font-size: 16px; color: #374151;">
            This is a reminder that you have been invited by <strong>${invite.invitedByName}</strong> to join the RCV platform as an Agent.
          </p>
          ${invite.personalMessage ? `
            <div style="background: #e0f2fe; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #0369a1; font-style: italic;">"${invite.personalMessage}"</p>
            </div>
          ` : ''}
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteLink}" style="background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Complete Registration
            </a>
          </div>
          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #92400e; font-size: 14px;">
              <strong>Important:</strong> You will need to verify your badge number: <strong>${invite.badgeId}</strong>
            </p>
          </div>
          <p style="font-size: 14px; color: #6b7280;">
            This invitation link will expire in 7 days.
          </p>
        </div>
        <div style="background: #1f2937; padding: 20px; text-align: center;">
          <p style="color: #9ca3af; margin: 0; font-size: 12px;">
            © ${new Date().getFullYear()} RCV Platform. All rights reserved.
          </p>
        </div>
      </div>
    `;

    await sendMail(invite.email, 'Reminder: You have been invited to join RCV Platform', emailHtml);
    invite.emailSent = true;
    await AdminInviteRepo.save(invite);

    return res.status(200).json({
      success: true,
      message: 'Invitation resent successfully',
    });

  } catch (error: any) {
    console.error('Resend invite error:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to resend invitation' 
    });
  }
};

/**
 * Delete/Cancel invitation
 * DELETE /api/v1/admin-invite/:inviteId
 */
export const deleteInvite = async (req: Request, res: Response) => {
  try {
    const { inviteId } = req.params;
    const adminUser = (req as any).user;

    if (adminUser.role !== 'ADMIN' && !adminUser.isSuperAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    const invite = await AdminInviteRepo.findOne({
      where: { _id: inviteId }
    });

    if (!invite) {
      return res.status(404).json({ 
        success: false, 
        message: 'Invitation not found' 
      });
    }

    await AdminInviteRepo.remove(invite);

    return res.status(200).json({
      success: true,
      message: 'Invitation deleted successfully',
    });

  } catch (error: any) {
    console.error('Delete invite error:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to delete invitation' 
    });
  }
};

/**
 * Revoke an invitation (makes it unusable)
 * POST /api/v1/admin-invite/revoke/:inviteId
 */
export const revokeInvite = async (req: Request, res: Response) => {
  try {
    const { inviteId } = req.params;
    const adminUser = (req as any).user;

    if (adminUser.role !== 'ADMIN' && !adminUser.isSuperAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    const invite = await AdminInviteRepo.findOne({
      where: { _id: inviteId }
    });

    if (!invite) {
      return res.status(404).json({ 
        success: false, 
        message: 'Invitation not found' 
      });
    }

    // Can only revoke pending or badge_verified invites
    if (!['pending', 'badge_verified'].includes(invite.status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Can only revoke pending or badge verified invitations' 
      });
    }

    invite.status = 'revoked';
    await AdminInviteRepo.save(invite);

    return res.status(200).json({
      success: true,
      message: 'Invitation revoked successfully',
    });

  } catch (error: any) {
    console.error('Revoke invite error:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to revoke invitation' 
    });
  }
};

/**
 * Archive an invitation (soft delete - keeps record)
 * POST /api/v1/admin-invite/archive/:inviteId
 */
export const archiveInvite = async (req: Request, res: Response) => {
  try {
    const { inviteId } = req.params;
    const adminUser = (req as any).user;

    if (adminUser.role !== 'ADMIN' && !adminUser.isSuperAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    const invite = await AdminInviteRepo.findOne({
      where: { _id: inviteId }
    });

    if (!invite) {
      return res.status(404).json({ 
        success: false, 
        message: 'Invitation not found' 
      });
    }

    invite.status = 'archived';
    await AdminInviteRepo.save(invite);

    return res.status(200).json({
      success: true,
      message: 'Invitation archived successfully',
    });

  } catch (error: any) {
    console.error('Archive invite error:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to archive invitation' 
    });
  }
};

/**
 * Update invitation details (badge ID, email)
 * PUT /api/v1/admin-invite/:inviteId
 */
export const updateInvite = async (req: Request, res: Response) => {
  try {
    const { inviteId } = req.params;
    const { badgeId, email, personalMessage } = req.body;
    const adminUser = (req as any).user;

    if (adminUser.role !== 'ADMIN' && !adminUser.isSuperAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    const invite = await AdminInviteRepo.findOne({
      where: { _id: inviteId }
    });

    if (!invite) {
      return res.status(404).json({ 
        success: false, 
        message: 'Invitation not found' 
      });
    }

    // Can only update pending or badge_verified invites
    if (!['pending', 'badge_verified'].includes(invite.status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Can only update pending or badge verified invitations' 
      });
    }

    // Validate badge ID if changed
    if (badgeId && badgeId !== invite.badgeId) {
      // Check if badge ID already exists in users
      const existingUser = await UserRepo.findOne({
        where: { badgeId }
      });

      if (existingUser) {
        return res.status(400).json({ 
          success: false, 
          message: 'This badge ID is already registered in the system' 
        });
      }

      // Check if badge ID is used in another invite
      const existingInvite = await AdminInviteRepo.findOne({
        where: { badgeId }
      });

      if (existingInvite && existingInvite._id !== inviteId) {
        return res.status(400).json({ 
          success: false, 
          message: 'This badge ID is already used in another invitation' 
        });
      }

      invite.badgeId = badgeId;
      
      // Reset status to pending since badge changed - agent must verify again
      if (invite.status === 'badge_verified') {
        invite.status = 'pending';
      }
    }

    // Validate email if changed
    if (email && email !== invite.email) {
      // Check if email already exists in users
      const existingEmailUser = await UserRepo.findOne({
        where: { email }
      });

      if (existingEmailUser) {
        return res.status(400).json({ 
          success: false, 
          message: 'This email is already registered in the system' 
        });
      }

      // Check if email is used in another pending invite
      const existingEmailInvite = await AdminInviteRepo.findOne({
        where: { email, status: 'pending' }
      });

      if (existingEmailInvite && existingEmailInvite._id !== inviteId) {
        return res.status(400).json({ 
          success: false, 
          message: 'An invite is already pending for this email address' 
        });
      }

      invite.email = email;
    }

    // Update personal message if provided
    if (personalMessage !== undefined) {
      invite.personalMessage = personalMessage || undefined;
    }

    await AdminInviteRepo.save(invite);

    return res.status(200).json({
      success: true,
      message: 'Invitation updated successfully',
      invite: {
        _id: invite._id,
        email: invite.email,
        badgeId: invite.badgeId,
        personalMessage: invite.personalMessage,
        status: invite.status,
      }
    });

  } catch (error: any) {
    console.error('Update invite error:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to update invitation' 
    });
  }
};
