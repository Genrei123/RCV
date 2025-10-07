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
  status: z.enum(['Archived', 'Active', 'Pending']).default('Pending'),
  avatarUrl: z.string().optional(),
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

  @Column({ type: 'enum', enum: ['Archived', 'Active', 'Pending'], default: 'Pending' })
  status!: 'Archived' | 'Active' | 'Pending';

  @Column({ nullable: true })
  avatarUrl?: string;

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

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @BeforeInsert()
  assignId() {
    if (!this._id) this._id = uuidv4();
  }
}