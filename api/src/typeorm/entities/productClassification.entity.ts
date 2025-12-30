import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { z } from 'zod';
import { Product } from './product.entity';

export const ProductClassificationValidation = z.object({
  _id: z.string().uuid().optional(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  parentId: z.string().uuid().optional().nullable(),
  isActive: z.preprocess(
    v => (v === undefined ? true : v),
    z.boolean()
  ).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type ProductClassificationInput = z.infer<typeof ProductClassificationValidation>;

@Entity()
export class ProductClassification {
  @PrimaryGeneratedColumn('uuid')
  _id!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  description?: string;

  // Self-referencing relationship for sub-classifications
  @ManyToOne(() => ProductClassification, classification => classification.children, { nullable: true })
  @JoinColumn({ name: 'parentId' })
  parent?: ProductClassification;

  @Column({ nullable: true })
  parentId?: string;

  @OneToMany(() => ProductClassification, classification => classification.parent)
  children?: ProductClassification[];

  @OneToMany(() => Product, product => product.classificationEntity)
  products?: Product[];

  @OneToMany(() => Product, product => product.subClassificationEntity)
  subClassificationProducts?: Product[];

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
