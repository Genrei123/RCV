import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Product } from './product.entity';
import { z } from 'zod';

const coerceDate = (val: unknown) =>
  typeof val === 'string' ? new Date(val) : val;

export const CompanyOwnerValidation = z.object({
  _id: z.string().optional(),
  companyName: z.string().min(2).max(200),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  email: z.string().email(),
  latitude: z.number(),
  longitude: z.number(),
  address: z.string().optional(),
  businessPermitUrl: z.string().url(),
  status: z.enum(['Pending', 'Approved', 'Rejected']).default('Pending'),
  approved: z.boolean().default(false),
  createdAt: z.preprocess(
    v => (v === undefined ? new Date() : coerceDate(v)),
    z.date()
  ).optional(),
  updatedAt: z.preprocess(
    v => (v === undefined ? new Date() : coerceDate(v)),
    z.date()
  ).optional(),
});

@Entity()
export class CompanyOwner {
  @PrimaryGeneratedColumn('uuid')
  _id!: string;

  @Column()
  companyName!: string;

  @Column({ unique: true })
  walletAddress!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ type: 'boolean', default: false })
  emailVerified!: boolean;

  @Column({ nullable: true })
  emailVerificationToken?: string;

  @Column({ nullable: true })
  emailVerificationExpires?: Date;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  latitude!: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  longitude!: number;

  @Column({ nullable: true })
  address?: string;

  @Column()
  businessPermitUrl!: string;

  @Column({ type: 'enum', enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' })
  status!: 'Pending' | 'Approved' | 'Rejected';

  @Column({ type: 'boolean', default: false })
  approved!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => Product, product => product.company)
  products!: Product[];
}
