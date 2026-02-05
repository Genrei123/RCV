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
      const emailSubject = `🔔 ${actionType} Awaiting Your Approval - ${approval.entityName}`;
      
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
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
            .info-box {
              background: #f8f9fa;
              border-left: 4px solid #667eea;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .info-row {
              margin: 10px 0;
            }
            .info-label {
              font-weight: bold;
              color: #667eea;
              display: inline-block;
              min-width: 150px;
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
            .badge-new {
              background: #4caf50;
              color: white;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 15px 40px;
              text-decoration: none;
              border-radius: 5px;
              font-weight: bold;
              margin: 20px 0;
              text-align: center;
            }
            .button:hover {
              background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
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
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🔔 Certificate Approval Required</h1>
          </div>
          
          <div class="content">
            <p>Hello ${admin.firstName},</p>
            
            <p>A ${entityTypeLabel.toLowerCase()} certificate has been submitted and requires your approval.</p>
            
            <div class="info-box">
              <div class="info-row">
                <span class="info-label">Type:</span>
                <span>${actionType}</span>
                ${isRenewal ? '<span class="badge badge-renewal">RENEWAL</span>' : ''}
                ${isUpdate ? '<span class="badge badge-update">UPDATE</span>' : ''}
                ${!isRenewal && !isUpdate ? '<span class="badge badge-new">NEW</span>' : ''}
              </div>
              <div class="info-row">
                <span class="info-label">Entity Name:</span>
                <span>${approval.entityName}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Entity Type:</span>
                <span>${entityTypeLabel}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Certificate ID:</span>
                <span>${approval.certificateId}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Submitted By:</span>
                <span>${approval.submitterName || 'Unknown'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Required Approvals:</span>
                <span>${approval.approvalCount} of ${approval.requiredApprovals}</span>
              </div>
            </div>

            ${approval.pendingEntityData && !approval.entityCreated ? `
              <div class="alert">
                <strong>⚠️ Note:</strong> This ${entityTypeLabel.toLowerCase()} will be created in the system after all approvals are received.
              </div>
            ` : ''}
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="${approvalUrl}" class="button">
                Review & Approve Certificate
              </a>
            </div>
            
            <p style="margin-top: 30px; color: #666; font-size: 14px;">
              <strong>What happens next?</strong><br>
              • Review the certificate details<br>
              • Sign with your MetaMask wallet<br>
              • Once all ${approval.requiredApprovals} admin(s) approve, the certificate will be registered on the blockchain
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
      const emailSubject = `✅ Certificate Registered on Blockchain - ${approval.entityName}`;
      
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
              background: #4caf50;
              color: white;
              padding: 10px 20px;
              border-radius: 20px;
              display: inline-block;
              margin: 20px 0;
              font-weight: bold;
            }
            .info-box {
              background: #f8f9fa;
              border-left: 4px solid #4caf50;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .info-row {
              margin: 10px 0;
            }
            .info-label {
              font-weight: bold;
              color: #4caf50;
              display: inline-block;
              min-width: 150px;
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
              padding: 15px 40px;
              text-decoration: none;
              border-radius: 5px;
              font-weight: bold;
              margin: 10px 5px;
              text-align: center;
            }
            .button-secondary {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
              padding: 15px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>✅ Certificate Successfully Registered</h1>
          </div>
          
          <div class="content">
            <p>Hello ${admin.firstName},</p>
            
            <div style="text-align: center;">
              <div class="success-badge">
                ✓ Blockchain Registration Complete
              </div>
            </div>
            
            <p>The ${entityTypeLabel.toLowerCase()} certificate has been successfully approved by all administrators and registered on the Sepolia blockchain.</p>
            
            <div class="info-box">
              <div class="info-row">
                <span class="info-label">Entity Name:</span>
                <span>${approval.entityName}</span>
                ${isRenewal ? '<span class="badge badge-renewal">RENEWAL</span>' : ''}
                ${isUpdate ? '<span class="badge badge-update">UPDATE</span>' : ''}
              </div>
              <div class="info-row">
                <span class="info-label">Entity Type:</span>
                <span>${entityTypeLabel}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Certificate ID:</span>
                <span>${approval.certificateId}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Blockchain Network:</span>
                <span>Sepolia Testnet</span>
              </div>
            </div>

            <div style="margin: 20px 0;">
              <strong>Transaction Hash:</strong>
              <div class="hash-box">
                ${blockchainTxHash}
              </div>
            </div>

            ${approversList ? `
              <div class="approvers-section">
                <strong style="color: #2e7d32;">📝 Certificate Approvers:</strong>
                ${approversList}
              </div>
            ` : ''}
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="${certificateUrl}" class="button">
                View Certificate
              </a>
              <a href="${blockchainExplorerUrl}" class="button button-secondary" target="_blank">
                View on Blockchain Explorer
              </a>
            </div>
            
            <p style="margin-top: 30px; color: #666; font-size: 14px;">
              <strong>What this means:</strong><br>
              • The certificate is now immutably recorded on the blockchain<br>
              • Anyone can verify the certificate authenticity<br>
              • The transaction is publicly visible on the Sepolia network
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
