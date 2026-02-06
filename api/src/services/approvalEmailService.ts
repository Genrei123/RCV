import { sendMail } from '../utils/nodemailer';
import { UserRepo } from '../typeorm/data-source';
import { CertificateApproval } from '../typeorm/entities/certificateApproval.entity';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

interface AdminUser {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
}

/**
 * Get all admin users with authorized wallets
 */
export async function getAdminUsers(): Promise<AdminUser[]> {
  const admins = await UserRepo.find({
    where: {
      role: 'ADMIN',
      walletAuthorized: true,
    },
    select: ['_id', 'email', 'firstName', 'lastName'],
  });

  return admins.map(admin => ({
    _id: admin._id,
    email: admin.email,
    firstName: admin.firstName,
    lastName: admin.lastName,
  }));
}

/**
 * Send email notification to all admins when a certificate is submitted for approval
 */
export async function notifyAdminsOfNewApproval(approval: CertificateApproval): Promise<void> {
  try {
    const admins = await getAdminUsers();

    if (admins.length === 0) {
      console.warn('No admin users found to notify');
      return;
    }

    const approvalUrl = `${FRONTEND_URL}/admin/approvals`;
    const entityTypeLabel = approval.entityType === 'product' ? 'Product' : 'Company';
    const isRenewal = approval.isRenewal || approval.pendingEntityData?.isRenewal;
    const isUpdate = approval.pendingEntityData?.isUpdate;
    
    let actionType = 'New Certificate';
    if (isRenewal) {
      actionType = 'Certificate Renewal';
    } else if (isUpdate) {
      actionType = 'Certificate Update';
    }

    const emailPromises = admins.map(async (admin) => {
      const emailSubject = `${actionType} Awaiting Your Approval - ${approval.entityName}`;
      
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
              color: white;
              padding: 30px;
              border-radius: 10px 10px 0 0;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 26px;
              font-weight: bold;
              text-shadow: 0 2px 4px rgba(0,0,0,0.2);
            }
            .content {
              background: #ffffff;
              padding: 30px;
              border: 1px solid #e0e0e0;
              border-top: none;
            }
            .info-box {
              background: #e8f5e9;
              border-left: 4px solid #11998e;
              padding: 20px;
              margin: 20px 0;
              border-radius: 4px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            }
            .info-row {
              margin: 12px 0;
              font-size: 15px;
            }
            .info-label {
              font-weight: bold;
              color: #11998e;
              display: inline-block;
              min-width: 150px;
            }
            .badge {
              display: inline-block;
              padding: 5px 14px;
              border-radius: 12px;
              font-size: 13px;
              font-weight: bold;
              margin-left: 10px;
            }
            .badge-renewal {
              background: #ff9800;
              color: white;
            }
            .badge-update {
              background: #2196f3;
              color: white;
            }
            .badge-new {
              background: #11998e;
              color: white;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
              color: white;
              padding: 16px 45px;
              text-decoration: none;
              border-radius: 5px;
              font-weight: bold;
              font-size: 16px;
              margin: 20px 0;
              text-align: center;
              box-shadow: 0 4px 6px rgba(17, 153, 142, 0.3);
            }
            .button:hover {
              background: linear-gradient(135deg, #0f8578 0%, #32d66f 100%);
              box-shadow: 0 6px 8px rgba(17, 153, 142, 0.4);
            }
            .footer {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 0 0 10px 10px;
              text-align: center;
              font-size: 12px;
              color: #666;
              border: 1px solid #e0e0e0;
              border-top: none;
            }
            .alert {
              background: #fff3cd;
              border: 1px solid #ffc107;
              border-radius: 4px;
              padding: 15px;
              margin: 20px 0;
              font-weight: 500;
            }
            .entity-name {
              font-size: 18px;
              font-weight: bold;
              color: #11998e;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>CERTIFICATE APPROVAL REQUIRED</h1>
          </div>
          
          <div class="content">
            <p style="font-size: 16px;">Hello <strong>${admin.firstName}</strong>,</p>
            
            <p style="font-size: 15px; line-height: 1.7;">A <strong>${entityTypeLabel.toLowerCase()}</strong> certificate has been submitted and <strong>requires your approval</strong>.</p>
            
            <div class="info-box">
              <div class="info-row">
                <span class="info-label">Type:</span>
                <span style="font-weight: 600;">${actionType}</span>
                ${isRenewal ? '<span class="badge badge-renewal">RENEWAL</span>' : ''}
                ${isUpdate ? '<span class="badge badge-update">UPDATE</span>' : ''}
                ${!isRenewal && !isUpdate ? '<span class="badge badge-new">NEW</span>' : ''}
              </div>
              <div class="info-row">
                <span class="info-label">Entity Name:</span>
                <span class="entity-name">${approval.entityName}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Entity Type:</span>
                <span style="font-weight: 600;">${entityTypeLabel}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Certificate ID:</span>
                <span style="font-family: monospace; font-weight: 600;">${approval.certificateId}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Submitted By:</span>
                <span style="font-weight: 600;">${approval.submitterName || 'Unknown'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Required Approvals:</span>
                <span style="font-weight: 600; color: #11998e; font-size: 16px;">${approval.approvalCount} of ${approval.requiredApprovals}</span>
              </div>
            </div>

            ${approval.pendingEntityData && !approval.entityCreated ? `
              <div class="alert">
                <strong>NOTE:</strong> This ${entityTypeLabel.toLowerCase()} will be created in the system after all approvals are received.
              </div>
            ` : ''}
            
            <p style="margin-top: 30px; color: #555; font-size: 15px; line-height: 1.8;">
              <strong style="color: #11998e; font-size: 16px;">What happens next?</strong><br>
              <span style="display: block; margin-top: 8px;">• Review the certificate details</span>
              <span style="display: block;">• Sign with your MetaMask wallet</span>
              <span style="display: block;">• Once all ${approval.requiredApprovals} admin(s) approve, the certificate will be registered on the blockchain</span>
            </p>
          </div>
          
          <div class="footer">
            <p>This is an automated notification from the RCV Platform.</p>
            <p>Please do not reply to this email.</p>
            <p>&copy; ${new Date().getFullYear()} RCV Platform. All rights reserved.</p>
          </div>
        </body>
        </html>
      `;

      try {
        await sendMail(admin.email, emailSubject, emailHtml);
        console.log(`Approval notification sent to admin: ${admin.email}`);
      } catch (error) {
        console.error(`Failed to send email to ${admin.email}:`, error);
        // Continue with other emails even if one fails
      }
    });

    await Promise.all(emailPromises);
    console.log(`Sent approval notifications to ${admins.length} admin(s)`);
  } catch (error) {
    console.error('Error sending admin notifications:', error);
    // Don't throw - we don't want email failures to block the approval process
  }
}

/**
 * Send email notification to all admins when a certificate is registered on blockchain
 */
export async function notifyAdminsOfBlockchainRegistration(
  approval: CertificateApproval,
  blockchainTxHash: string
): Promise<void> {
  try {
    const admins = await getAdminUsers();

    if (admins.length === 0) {
      console.warn('No admin users found to notify');
      return;
    }

    const blockchainExplorerUrl = process.env.SEPOLIA_EXPLORER_URL 
      ? `${process.env.SEPOLIA_EXPLORER_URL}/tx/${blockchainTxHash}`
      : `https://sepolia.etherscan.io/tx/${blockchainTxHash}`;
    
    const certificateUrl = `${FRONTEND_URL}/certificates/${approval.certificateId}`;
    const entityTypeLabel = approval.entityType === 'product' ? 'Product' : 'Company';
    const isRenewal = approval.isRenewal || approval.pendingEntityData?.isRenewal;
    const isUpdate = approval.pendingEntityData?.isUpdate;

    // Build approvers list for the email
    let approversList = '';
    if (approval.approvers && approval.approvers.length > 0) {
      approversList = approval.approvers.map((approver, index) => {
        const approvalDate = new Date(approver.approvalDate).toLocaleString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
        return `
          <div class="info-row">
            <span class="info-label">Approver ${index + 1}:</span>
            <span>${approver.approverName} (${approvalDate})</span>
          </div>
        `;
      }).join('');
    }

    const emailPromises = admins.map(async (admin) => {
      const emailSubject = `Certificate Successfully Registered on Blockchain - ${approval.entityName}`;
      
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
              color: white;
              padding: 30px;
              border-radius: 10px 10px 0 0;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
            }
            .content {
              background: #ffffff;
              padding: 30px;
              border: 1px solid #e0e0e0;
              border-top: none;
            }
            .success-badge {
              background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
              color: white;
              padding: 12px 24px;
              border-radius: 20px;
              display: inline-block;
              margin: 20px 0;
              font-weight: bold;
              font-size: 16px;
              box-shadow: 0 4px 6px rgba(17, 153, 142, 0.3);
            }
            .info-box {
              background: #e8f5e9;
              border-left: 4px solid #11998e;
              padding: 20px;
              margin: 20px 0;
              border-radius: 4px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            }
            .info-row {
              margin: 12px 0;
              font-size: 15px;
            }
            .info-label {
              font-weight: bold;
              color: #11998e;
              display: inline-block;
              min-width: 150px;
            }
            .entity-name {
              font-size: 18px;
              font-weight: bold;
              color: #11998e;
            }
            .badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 12px;
              font-size: 12px;
              font-weight: bold;
              margin-left: 10px;
            }
            .badge-renewal {
              background: #ff9800;
              color: white;
            }
            .badge-update {
              background: #2196f3;
              color: white;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
              color: white;
              padding: 16px 45px;
              text-decoration: none;
              border-radius: 5px;
              font-weight: bold;
              font-size: 16px;
              margin: 10px 5px;
              text-align: center;
              box-shadow: 0 4px 6px rgba(17, 153, 142, 0.3);
            }
            .button:hover {
              background: linear-gradient(135deg, #0f8578 0%, #32d66f 100%);
              box-shadow: 0 6px 8px rgba(17, 153, 142, 0.4);
            }
            .button-secondary {
              background: linear-gradient(135deg, #2196f3 0%, #1976d2 100%);
              box-shadow: 0 4px 6px rgba(33, 150, 243, 0.3);
            }
            .button-secondary:hover {
              background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
              box-shadow: 0 6px 8px rgba(33, 150, 243, 0.4);
            }
            .hash-box {
              background: #f8f9fa;
              border: 1px solid #dee2e6;
              border-radius: 4px;
              padding: 10px;
              font-family: 'Courier New', monospace;
              font-size: 12px;
              word-break: break-all;
              margin: 10px 0;
            }
            .footer {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 0 0 10px 10px;
              text-align: center;
              font-size: 12px;
              color: #666;
              border: 1px solid #e0e0e0;
              border-top: none;
            }
            .approvers-section {
              background: #e8f5e9;
              border-radius: 4px;
              padding: 20px;
              margin: 20px 0;
              border: 1px solid #c8e6c9;
            }
            .approvers-section strong {
              font-size: 16px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>CERTIFICATE SUCCESSFULLY REGISTERED</h1>
          </div>
          
          <div class="content">
            <p style="font-size: 16px;">Hello <strong>${admin.firstName}</strong>,</p>
            
            <div style="text-align: center;">
              <div class="success-badge">
                BLOCKCHAIN REGISTRATION COMPLETE
              </div>
            </div>
            
            <p style="font-size: 15px; line-height: 1.7;">The <strong>${entityTypeLabel.toLowerCase()}</strong> certificate has been <strong>successfully approved</strong> by all administrators and <strong>registered on the Sepolia blockchain</strong>.</p>
            
            <div class="info-box">
              <div class="info-row">
                <span class="info-label">Entity Name:</span>
                <span class="entity-name">${approval.entityName}</span>
                ${isRenewal ? '<span class="badge badge-renewal">RENEWAL</span>' : ''}
                ${isUpdate ? '<span class="badge badge-update">UPDATE</span>' : ''}
              </div>
              <div class="info-row">
                <span class="info-label">Entity Type:</span>
                <span style="font-weight: 600;">${entityTypeLabel}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Certificate ID:</span>
                <span style="font-family: monospace; font-weight: 600;">${approval.certificateId}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Blockchain Network:</span>
                <span style="font-weight: 600;">Sepolia Testnet</span>
              </div>
            </div>

            <div style="margin: 20px 0;">
              <strong style="color: #11998e; font-size: 16px;">Transaction Hash:</strong>
              <div class="hash-box">
                ${blockchainTxHash}
              </div>
            </div>

            ${approversList ? `
              <div class="approvers-section">
                <strong style="color: #11998e;">Certificate Approvers:</strong>
                ${approversList}
              </div>
            ` : ''}
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="${certificateUrl}" class="button">
                VIEW CERTIFICATE
              </a>
              <a href="${blockchainExplorerUrl}" class="button button-secondary" target="_blank">
                VIEW ON BLOCKCHAIN EXPLORER
              </a>
            </div>
            
            <p style="margin-top: 30px; color: #555; font-size: 15px; line-height: 1.8;">
              <strong style="color: #11998e; font-size: 16px;">What this means:</strong><br>
              <span style="display: block; margin-top: 8px;">• The certificate is now immutably recorded on the blockchain</span>
              <span style="display: block;">• Anyone can verify the certificate authenticity</span>
              <span style="display: block;">• The transaction is publicly visible on the Sepolia network</span>
            </p>
          </div>
          
          <div class="footer">
            <p>This is an automated notification from the RCV Platform.</p>
            <p>Please do not reply to this email.</p>
            <p>&copy; ${new Date().getFullYear()} RCV Platform. All rights reserved.</p>
          </div>
        </body>
        </html>
      `;

      try {
        await sendMail(admin.email, emailSubject, emailHtml);
        console.log(`Blockchain registration notification sent to admin: ${admin.email}`);
      } catch (error) {
        console.error(`Failed to send email to ${admin.email}:`, error);
        // Continue with other emails even if one fails
      }
    });

    await Promise.all(emailPromises);
    console.log(`Sent blockchain registration notifications to ${admins.length} admin(s)`);
  } catch (error) {
    console.error('Error sending blockchain registration notifications:', error);
    // Don't throw - we don't want email failures to block the process
  }
}
