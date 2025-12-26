import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CompanyOwner } from './companyOwner.entity';

@Entity()
export class InviteToken {
  @PrimaryGeneratedColumn('uuid')
  _id!: string;

  @Column()
  token!: string;

  @Column()
  companyOwnerId!: string;

  @ManyToOne(() => CompanyOwner, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'companyOwnerId' })
  companyOwner!: CompanyOwner;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt?: Date;

  @Column({ type: 'boolean', default: false })
  used!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
}
