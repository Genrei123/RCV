import {
  Entity,
  Column,
  ManyToOne,
  PrimaryGeneratedColumn,
  JoinColumn,
} from 'typeorm';
import { ProductSubClassification, ProductType } from '../../types/enums';
import { User } from './user.entity';
import { Company } from './company.entity';
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
  productClassification: z.nativeEnum(ProductType),
  productSubClassification: z.nativeEnum(ProductSubClassification),
  expirationDate: z.preprocess(coerceDate, z.date()),
  dateOfRegistration: z.preprocess(coerceDate, z.date()),
  registeredById: z.string().uuid(),
  registeredAt: z.preprocess(
    v => (v === undefined ? new Date() : coerceDate(v)),
    z.date()
  ).optional(),
  companyId: z.string().uuid(),
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

  @Column({ type: 'enum', enum: ProductType })
  productClassification!: ProductType;

  @Column({ type: 'enum', enum: ProductSubClassification })
  productSubClassification!: ProductSubClassification;

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
}