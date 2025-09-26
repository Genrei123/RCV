import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('audit_trails')
export class AuditTrail {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  userId!: string;

  @Column()
  action!: string;

  @Column()
  type!: string;

  @Column('text', { nullable: true })
  details?: string;

  @CreateDateColumn()
  timestamp!: Date;

  // Relationship with User entity
  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user?: User;

  // Additional fields for tracking
  @Column({ nullable: true })
  ipAddress?: string;

  @Column({ nullable: true })
  userAgent?: string;

  @Column({ nullable: true })
  location?: string;

  constructor(
    userId: string,
    action: string,
    type: string,
    details?: string,
    ipAddress?: string,
    userAgent?: string,
    location?: string
  ) {
    this.userId = userId;
    this.action = action;
    this.type = type;
    this.details = details;
    this.ipAddress = ipAddress;
    this.userAgent = userAgent;
    this.location = location;
  }
}