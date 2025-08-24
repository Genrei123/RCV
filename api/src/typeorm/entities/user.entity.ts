import {
  Entity,
  Column,
  PrimaryColumn,
  BeforeInsert,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

@Entity()
export class User {
  //https://typeorm.io/entities#entity-columns
  @PrimaryColumn('uuid')
  id!: string;

  @Column()
  fullName!: string;

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
    this.id = uuidv4();
  }
}

// Learn more about Column types for Postgres
// https://typeorm.io/entities#column-types-for-postgres
