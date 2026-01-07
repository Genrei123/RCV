import { apiClient } from './axiosConfig';
import { MetaMaskService } from './metaMaskService';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface ApproverRecord {
  approverId: string;
  approverName: string;
  approverWallet: string;
  approvalDate: string;
  signature: string;
}

export interface CertificateApproval {
  _id: string;
  certificateId: string;
  entityType: 'product' | 'company';
  entityId: string;
  entityName: string;
  pdfHash: string;
  pdfUrl?: string;
  status: ApprovalStatus;
  
  // Submitter info
  submittedBy: string;
  submitterName?: string;
  submitterWallet?: string;
  
  // Dynamic approvers array
  approvers: ApproverRecord[];
  
  // First approver (legacy fields for backward compatibility)
  firstApproverId?: string;
  firstApproverName?: string;
  firstApproverWallet?: string;
  firstApprovalDate?: string;
  firstApprovalSignature?: string;
  
  // Second approver (legacy fields for backward compatibility)
  secondApproverId?: string;
  secondApproverName?: string;
  secondApproverWallet?: string;
  secondApprovalDate?: string;
  secondApprovalSignature?: string;
  
  // Blockchain info
  blockchainTxHash?: string;
  blockchainTimestamp?: string;
  blockchainBlockNumber?: number;
  
  // Rejection info
  rejectedBy?: string;
  rejectorName?: string;
  rejectionReason?: string;
  rejectionDate?: string;
  rejectionSignature?: string;
  
  // Resubmission tracking
  submissionVersion?: number;
  previousApprovalId?: string;
  
  createdAt: string;
  updatedAt: string;
  approvalCount: number;
  requiredApprovals: number;
}

export interface ApprovalMessageResponse {
  message: string;
  approvalNumber: number;
  totalRequired: number;
  currentApprovals: number;
  approvers: ApproverRecord[];
  approvalId: string;
  certificateId: string;
  entityName: string;
  pdfHash: string;
}

export interface RejectionMessageResponse {
  message: string;
  approvalId: string;
  certificateId: string;
  entityName: string;
  reason: string;
}

export interface SubmitApprovalInput {
  certificateId: string;
  entityType: 'product' | 'company';
  entityId: string;
  entityName: string;
  pdfHash: string;
  pdfUrl?: string;
  submitterName?: string;
  submitterWallet?: string;
}

export class CertificateApprovalService {
  private static BASE_URL = '/certificate-approval';

  /**
   * Submit a certificate for multi-signature approval
   */
  static async submitForApproval(input: SubmitApprovalInput): Promise<CertificateApproval> {
    const response = await apiClient.post(`${this.BASE_URL}/submit`, input);
    return response.data.data;
  }

  /**
   * Get pending approvals for current user
   */
  static async getPendingApprovals(): Promise<CertificateApproval[]> {
    const response = await apiClient.get(`${this.BASE_URL}/pending`);
    return response.data.data;
  }

  /**
   * Get all pending approvals (admin only)
   */
  static async getAllPendingApprovals(): Promise<CertificateApproval[]> {
    const response = await apiClient.get(`${this.BASE_URL}/pending/all`);
    return response.data.data;
  }

  /**
   * Get current user's approval history
   */
  static async getApprovalHistory(): Promise<CertificateApproval[]> {
    const response = await apiClient.get(`${this.BASE_URL}/history`);
    return response.data.data;
  }

  /**
   * Get approval by ID
   */
  static async getApprovalById(approvalId: string): Promise<CertificateApproval> {
    const response = await apiClient.get(`${this.BASE_URL}/${approvalId}`);
    return response.data.data;
  }

  /**
   * Get approvals by status (admin only)
   */
  static async getApprovalsByStatus(status: ApprovalStatus): Promise<CertificateApproval[]> {
    const response = await apiClient.get(`${this.BASE_URL}/status/${status}`);
    return response.data.data;
  }

  /**
   * Get approvals for a specific certificate
   */
  static async getApprovalsForCertificate(certificateId: string): Promise<CertificateApproval[]> {
    const response = await apiClient.get(`${this.BASE_URL}/certificate/${certificateId}`);
    return response.data.data;
  }

  /**
   * Get the message to sign for approval
   */
  static async getApprovalMessage(approvalId: string): Promise<ApprovalMessageResponse> {
    const response = await apiClient.get(`${this.BASE_URL}/${approvalId}/message`);
    return response.data.data;
  }

  /**
   * Get rejection message to sign
   */
  static async getRejectionMessage(approvalId: string, reason: string): Promise<RejectionMessageResponse> {
    const response = await apiClient.post(`${this.BASE_URL}/${approvalId}/rejection-message`, { reason });
    return response.data.data;
  }

  /**
   * Approve a certificate with MetaMask signature
   * This handles the entire approval flow:
   * 1. Gets the message to sign from the backend
   * 2. Signs the message with MetaMask
   * 3. Submits the approval with signature
   */
  static async approveWithSignature(
    approvalId: string,
    walletAddress: string
  ): Promise<{ approval: CertificateApproval; isFullyApproved: boolean }> {
    // Step 1: Get the message to sign
    const messageData = await this.getApprovalMessage(approvalId);

    // Step 2: Sign the message with MetaMask
    const signature = await MetaMaskService.signMessage(messageData.message, walletAddress);

    // Step 3: Submit the approval
    const response = await apiClient.post(`${this.BASE_URL}/${approvalId}/approve`, { signature });
    
    return {
      approval: response.data.data,
      isFullyApproved: response.data.isFullyApproved
    };
  }

  /**
   * Reject a certificate with MetaMask signature
   * This handles the entire rejection flow:
   * 1. Gets the rejection message from the backend
   * 2. Signs the message with MetaMask
   * 3. Submits the rejection with signature
   */
  static async rejectWithSignature(
    approvalId: string,
    reason: string,
    walletAddress: string
  ): Promise<CertificateApproval> {
    // Step 1: Get the rejection message
    const messageData = await this.getRejectionMessage(approvalId, reason);

    // Step 2: Sign the message with MetaMask
    const signature = await MetaMaskService.signMessage(messageData.message, walletAddress);

    // Step 3: Submit the rejection
    const response = await apiClient.post(`${this.BASE_URL}/${approvalId}/reject`, {
      reason,
      signature
    });
    
    return response.data.data;
  }

  /**
   * Check if a certificate is fully approved
   */
  static isFullyApproved(approval: CertificateApproval): boolean {
    return approval.status === 'approved' && approval.approvalCount >= approval.requiredApprovals;
  }

  /**
   * Check if current user can approve (hasn't already approved)
   */
  static canUserApprove(approval: CertificateApproval, userId: string): boolean {
    if (approval.status !== 'pending') return false;
    if (approval.submittedBy === userId) return false;
    // Check if user has already approved in the approvers array
    if (approval.approvers?.some(a => a.approverId === userId)) return false;
    // Legacy check
    if (approval.firstApproverId === userId) return false;
    if (approval.secondApproverId === userId) return false;
    return true;
  }

  /**
   * Get approval progress text
   */
  static getApprovalProgressText(approval: CertificateApproval): string {
    if (approval.status === 'rejected') {
      return `Rejected by ${approval.rejectorName || 'Unknown'}`;
    }
    if (approval.status === 'approved') {
      return 'Fully approved - Ready for blockchain';
    }
    return `${approval.approvalCount}/${approval.requiredApprovals} approvals`;
  }

  /**
   * Format date for display
   */
  static formatDate(dateString?: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Register an approved certificate on the blockchain (admin only)
   */
  static async registerOnBlockchain(approvalId: string): Promise<{
    approval: CertificateApproval;
    transaction: {
      txHash: string;
      blockNumber: number;
      etherscanUrl: string;
    };
  }> {
    const response = await apiClient.post(`${this.BASE_URL}/${approvalId}/register`);
    return response.data.data;
  }

  /**
   * Get approved certificates ready for blockchain registration (admin only)
   */
  static async getReadyForBlockchain(): Promise<CertificateApproval[]> {
    const response = await apiClient.get(`${this.BASE_URL}/ready-for-blockchain`);
    return response.data.data;
  }

  /**
   * Check if approval is ready for blockchain registration
   */
  static isReadyForBlockchain(approval: CertificateApproval): boolean {
    return (
      approval.status === 'approved' &&
      approval.approvalCount >= approval.requiredApprovals &&
      !approval.blockchainTxHash
    );
  }

  /**
   * Check if approval is already on blockchain
   */
  static isOnBlockchain(approval: CertificateApproval): boolean {
    return !!approval.blockchainTxHash;
  }

  // ==================== NEW METHODS ====================

  /**
   * Get user's rejected approvals
   */
  static async getMyRejectedApprovals(): Promise<CertificateApproval[]> {
    const response = await apiClient.get(`${this.BASE_URL}/my-rejected`);
    return response.data.data;
  }

  /**
   * Get all submissions made by current user
   */
  static async getMySubmissions(): Promise<CertificateApproval[]> {
    const response = await apiClient.get(`${this.BASE_URL}/my-submissions`);
    return response.data.data;
  }

  /**
   * Get approval status for a specific entity (product or company)
   */
  static async getEntityApprovalStatus(
    entityType: 'product' | 'company',
    entityId: string
  ): Promise<CertificateApproval | null> {
    const response = await apiClient.get(`${this.BASE_URL}/entity/${entityType}/${entityId}`);
    return response.data.data;
  }

  /**
   * Resubmit a rejected certificate with updated info
   */
  static async resubmitCertificate(
    approvalId: string,
    updates?: { pdfHash?: string; pdfUrl?: string }
  ): Promise<CertificateApproval> {
    const response = await apiClient.post(`${this.BASE_URL}/${approvalId}/resubmit`, updates || {});
    return response.data.data;
  }

  /**
   * Get the admin count (required approvals)
   */
  static async getAdminCount(): Promise<{ adminCount: number; requiredApprovals: number }> {
    const response = await apiClient.get(`${this.BASE_URL}/admin-count`);
    return response.data.data;
  }

  /**
   * Check if user is the submitter of an approval
   */
  static isSubmitter(approval: CertificateApproval, userId: string): boolean {
    return approval.submittedBy === userId;
  }

  /**
   * Check if approval can be resubmitted
   */
  static canResubmit(approval: CertificateApproval, userId: string): boolean {
    return approval.status === 'rejected' && approval.submittedBy === userId;
  }

  /**
   * Get list of approvers who have signed
   */
  static getApproversList(approval: CertificateApproval): ApproverRecord[] {
    return approval.approvers || [];
  }

  /**
   * Get remaining approvals needed
   */
  static getRemainingApprovals(approval: CertificateApproval): number {
    return Math.max(0, approval.requiredApprovals - approval.approvalCount);
  }
}
