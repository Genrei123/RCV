import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

@Entity()
export class AdminInvite {
  @PrimaryGeneratedColumn('uuid')
  _id!: string;

  // The badge ID that must be verified by the potential agent
  @Column()
  badgeId!: string;

  // Email address of the potential agent
  @Column()
  email!: string;

  // Optional message from admin
  @Column({ type: 'text', nullable: true })
  personalMessage?: string;

  // The invite token for the URL
  @Column({ unique: true })
  token!: string;

  // Admin who created this invite
  @Column()
  invitedBy!: string;

  // Admin's name for display
  @Column({ nullable: true })
  invitedByName?: string;

  // Status: pending, badge_verified, registered, approved, rejected, revoked, archived
  @Column({ 
    type: 'enum', 
    enum: ['pending', 'badge_verified', 'registered', 'approved', 'rejected', 'revoked', 'archived'],
    default: 'pending' 
  })
  status!: 'pending' | 'badge_verified' | 'registered' | 'approved' | 'rejected' | 'revoked' | 'archived';

  // User ID once registered (links to User entity)
  @Column({ nullable: true })
  userId?: string;

  // Document URLs for verification
  @Column({ nullable: true })
  idDocumentUrl?: string;

  @Column({ nullable: true })
  selfieWithIdUrl?: string;

  // Rejection reason if rejected
  @Column({ type: 'text', nullable: true })
  rejectionReason?: string;

  // Expiry date for the invite
  @Column({ type: 'timestamp', nullable: true })
  expiresAt?: Date;

  // Whether email was sent
  @Column({ type: 'boolean', default: false })
  emailSent!: boolean;

  // Access permissions to grant
  @Column({ type: 'boolean', default: false })
  webAccess!: boolean;

  @Column({ type: 'boolean', default: true })
  appAccess!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @BeforeInsert()
  assignIdAndToken() {
    if (!this._id) this._id = uuidv4();
    if (!this.token) this.token = uuidv4();
    // Set expiry to 7 days from now
    if (!this.expiresAt) {
      this.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }
  }
}
