import {
  Entity,
  Column,
  ManyToOne,
  PrimaryGeneratedColumn,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { z } from 'zod';
import { ComplianceStatus, NonComplianceReason } from '../../types/enums';

export const ComplianceReportValidation = z.object({
  _id: z.string().uuid().optional(),
  agentId: z.string().uuid(),
  status: z.nativeEnum(ComplianceStatus),
  isVerified: z.boolean().optional(),
  scannedData: z.record(z.string(), z.any()),
  productSearchResult: z.record(z.string(), z.any()).optional().nullable(),
  nonComplianceReason: z.nativeEnum(NonComplianceReason).optional().nullable(),
  additionalNotes: z.string().max(500).optional().nullable(),
  frontImageUrl: z.string().url(), // Required - always must have front image
  backImageUrl: z.string().url(), // Required - always must have back image
  ocrBlobText: z.string().optional().nullable(), // Raw OCR text blob
  location: z.object({
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    address: z.string().optional(),
  }).optional().nullable(),
  createdAt: z.date().optional(),
});

@Entity()
export class ComplianceReport {
  @PrimaryGeneratedColumn('uuid')
  _id!: string;

  @ManyToOne(() => User, user => user._id)
  @JoinColumn({ name: 'agentId' })
  agent!: User;

  @Column()
  agentId!: string;

  @Column({
    type: 'enum',
    enum: ComplianceStatus,
    default: ComplianceStatus.COMPLIANT,
  })
  status!: ComplianceStatus;

  // Whether the report has been verified/resolved by admin
  @Column({ type: 'boolean', default: false })
  isVerified!: boolean;

  // Store the OCR scanned data
  @Column({ type: 'json' })
  scannedData!: Record<string, any>;

  // Store the product search result (if found in database)
  @Column({ type: 'json', nullable: true })
  productSearchResult?: Record<string, any> | null;

  // Reason for non-compliance
  @Column({
    type: 'enum',
    enum: NonComplianceReason,
    nullable: true,
  })
  nonComplianceReason?: NonComplianceReason | null;

  // Additional notes from agent
  @Column({ type: 'text', nullable: true })
  additionalNotes?: string | null;

  // Raw OCR text blob (automatically saved, read-only)
  @Column({ type: 'text', nullable: true })
  ocrBlobText?: string | null;

  // Firebase Storage URLs for scanned images (REQUIRED - always must have both)
  @Column({ type: 'varchar', length: 500 })
  frontImageUrl!: string;

  @Column({ type: 'varchar', length: 500 })
  backImageUrl!: string;

  // Location where scan was performed
  @Column({ type: 'json', nullable: true })
  location?: {
    latitude?: number;
    longitude?: number;
    address?: string;
  } | null;

  @CreateDateColumn()
  createdAt!: Date;
}
