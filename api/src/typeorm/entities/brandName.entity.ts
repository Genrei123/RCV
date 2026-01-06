import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { z } from 'zod';
import { Product } from './product.entity';

export const BrandNameValidation = z.object({
  _id: z.string().uuid().optional(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  isActive: z.preprocess(
    v => (v === undefined ? true : v),
    z.boolean()
  ).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type BrandNameInput = z.infer<typeof BrandNameValidation>;

@Entity()
export class BrandName {
  @PrimaryGeneratedColumn('uuid')
  _id!: string;

  @Column({ unique: true })
  name!: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ default: true })
  isActive!: boolean;

  @OneToMany(() => Product, product => product.brandNameEntity)
  products?: Product[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
