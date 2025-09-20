import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryColumn,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ProductSubClassification, ProductType } from '../../types/enums';
import { User } from './user.entity';
import { Company } from './company.entity';

export const ProductValidation = {

}

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