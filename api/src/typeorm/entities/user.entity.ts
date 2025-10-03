import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Roles } from '../../types/enums';
import { z } from 'zod';

// Helper to coerce date strings
const coerceDate = (val: unknown) =>
  typeof val === 'string' ? new Date(val) : val;

// Helper to normalize role (accept string or numeric)
const normalizeRole = (val: unknown) => {
  if (typeof val === 'string') {
    // Match either exact enum key or value
    if ((Roles as any)[val] !== undefined) {
      return (Roles as any)[val];
    }
    // Try case-insensitive match
    const matched = Object.keys(Roles).find(
      k => k.toLowerCase() === val.toLowerCase()
    );
    if (matched) return (Roles as any)[matched];
  }
  return val;
};

export const UserValidation = z.object({
  id: z.string().uuid().optional(),
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  middleName: z.string().min(2).max(50),
  fullName: z.string().min(3).max(100),
  email: z.string().email().min(5).max(100),
  dateOfBirth: z.preprocess(coerceDate, z.date()),
  phoneNumber: z.string().min(10).max(15),
  password: z.string().min(6).max(100),
  stationedAt: z.string().min(2).max(100).optional(),
  createdAt: z.preprocess(
    v => (v === undefined ? new Date() : coerceDate(v)),
    z.date()
  ).optional(),
  updatedAt: z.preprocess(
    v => (v === undefined ? new Date() : coerceDate(v)),
    z.date()
  ).optional(),
  isActive: z.preprocess(v => (v === undefined ? true : v), z.boolean()).optional(),
  role: z.preprocess(normalizeRole, z.nativeEnum(Roles)).optional()
})
.transform(data => ({
  ...data,
  id: data.id ?? uuidv4(),
  fullName: data.fullName ?? `${data.firstName} ${data.lastName}`.trim(),
  createdAt: data.createdAt ?? new Date(),
  updatedAt: data.updatedAt ?? new Date(),
  isActive: data.isActive ?? true,
  role: data.role ?? Roles.Unverified,
}));

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  _id!: string;

  @Column()
  firstName!: string;

  @Column()
  lastName!: string;

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  @Column({ nullable: true })
  middleName!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  dateOfBirth!: Date;

  @Column()
  phoneNumber!: string;

  @Column()
  password!: string;

  @Column()
  stationedAt!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @BeforeInsert()
  assignId() {
    if (!this._id) this._id = uuidv4();
  }

  @Column({ default: true })
  isActive!: boolean;

  @Column({ type: 'enum', enum: Roles, default: Roles.Unverified })
  role!: Roles;
}