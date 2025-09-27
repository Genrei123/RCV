import {
  Entity,
  Column,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ProductSubClassification, ProductType } from '../../types/enums';
import { User } from './user.entity';
import { Company } from './company.entity';
import { z } from 'zod';

// Validation schema for data coming from frontend
export const ProductValidation = z.object({
  LTONumber: z.string().min(2).max(50),
  CFPRNumber: z.string().min(2).max(50),
  lotNumber: z.string().min(2).max(50),
  brandName: z.string().min(2).max(100),
  productName: z.string().min(2).max(100),
  productClassification: z.number().int().min(0).max(3), // Accept numeric values 0-3
  productSubClassification: z.number().int().min(0).max(1), // Accept numeric values 0-1
  expirationDate: z.string().transform((val) => new Date(val)), // Accept string, convert to Date
  dateOfRegistration: z.string().transform((val) => new Date(val)), // Accept string, convert to Date
  companyId: z.string().uuid(), // Accept company ID instead of full Company object
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
  registeredBy!: User;

  @Column()
  registeredAt!: Date;

  @ManyToOne(() => Company, company => company.products)
  company!: Company;
}