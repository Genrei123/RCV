import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface ApproverRecord {
  approverId: string;
  approverName: string;
  approverWallet: string;
  approvalDate: string;
  signature: string;
}

@Entity()
export class CertificateApproval {
  @PrimaryGeneratedColumn('uuid')
  _id!: string;

  @Column()
  certificateId!: string;

  @Column({ type: 'enum', enum: ['product', 'company'] })
  entityType!: 'product' | 'company';

  @Column()
  entityId!: string;

  @Column()
  entityName!: string;

  @Column()
  pdfHash!: string;

  @Column({ nullable: true })
  pdfUrl?: string;

  @Column({ type: 'enum', enum: ['pending', 'approved', 'rejected'], default: 'pending' })
  status!: ApprovalStatus;

  // Submitter information
  @Column()
  submittedBy!: string;

  @Column({ nullable: true })
  submitterName?: string;

  @Column({ nullable: true })
  submitterWallet?: string;

  // Array of all approvers (supports dynamic number of admins)
  @Column({ type: 'jsonb', default: [] })
  approvers!: ApproverRecord[];

  // Keep legacy fields for backward compatibility
  // First approver (e.g., Supervisor)
  @Column({ nullable: true })
  firstApproverId?: string;

  @Column({ nullable: true })
  firstApproverName?: string;

  @Column({ nullable: true })
  firstApproverWallet?: string;

  @Column({ nullable: true })
  firstApprovalDate?: Date;

  @Column({ type: 'text', nullable: true })
  firstApprovalSignature?: string;

  // Second approver (e.g., Admin/Director)
  @Column({ nullable: true })
  secondApproverId?: string;

  @Column({ nullable: true })
  secondApproverName?: string;

  @Column({ nullable: true })
  secondApproverWallet?: string;

  @Column({ nullable: true })
  secondApprovalDate?: Date;

  @Column({ type: 'text', nullable: true })
  secondApprovalSignature?: string;

  // Blockchain transaction (only after all approvals)
  @Column({ nullable: true })
  blockchainTxHash?: string;

  @Column({ nullable: true })
  blockchainTimestamp?: Date;

  @Column({ nullable: true })
  blockchainBlockNumber?: number;

  // Rejection information
  @Column({ nullable: true })
  rejectedBy?: string;

  @Column({ nullable: true })
  rejectorName?: string;

  @Column({ type: 'text', nullable: true })
  rejectionReason?: string;

  @Column({ nullable: true })
  rejectionDate?: Date;

  @Column({ type: 'text', nullable: true })
  rejectionSignature?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ type: 'int', default: 0 })
  approvalCount!: number;

  @Column({ type: 'int', default: 2 })
  requiredApprovals!: number;

  // For resubmission tracking
  @Column({ type: 'int', default: 0 })
  submissionVersion!: number;

  @Column({ nullable: true })
  previousApprovalId?: string;

  // Store pending entity data (product/company) until approval is complete
  // This allows the entity to be created ONLY after full approval
  @Column({ type: 'jsonb', nullable: true })
  pendingEntityData?: Record<string, any>;

  // Flag to indicate if entity has been created in the database
  @Column({ default: false })
  entityCreated!: boolean;

  @BeforeInsert()
  assignId() {
    if (!this._id) this._id = uuidv4();
  }
}
