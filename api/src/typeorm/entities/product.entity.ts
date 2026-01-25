import {
  Entity,
  Column,
  ManyToOne,
  PrimaryGeneratedColumn,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Company } from './company.entity';
import { BrandName } from './brandName.entity';
import { ProductClassification } from './productClassification.entity';
import { z } from 'zod';

const coerceDate = (val: unknown) => {
  if (typeof val === 'string') return new Date(val);
  if (val instanceof Date) return val;
  return val;
};

export const ProductValidation = z.object({
  _id: z.string().uuid().optional(),
  LTONumber: z.string().min(2).max(50),
  CFPRNumber: z.string().min(2).max(50),
  lotNumber: z.string().min(2).max(50),
  brandName: z.string().min(2).max(100),
  productName: z.string().min(2).max(100),
  productClassification: z.string().min(1).max(100),
  productSubClassification: z.string().min(1).max(100),
  expirationDate: z.preprocess(coerceDate, z.date()),
  dateOfRegistration: z.preprocess(coerceDate, z.date()),
  registeredById: z.string().uuid(),
  registeredAt: z.preprocess(
    v => (v === undefined ? new Date() : coerceDate(v)),
    z.date()
  ).optional(),
  companyId: z.string().uuid(),
  // Optional entity references for brand and classification
  brandNameId: z.string().uuid().optional(),
  classificationId: z.string().uuid().optional(),
  subClassificationId: z.string().uuid().optional(),
  // Product images (front and back) - captured by System Admin
  productImageFront: z.preprocess(
    v => (v === null || v === '' ? undefined : v),
    z.string().url().optional()
  ),
  productImageBack: z.preprocess(
    v => (v === null || v === '' ? undefined : v),
    z.string().url().optional()
  ),
  // Sepolia blockchain transaction ID
  sepoliaTransactionId: z.string().optional(),
  createdAt: z.preprocess(
    v => (v === undefined ? new Date() : coerceDate(v)),
    z.date()
  ).optional(),
  updatedAt: z.preprocess(
    v => (v === undefined ? new Date() : coerceDate(v)),
    z.date()
  ).optional(),
  isActive: z.preprocess(
    v => (v === undefined ? true : v),
    z.boolean()
  ).optional()
});

@Entity()
export class Product {
  @PrimaryGeneratedColumn('uuid')
  _id!: string;

  @Column()
  LTONumber!: string;

  @Column()
  CFPRNumber!: string;

  @Column()
  lotNumber!: string;

  @Column()
  brandName!: string;

  @Column()
  productName!: string;

  @Column()
  productClassification!: string;

  @Column()
  productSubClassification!: string;

  @Column()
  expirationDate!: Date;

  @Column()
  dateOfRegistration!: Date;

  @ManyToOne(() => User, user => user._id)
  @JoinColumn({ name: 'registeredById' })
  registeredBy!: User;

  @Column()
  registeredById!: string;

  @Column()
  registeredAt!: Date;

  @ManyToOne(() => Company, company => company._id)
  @JoinColumn({ name: 'companyId' })
  company!: Company;

  @Column()
  companyId!: string;

  // Optional entity references for managed brand names and classifications
  @ManyToOne(() => BrandName, brandName => brandName.products, { nullable: true })
  @JoinColumn({ name: 'brandNameId' })
  brandNameEntity?: BrandName;

  @Column({ nullable: true })
  brandNameId?: string;

  @ManyToOne(() => ProductClassification, classification => classification.products, { nullable: true })
  @JoinColumn({ name: 'classificationId' })
  classificationEntity?: ProductClassification;

  @Column({ nullable: true })
  classificationId?: string;

  @ManyToOne(() => ProductClassification, classification => classification.subClassificationProducts, { nullable: true })
  @JoinColumn({ name: 'subClassificationId' })
  subClassificationEntity?: ProductClassification;

  @Column({ nullable: true })
  subClassificationId?: string;

  // Product images (front and back) - captured by System Admin to show how the product should look
  @Column({ nullable: true })
  productImageFront?: string;

  @Column({ nullable: true })
  productImageBack?: string;

  // Sepolia blockchain transaction ID for verification
  @Column({ nullable: true })
  sepoliaTransactionId?: string;

  @Column({ default: false })
  isArchived!: boolean;
}