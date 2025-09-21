import {
  Entity,
  Column,
  PrimaryColumn,
  BeforeInsert,
  CreateDateColumn,
  UpdateDateColumn,
  ViewColumn,
  ViewEntity,
  DataSource,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Roles } from '../../types/enums';
import { email, z } from 'zod';
import { get } from 'http';

export const UserValidation = z.object({
  id: z.uuidv4(),
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  middleName: z.string().min(2).max(50).optional(),
  fullName: z.string().min(3).max(100),
  email: z.email().min(5).max(100),
  dateOfBirth: z.date(),
  phoneNumber: z.string().min(10).max(15),
  password: z.string().min(6).max(100),
  stationedAt: z.string().min(2).max(100),
  createdAt: z.date(),
  updatedAt: z.date(),
  isActive: z.boolean(),
  role: z.enum(Roles),
})

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  _id!: string;

  @Column()
  firstName!: string;

  @Column()
  lastName!: string;

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  @Column()
  middleName!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  dateOfBirth!: Date;

  @Column()
  phoneNumber!: string;

  @Column()
  password!: string;

  @Column()
  stationedAt!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @BeforeInsert()
  generateId() {
    this._id = uuidv4();
  }

  @Column()
  isActive!: boolean;

  @Column({ type: 'enum', enum: Roles, default: Roles.Unverified })
  role!: Roles;
}