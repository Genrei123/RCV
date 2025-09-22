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

export const ProductValidation = z.object({
  id: z.uuidv4(),
  LTONumber: z.string().min(2).max(50),
  CFPRNumber: z.string().min(2).max(50),
  lotNumber: z.string().min(2).max(50),
  brandName: z.string().min(2).max(100),
  productName: z.string().min(2).max(100),
  productClassification: z.enum(ProductType),
  productSubClassification: z.enum(ProductSubClassification),
  expirationDate: z.date(),
  dateOfRegistration: z.date(),
  registeredBy: z.instanceof(User),
  registeredAt: z.date(),
  company: z.instanceof(Company),
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