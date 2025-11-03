import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { z } from "zod";
import { User } from "./user.entity";

export const AuditLogValidation = z.object({
  action: z.string().min(1, "Action is required"),
  actionType: z.enum([
    'LOGIN',
    'LOGOUT',
    'APPROVE_USER',
    'REJECT_USER',
    'REVOKE_ACCESS',
    'SCAN_PRODUCT',
    'CREATE_USER',
    'UPDATE_USER',
    'DELETE_USER',
    'CREATE_PRODUCT',
    'UPDATE_PRODUCT',
    'DELETE_PRODUCT',
    'UPDATE_PROFILE',
    'CHANGE_PASSWORD',
    'ARCHIVE_ACCOUNT',
    'LOCATION_UPDATE',
    'APP_CLOSED'
  ]),
  userId: z.string().uuid().optional(),
  targetUserId: z.string().uuid().optional(),
  targetProductId: z.string().uuid().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  platform: z.enum(['WEB', 'MOBILE']).default('WEB'),
  location: z.object({
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    address: z.string().optional(),
  }).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type AuditLogInput = z.infer<typeof AuditLogValidation>;

@Entity("audit_logs")
export class AuditLog {
  @PrimaryGeneratedColumn("uuid")
  _id!: string;

  @Column({ type: "varchar", length: 500 })
  action!: string;

  @Column({
    type: "enum",
    enum: [
      'LOGIN',
      'LOGOUT',
      'APPROVE_USER',
      'REJECT_USER',
      'REVOKE_ACCESS',
      'SCAN_PRODUCT',
      'CREATE_USER',
      'UPDATE_USER',
      'DELETE_USER',
      'CREATE_PRODUCT',
      'UPDATE_PRODUCT',
      'DELETE_PRODUCT',
      'UPDATE_PROFILE',
      'CHANGE_PASSWORD',
      'ARCHIVE_ACCOUNT',
      'LOCATION_UPDATE',
      'APP_CLOSED'
    ],
  })
  actionType!: string;

  @Column({ type: "uuid", nullable: true })
  userId!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "userId" })
  user?: User;

  @Column({ type: "uuid", nullable: true })
  targetUserId!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "targetUserId" })
  targetUser?: User;

  @Column({ type: "uuid", nullable: true })
  targetProductId!: string | null;

  @Column({ type: "varchar", length: 45, nullable: true })
  ipAddress!: string | null;

  @Column({ type: "text", nullable: true })
  userAgent!: string | null;

  @Column({
    type: "enum",
    enum: ['WEB', 'MOBILE'],
    default: 'WEB'
  })
  platform!: string;

  @Column({ type: "json", nullable: true })
  location!: {
    latitude?: number;
    longitude?: number;
    address?: string;
  } | null;

  @Column({ type: "json", nullable: true })
  metadata!: Record<string, any> | null;

  @CreateDateColumn()
  createdAt!: Date;
}
