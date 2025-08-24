import {
  Entity,
  Column,
  PrimaryColumn,
  BeforeInsert,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Agent } from './agent.entity';
import { Product } from './product.entity';

@Entity()
export class Scan {
    @PrimaryColumn()
    id!: string;

    @Column()
    agent!: Agent;

    @CreateDateColumn()
    scannedAt!: Date;

    @Column()
    product!: Product;
}
