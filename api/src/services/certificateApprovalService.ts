import { Repository } from 'typeorm';
import { UserRepo, DB, ProductRepo, CompanyRepo } from '../typeorm/data-source';
import { CertificateApproval, ApprovalStatus } from '../typeorm/entities/certificateApproval.entity';
import { User } from '../typeorm/entities/user.entity';
import { ethers } from 'ethers';
import CustomError from '../utils/CustomError';
import { storePDFHashOnBlockchain, BlockchainTransaction, BlockchainEntityData, BlockchainApprover } from './sepoliaBlockchainService';
import { redisService } from './redisService';

const approvalRepo: Repository<CertificateApproval> = DB.getRepository(CertificateApproval);
const userRepo = UserRepo;

interface SubmitCertificateInput {
  certificateId: string;
  entityType: 'product' | 'company';
  entityId?: string; // Optional - will be created after approval
  entityName: string;
  pdfHash: string;
  pdfUrl?: string;
  submittedBy: string;
  submitterName?: string;
  submitterWallet?: string;
  // NEW: Store pending entity data to be created after full approval
  pendingEntityData?: Record<string, any>;
}

interface ProcessApprovalInput {
  approvalId: string;
  approverId: string;
  signature: string;
  timestamp?: string; // Timestamp from the signed message
}

interface RejectCertificateInput {
  approvalId: string;
  rejectorId: string;
  reason: string;
  signature: string;
  timestamp?: string; // Timestamp from the signed message
}

/**
 * Create the pending entity (product or company) after full approval
 * This is called automatically when all required approvals are met
 */
async function createPendingEntity(approval: CertificateApproval): Promise<string | null> {
  if (!approval.pendingEntityData || approval.entityCreated) {
    console.log('Entity already created or no pending data:', approval._id);
    return approval.entityId !== 'pending' ? approval.entityId : null;
  }

  console.log(`Creating pending ${approval.entityType} entity for approval:`, approval._id);

  try {
    if (approval.entityType === 'product') {
      // Create the product
      const productData = {
        ...approval.pendingEntityData,
        registeredAt: new Date(),
      };
      
      const savedProduct = await ProductRepo.save(productData);
      console.log('Product created successfully:', savedProduct._id);
      return savedProduct._id;
      
    } else if (approval.entityType === 'company') {
      // Create the company
      const companyData = approval.pendingEntityData;
      const savedCompany = await CompanyRepo.save(companyData);
      console.log('Company created successfully:', savedCompany._id);
      return savedCompany._id;
    }

    return null;
  } catch (error) {
    console.error('Failed to create pending entity:', error);
    throw new CustomError(500, `Failed to create ${approval.entityType}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get the count of all admin users with authorized wallets
 */
export async function getAdminCount(): Promise<number> {
  const adminCount = await userRepo.count({
    where: {
      role: 'ADMIN',
      walletAuthorized: true,
    },
  });
  return adminCount;
}

/**
 * Get all admin user IDs
 */
export async function getAdminUserIds(): Promise<string[]> {
  const admins = await userRepo.find({
    where: {
      role: 'ADMIN',
      walletAuthorized: true,
    },
    select: ['_id'],
  });
  return admins.map(a => a._id);
}

/**
 * Submit a certificate for multi-signature approval
 * Requires ALL admins to approve before blockchain registration
 * If the submitter is an admin with an authorized wallet, their submission counts as the first approval
 */
export async function submitCertificateForApproval(input: SubmitCertificateInput): Promise<CertificateApproval> {
  // Check if there's already a pending approval for this certificate
  const existingApproval = await approvalRepo.findOne({
    where: {
      certificateId: input.certificateId,
      status: 'pending' as ApprovalStatus,
    },
  });

  if (existingApproval) {
    throw new CustomError(400, 'A pending approval already exists for this certificate');
  }

  // Get the count of all admins - all must approve
  const adminCount = await getAdminCount();
  
  // Must have at least 1 admin, default to 2 if none configured
  const requiredApprovals = Math.max(adminCount, 1);

  // Check if the submitter is an admin with an authorized wallet
  // If so, their submission counts as the first approval
  const submitter = await userRepo.findOne({
    where: { _id: input.submittedBy },
  });

  const isSubmitterAdmin = submitter?.role === 'ADMIN' && submitter?.walletAuthorized && submitter?.walletAddress;
  
  // Initialize approvers array and count
  let initialApprovers: any[] = [];
  let initialApprovalCount = 0;

  // If submitter is an admin, automatically count their submission as the first approval
  if (isSubmitterAdmin && input.submitterWallet) {
    initialApprovers = [{
      approverId: submitter._id,
      approverName: input.submitterName || `${submitter.firstName} ${submitter.lastName}`,
      approverWallet: input.submitterWallet,
      approvalDate: new Date().toISOString(),
      signature: 'submission-auto-approval', // Marker for auto-approval on submission
    }];
    initialApprovalCount = 1;
    console.log(`Submitter ${submitter.email} is an admin - counting as first approval (1/${requiredApprovals})`);
  }

  const approval = approvalRepo.create({
    certificateId: input.certificateId,
    entityType: input.entityType,
    entityId: input.entityId || 'pending', // Will be updated after entity is created
    entityName: input.entityName,
    pdfHash: input.pdfHash,
    pdfUrl: input.pdfUrl,
    status: 'pending',
    submittedBy: input.submittedBy,
    submitterName: input.submitterName,
    submitterWallet: input.submitterWallet,
    pendingEntityData: input.pendingEntityData, // Store entity data for creation after approval
    entityCreated: false, // Entity will be created after full approval
    approvers: initialApprovers,
    approvalCount: initialApprovalCount,
    requiredApprovals,
    // Also set legacy first approver fields if submitter is admin
    ...(isSubmitterAdmin && input.submitterWallet ? {
      firstApproverId: submitter._id,
      firstApproverName: input.submitterName || `${submitter.firstName} ${submitter.lastName}`,
      firstApproverWallet: input.submitterWallet,
      firstApprovalDate: new Date(),
      firstApprovalSignature: 'submission-auto-approval',
    } : {}),
  });

  // Check if already fully approved (in case only 1 admin required and submitter is admin)
  if (approval.approvalCount >= approval.requiredApprovals) {
    approval.status = 'approved';
    console.log('Certificate auto-approved - submitter is the only required admin');
    
    // Create the entity since it's fully approved
    if (approval.pendingEntityData && !approval.entityCreated) {
      const createdEntityId = await createPendingEntity(approval);
      if (createdEntityId) {
        approval.entityId = createdEntityId;
        approval.entityCreated = true;
      }
    }

    // ============ AUTOMATIC BLOCKCHAIN REGISTRATION (Auto-approval case) ============
    console.log('Auto-approved - registering on blockchain...');
    try {
      const blockchainTx = await storePDFHashOnBlockchain(
        approval.pdfHash,
        approval.certificateId,
        approval.entityType,
        approval.entityName
      );

      if (blockchainTx) {
        approval.blockchainTxHash = blockchainTx.txHash;
        approval.blockchainTimestamp = blockchainTx.timestamp;
        approval.blockchainBlockNumber = blockchainTx.blockNumber;
        console.log(`Blockchain registration successful! Tx Hash: ${blockchainTx.txHash}`);

        // Also update the entity with the transaction ID
        if (approval.entityId && approval.entityId !== 'pending') {
          if (approval.entityType === 'product') {
            await ProductRepo.update(approval.entityId, {
              sepoliaTransactionId: blockchainTx.txHash,
            });
            // Invalidate products cache
            try {
              await redisService.invalidateProductsCache();
            } catch (cacheError) {
              console.warn('Failed to invalidate products cache:', cacheError);
            }
          } else if (approval.entityType === 'company') {
            await CompanyRepo.update(approval.entityId, {
              sepoliaTransactionId: blockchainTx.txHash,
            });
            // Invalidate companies cache
            try {
              await redisService.invalidateCompaniesCache();
            } catch (cacheError) {
              console.warn('Failed to invalidate companies cache:', cacheError);
            }
          }
        }
      }
    } catch (blockchainError) {
      console.error('Failed to register on blockchain:', blockchainError);
    }
  }

  return await approvalRepo.save(approval);
}

/**
 * Verify that a signature is valid for the given message and wallet address
 */
export function verifyApprovalSignature(
  message: string,
  signature: string,
  expectedWalletAddress: string
): boolean {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === expectedWalletAddress.toLowerCase();
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}

/**
 * Generate the approval message that must be signed
 * @param approval - The approval record
 * @param approvalNumber - The current approval number (1, 2, etc.)
 * @param totalRequired - Total approvals required
 * @param timestamp - Optional timestamp to use (for verification, must match the signed message)
 */
export function generateApprovalMessage(
  approval: CertificateApproval, 
  approvalNumber: number, 
  totalRequired: number,
  timestamp?: string
): string {
  // Use provided timestamp or generate new one
  const messageTimestamp = timestamp || new Date().toISOString();
  
  return `I approve this certificate registration on RCV Blockchain

Certificate ID: ${approval.certificateId}
Entity: ${approval.entityName} (${approval.entityType})
PDF Hash: ${approval.pdfHash}
Approval: ${approvalNumber} of ${totalRequired} required
Timestamp: ${messageTimestamp}`;
}

/**
 * Process an approval from an authorized admin user
 * Supports dynamic number of required approvals (all admins must approve)
 */
export async function processApproval(input: ProcessApprovalInput): Promise<CertificateApproval> {
  const approval = await approvalRepo.findOne({
    where: { _id: input.approvalId },
  });

  if (!approval) {
    throw new CustomError(404, 'Approval request not found');
  }

  if (approval.status !== 'pending') {
    throw new CustomError(400, `Cannot approve a certificate that is already ${approval.status}`);
  }

  // Get approver information
  const approver = await userRepo.findOne({
    where: { _id: input.approverId },
  });

  if (!approver) {
    throw new CustomError(404, 'Approver not found');
  }

  if (!approver.walletAuthorized || !approver.walletAddress) {
    throw new CustomError(403, 'Approver does not have an authorized wallet');
  }

  // Check approver role - must be ADMIN
  if (approver.role !== 'ADMIN') {
    throw new CustomError(403, 'Only Admins can approve certificates');
  }

  // Check that this user hasn't already approved (check in approvers array)
  const hasAlreadyApproved = approval.approvers?.some(
    a => a.approverId === input.approverId
  );
  
  if (hasAlreadyApproved) {
    throw new CustomError(400, 'You have already approved this certificate');
  }

  // Also check legacy fields for backward compatibility
  if (approval.firstApproverId === input.approverId || approval.secondApproverId === input.approverId) {
    throw new CustomError(400, 'You have already approved this certificate');
  }

  // Calculate the next approval number
  const currentApprovalCount = approval.approvers?.length || 0;
  const nextApprovalNumber = currentApprovalCount + 1;

  // Generate and verify the signature using the same timestamp that was signed
  // If no timestamp provided, this will fail for signatures created with the new flow
  const expectedMessage = generateApprovalMessage(
    approval, 
    nextApprovalNumber, 
    approval.requiredApprovals,
    input.timestamp // Use the timestamp from the signed message
  );
  
  console.log('=== Signature Verification Debug ===');
  console.log('Approver ID:', input.approverId);
  console.log('Approver Email:', approver.email);
  console.log('Approver Wallet (from DB):', approver.walletAddress);
  console.log('Timestamp used:', input.timestamp);
  console.log('Expected Message:', expectedMessage);
  
  // IMPORTANT: Recover the actual signer address from the signature to help debug
  let recoveredAddress: string | null = null;
  try {
    recoveredAddress = ethers.verifyMessage(expectedMessage, input.signature);
    console.log('Recovered address from signature:', recoveredAddress);
    console.log('Wallet match:', recoveredAddress.toLowerCase() === approver.walletAddress?.toLowerCase());
  } catch (e) {
    console.error('Failed to recover address:', e);
  }
  
  const isValidSignature = verifyApprovalSignature(
    expectedMessage,
    input.signature,
    approver.walletAddress
  );

  if (!isValidSignature) {
    console.error('Signature verification failed!');
    console.error('Signature:', input.signature);
    console.error('');
    console.error('=== WALLET MISMATCH DETECTED ===');
    console.error(`The signature was created by: ${recoveredAddress}`);
    console.error(`But the database shows this user's wallet as: ${approver.walletAddress}`);
    console.error('The user needs to have their correct MetaMask wallet address saved in the database.');
    console.error('An Admin should update this user\'s wallet address in User Management.');
    throw new CustomError(400, `Invalid signature - wallet mismatch. Your connected MetaMask wallet (${recoveredAddress?.slice(0, 10)}...) doesn't match your registered wallet (${approver.walletAddress?.slice(0, 10)}...). Please ask an Admin to update your wallet address.`);
  }
  
  console.log('Signature verified successfully!');

  // Add to approvers array
  const newApprover = {
    approverId: approver._id,
    approverName: `${approver.firstName} ${approver.lastName}`,
    approverWallet: approver.walletAddress,
    approvalDate: new Date().toISOString(),
    signature: input.signature,
  };

  if (!approval.approvers) {
    approval.approvers = [];
  }
  approval.approvers.push(newApprover);
  approval.approvalCount = approval.approvers.length;

  // Also update legacy fields for backward compatibility
  if (approval.approvalCount === 1) {
    approval.firstApproverId = approver._id;
    approval.firstApproverName = `${approver.firstName} ${approver.lastName}`;
    approval.firstApproverWallet = approver.walletAddress;
    approval.firstApprovalDate = new Date();
    approval.firstApprovalSignature = input.signature;
  } else if (approval.approvalCount === 2) {
    approval.secondApproverId = approver._id;
    approval.secondApproverName = `${approver.firstName} ${approver.lastName}`;
    approval.secondApproverWallet = approver.walletAddress;
    approval.secondApprovalDate = new Date();
    approval.secondApprovalSignature = input.signature;
  }

  // Check if all required approvals are met
  if (approval.approvalCount >= approval.requiredApprovals) {
    approval.status = 'approved';
    
    // ============ CREATE ENTITY AFTER FULL APPROVAL ============
    // If there's pending entity data, create the entity now
    if (approval.pendingEntityData && !approval.entityCreated) {
      console.log('Full approval received - creating entity from pending data');
      const createdEntityId = await createPendingEntity(approval);
      
      if (createdEntityId) {
        approval.entityId = createdEntityId;
        approval.entityCreated = true;
        console.log(`Entity created with ID: ${createdEntityId}`);
      }
    }

    // ============ AUTOMATIC BLOCKCHAIN REGISTRATION ============
    // Register the certificate on the Sepolia blockchain
    console.log('All approvals received - registering on blockchain...');
    try {
      // Build entity data for blockchain storage (allows full recovery)
      let entityData: BlockchainEntityData | undefined;
      
      if (approval.pendingEntityData) {
        if (approval.entityType === 'product') {
          // Get company info if available
          let companyName: string | undefined;
          let companyLicense: string | undefined;
          if (approval.pendingEntityData.companyId) {
            const company = await CompanyRepo.findOne({
              where: { _id: approval.pendingEntityData.companyId }
            });
            if (company) {
              companyName = company.name;
              companyLicense = company.licenseNumber;
            }
          }
          
          entityData = {
            LTONumber: approval.pendingEntityData.LTONumber,
            CFPRNumber: approval.pendingEntityData.CFPRNumber,
            lotNumber: approval.pendingEntityData.lotNumber,
            brandName: approval.pendingEntityData.brandName,
            productName: approval.pendingEntityData.productName,
            productClassification: approval.pendingEntityData.productClassification,
            productSubClassification: approval.pendingEntityData.productSubClassification,
            expirationDate: approval.pendingEntityData.expirationDate?.toString(),
            companyName,
            companyLicense,
            // Include product images for recovery
            productImageFront: approval.pendingEntityData.productImageFront,
            productImageBack: approval.pendingEntityData.productImageBack
          };
        } else {
          entityData = {
            address: approval.pendingEntityData.address,
            licenseNumber: approval.pendingEntityData.licenseNumber,
            phone: approval.pendingEntityData.phone,
            email: approval.pendingEntityData.email,
            businessType: approval.pendingEntityData.businessType
          };
        }
      }
      
      // Build approvers list for blockchain storage
      const blockchainApprovers: BlockchainApprover[] = approval.approvers?.map(a => ({
        wallet: a.approverWallet,
        name: a.approverName,
        date: a.approvalDate
      })) || [];
      
      const blockchainTx = await storePDFHashOnBlockchain(
        approval.pdfHash,
        approval.certificateId,
        approval.entityType,
        approval.entityName,
        entityData,
        blockchainApprovers
      );

      if (blockchainTx) {
        approval.blockchainTxHash = blockchainTx.txHash;
        approval.blockchainTimestamp = blockchainTx.timestamp;
        approval.blockchainBlockNumber = blockchainTx.blockNumber;
        console.log(`Blockchain registration successful! Tx Hash: ${blockchainTx.txHash}`);

        // Also update the entity (Product/Company) with the transaction ID
        if (approval.entityId && approval.entityId !== 'pending') {
          if (approval.entityType === 'product') {
            await ProductRepo.update(approval.entityId, {
              sepoliaTransactionId: blockchainTx.txHash,
            });
            console.log(`Product ${approval.entityId} updated with transaction ID`);
            // Invalidate products cache so fresh data is fetched
            try {
              await redisService.invalidateProductsCache();
              console.log('Products cache invalidated');
            } catch (cacheError) {
              console.warn('Failed to invalidate products cache:', cacheError);
            }
          } else if (approval.entityType === 'company') {
            await CompanyRepo.update(approval.entityId, {
              sepoliaTransactionId: blockchainTx.txHash,
            });
            console.log(`Company ${approval.entityId} updated with transaction ID`);
            // Invalidate companies cache so fresh data is fetched
            try {
              await redisService.invalidateCompaniesCache();
              console.log('Companies cache invalidated');
            } catch (cacheError) {
              console.warn('Failed to invalidate companies cache:', cacheError);
            }
          }
        }
      } else {
        console.warn('Blockchain registration returned null - transaction may have failed');
      }
    } catch (blockchainError) {
      // Log the error but don't fail the approval - blockchain can be retried
      console.error('Failed to register on blockchain:', blockchainError);
      // The approval is still marked as approved, blockchain registration can be retried manually
    }
  }

  return await approvalRepo.save(approval);
}

/**
 * Reject a certificate approval request
 */
export async function rejectCertificate(input: RejectCertificateInput): Promise<CertificateApproval> {
  const approval = await approvalRepo.findOne({
    where: { _id: input.approvalId },
  });

  if (!approval) {
    throw new CustomError(404, 'Approval request not found');
  }

  if (approval.status !== 'pending') {
    throw new CustomError(400, `Cannot reject a certificate that is already ${approval.status}`);
  }

  // Get rejector information
  const rejector = await userRepo.findOne({
    where: { _id: input.rejectorId },
  });

  if (!rejector) {
    throw new CustomError(404, 'User not found');
  }

  if (!rejector.walletAuthorized || !rejector.walletAddress) {
    throw new CustomError(403, 'User does not have an authorized wallet');
  }

  // Check rejector role - must be ADMIN
  if (rejector.role !== 'ADMIN') {
    throw new CustomError(403, 'Only Admins can reject certificates');
  }

  // Use provided timestamp or generate new one
  const messageTimestamp = input.timestamp || new Date().toISOString();

  // Generate rejection message and verify signature
  const rejectionMessage = `I reject this certificate registration on RCV Blockchain

Certificate ID: ${approval.certificateId}
Entity: ${approval.entityName} (${approval.entityType})
PDF Hash: ${approval.pdfHash}
Reason: ${input.reason}
Timestamp: ${messageTimestamp}`;

  console.log('=== Rejection Signature Verification Debug ===');
  console.log('Rejector ID:', input.rejectorId);
  console.log('Rejector Email:', rejector.email);
  console.log('Rejector Wallet (from DB):', rejector.walletAddress);
  console.log('Timestamp used:', messageTimestamp);
  
  // Recover the actual signer address for debugging
  let recoveredAddress: string | null = null;
  try {
    recoveredAddress = ethers.verifyMessage(rejectionMessage, input.signature);
    console.log('Recovered address from signature:', recoveredAddress);
  } catch (e) {
    console.error('Failed to recover address:', e);
  }

  const isValidSignature = verifyApprovalSignature(
    rejectionMessage,
    input.signature,
    rejector.walletAddress
  );

  if (!isValidSignature) {
    console.error('Rejection signature verification failed!');
    console.error(`The signature was created by: ${recoveredAddress}`);
    console.error(`But the database shows this user's wallet as: ${rejector.walletAddress}`);
    throw new CustomError(400, `Invalid signature - wallet mismatch. Your connected MetaMask wallet (${recoveredAddress?.slice(0, 10)}...) doesn't match your registered wallet (${rejector.walletAddress?.slice(0, 10)}...). Please ask an Admin to update your wallet address.`);
  }

  approval.status = 'rejected';
  approval.rejectedBy = rejector._id;
  approval.rejectorName = `${rejector.firstName} ${rejector.lastName}`;
  approval.rejectionReason = input.reason;
  approval.rejectionDate = new Date();
  approval.rejectionSignature = input.signature;

  return await approvalRepo.save(approval);
}

/**
 * Get all pending approvals
 */
export async function getPendingApprovals(userId?: string): Promise<CertificateApproval[]> {
  const query = approvalRepo.createQueryBuilder('approval')
    .where('approval.status = :status', { status: 'pending' })
    .orderBy('approval.createdAt', 'DESC');

  // If userId provided, exclude approvals where user is the submitter
  // or has already approved (for first approval cases)
  if (userId) {
    query.andWhere('approval.submittedBy != :userId', { userId })
      .andWhere('(approval.firstApproverId IS NULL OR approval.firstApproverId != :userId)', { userId });
  }

  return await query.getMany();
}

/**
 * Get approval by ID
 */
export async function getApprovalById(approvalId: string): Promise<CertificateApproval | null> {
  return await approvalRepo.findOne({
    where: { _id: approvalId },
  });
}

/**
 * Get approvals by status
 */
export async function getApprovalsByStatus(status: ApprovalStatus): Promise<CertificateApproval[]> {
  return await approvalRepo.find({
    where: { status },
    order: { createdAt: 'DESC' },
  });
}

/**
 * Get approvals for a specific certificate
 */
export async function getApprovalsForCertificate(certificateId: string): Promise<CertificateApproval[]> {
  return await approvalRepo.find({
    where: { certificateId },
    order: { createdAt: 'DESC' },
  });
}

/**
 * Update approval with blockchain transaction details after successful registration
 */
export async function updateApprovalWithBlockchainTx(
  approvalId: string,
  txHash: string,
  blockNumber: number
): Promise<CertificateApproval> {
  const approval = await approvalRepo.findOne({
    where: { _id: approvalId },
  });

  if (!approval) {
    throw new CustomError(404, 'Approval not found');
  }

  approval.blockchainTxHash = txHash;
  approval.blockchainTimestamp = new Date();
  approval.blockchainBlockNumber = blockNumber;

  return await approvalRepo.save(approval);
}

/**
 * Check if a certificate has been fully approved
 */
export async function isCertificateFullyApproved(certificateId: string): Promise<boolean> {
  const approval = await approvalRepo.findOne({
    where: {
      certificateId,
      status: 'approved' as ApprovalStatus,
    },
  });

  return !!approval && approval.approvalCount >= approval.requiredApprovals;
}

/**
 * Get user's approval history (as approver)
 */
export async function getUserApprovalHistory(userId: string): Promise<CertificateApproval[]> {
  return await approvalRepo.find({
    where: [
      { firstApproverId: userId },
      { secondApproverId: userId },
      { rejectedBy: userId },
    ],
    order: { updatedAt: 'DESC' },
  });
}

/**
 * Register a fully-approved certificate on the blockchain
 * This should only be called after a certificate has received all required approvals
 */
export async function registerApprovedCertificateOnBlockchain(
  approvalId: string
): Promise<{ approval: CertificateApproval; transaction: BlockchainTransaction | null }> {
  const approval = await approvalRepo.findOne({
    where: { _id: approvalId },
  });

  if (!approval) {
    throw new CustomError(404, 'Approval not found');
  }

  if (approval.status !== 'approved') {
    throw new CustomError(400, 'Certificate is not fully approved');
  }

  if (approval.approvalCount < approval.requiredApprovals) {
    throw new CustomError(400, 'Certificate has not received all required approvals');
  }

  if (approval.blockchainTxHash) {
    throw new CustomError(400, 'Certificate is already registered on blockchain');
  }

  // Store on blockchain
  const transaction = await storePDFHashOnBlockchain(
    approval.pdfHash,
    approval.certificateId,
    approval.entityType,
    approval.entityName
  );

  if (!transaction) {
    throw new CustomError(500, 'Failed to register certificate on blockchain');
  }

  // Update approval with blockchain info
  approval.blockchainTxHash = transaction.txHash;
  approval.blockchainTimestamp = transaction.timestamp;
  approval.blockchainBlockNumber = transaction.blockNumber;

  const updatedApproval = await approvalRepo.save(approval);

  return { approval: updatedApproval, transaction };
}

/**
 * Get fully approved certificates that are ready for blockchain registration
 */
export async function getApprovedCertificatesReadyForBlockchain(): Promise<CertificateApproval[]> {
  return await approvalRepo
    .createQueryBuilder('approval')
    .where('approval.status = :status', { status: 'approved' })
    .andWhere('approval.blockchainTxHash IS NULL')
    .andWhere('approval.approvalCount >= approval.requiredApprovals')
    .orderBy('approval.updatedAt', 'ASC')
    .getMany();
}

/**
 * Resubmit a rejected certificate for approval
 * Creates a new approval request linked to the previous one
 */
export async function resubmitRejectedCertificate(
  previousApprovalId: string,
  updatedPdfHash?: string,
  updatedPdfUrl?: string
): Promise<CertificateApproval> {
  const previousApproval = await approvalRepo.findOne({
    where: { _id: previousApprovalId },
  });

  if (!previousApproval) {
    throw new CustomError(404, 'Previous approval not found');
  }

  if (previousApproval.status !== 'rejected') {
    throw new CustomError(400, 'Can only resubmit rejected certificates');
  }

  // Get the count of all admins - all must approve
  const adminCount = await getAdminCount();
  const requiredApprovals = Math.max(adminCount, 1);

  const newApproval = approvalRepo.create({
    certificateId: previousApproval.certificateId,
    entityType: previousApproval.entityType,
    entityId: previousApproval.entityId,
    entityName: previousApproval.entityName,
    pdfHash: updatedPdfHash || previousApproval.pdfHash,
    pdfUrl: updatedPdfUrl || previousApproval.pdfUrl,
    status: 'pending',
    submittedBy: previousApproval.submittedBy,
    submitterName: previousApproval.submitterName,
    submitterWallet: previousApproval.submitterWallet,
    approvalCount: 0,
    requiredApprovals,
    approvers: [],
    submissionVersion: (previousApproval.submissionVersion || 0) + 1,
    previousApprovalId: previousApproval._id,
  });

  return await approvalRepo.save(newApproval);
}

/**
 * Get rejected approvals for a specific submitter
 */
export async function getRejectedApprovalsForSubmitter(submitterId: string): Promise<CertificateApproval[]> {
  return await approvalRepo.find({
    where: {
      submittedBy: submitterId,
      status: 'rejected' as ApprovalStatus,
    },
    order: { updatedAt: 'DESC' },
  });
}

/**
 * Get approval status for an entity (product or company)
 */
export async function getApprovalStatusForEntity(
  entityId: string,
  entityType: 'product' | 'company'
): Promise<CertificateApproval | null> {
  // Get the most recent approval for this entity
  return await approvalRepo.findOne({
    where: { entityId, entityType },
    order: { createdAt: 'DESC' },
  });
}

/**
 * Get all approvals submitted by a user
 */
export async function getSubmittedApprovals(submitterId: string): Promise<CertificateApproval[]> {
  return await approvalRepo.find({
    where: { submittedBy: submitterId },
    order: { createdAt: 'DESC' },
  });
}
