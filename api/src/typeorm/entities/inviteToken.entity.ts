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

  // Target employee email - who the invite is for
  @Column({ nullable: true })
  employeeEmail?: string;

  // Personalized message from owner
  @Column({ type: 'text', nullable: true })
  personalMessage?: string;

  // Pre-set permissions
  @Column({ type: 'boolean', default: false })
  hasWebAccess!: boolean;

  @Column({ type: 'boolean', default: false })
  hasAppAccess!: boolean;

  @Column({ type: 'boolean', default: false })
  hasKioskAccess!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt?: Date;

  @Column({ type: 'boolean', default: false })
  used!: boolean;

  // Track if email was sent
  @Column({ type: 'boolean', default: false })
  emailSent!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
}
