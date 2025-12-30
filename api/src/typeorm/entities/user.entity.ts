import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

// Helper to coerce date strings
const coerceDate = (val: unknown) =>
  typeof val === 'string' ? new Date(val) : val;

export const UserValidation = z.object({
  _id: z.string().optional(),
  role: z.enum(['AGENT', 'ADMIN', 'USER']).optional(),
  status: z.enum(['Archived', 'Active', 'Pending', 'Rejected']).default('Pending'),
  rejectionReason: z.string().optional(),
  webAccess: z.boolean().optional().default(false),
  appAccess: z.boolean().optional().default(true),
  approved: z.boolean().optional().default(false),
  avatarUrl: z.string().optional(),
  walletAddress: z.string().optional(), // MetaMask wallet address for blockchain operations
  firstName: z.string().min(2).max(50),
  middleName: z.string().min(2).max(50).optional(),
  lastName: z.string().min(2).max(50),
  extName: z.string().max(10).optional(),
  fullName: z.string().min(2).max(150),
  email: z.string().email().min(5).max(100),
  location: z.string().min(2).max(100),
  currentLocation: z.object({
    latitude: z.string(),
    longitude: z.string()
  }).optional(),
  dateOfBirth: z.string(),
  phoneNumber: z.string().min(10).max(15),
  password: z.string().min(6).max(100),
  badgeId: z.string().min(2).max(50),
  createdAt: z.preprocess(
    v => (v === undefined ? new Date() : coerceDate(v)),
    z.date()
  ).optional(),
  updatedAt: z.preprocess(
    v => (v === undefined ? new Date() : coerceDate(v)),
    z.date()
  ).optional()
})

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  _id!: string;

  @Column({ type: 'enum', enum: ['AGENT', 'ADMIN', 'USER'], default: 'AGENT' })
  role!: 'AGENT' | 'ADMIN' | 'USER';

  @Column({ type: 'enum', enum: ['Archived', 'Active', 'Pending', 'Rejected'], default: 'Pending' })
  status!: 'Archived' | 'Active' | 'Pending' | 'Rejected';

  @Column({ nullable: true })
  rejectionReason?: string;

  @Column({ type: 'boolean', default: false })
  webAccess!: boolean;

  @Column({ type: 'boolean', default: true })
  appAccess!: boolean;

  @Column({ type: 'boolean', default: false })
  approved!: boolean;

  @Column({ nullable: true })
  avatarUrl?: string;

  @Column({ nullable: true })
  walletAddress?: string; // MetaMask wallet address for blockchain operations

  @Column()
  firstName!: string;

  @Column({ nullable: true })
  middleName?: string;

  @Column()
  lastName!: string;

  @Column({ nullable: true })
  extName?: string;

  @Column()
  fullName!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ nullable: true, unique: true })
  firebaseUid?: string;

  @Column({ type: 'boolean', default: false })
  emailVerified!: boolean;

  @Column()
  location!: string;

  @Column({ type: 'json', nullable: true })
  currentLocation?: {
    latitude: string;
    longitude: string;
  };

  @Column()
  dateOfBirth!: string;

  @Column()
  phoneNumber!: string;

  @Column()
  password!: string;

  @Column()
  badgeId!: string;

  // Verification documents (from registration)
  @Column({ nullable: true })
  idDocumentUrl?: string;

  @Column({ nullable: true })
  selfieWithIdUrl?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @BeforeInsert()
  assignId() {
    if (!this._id) this._id = uuidv4();
  }
}