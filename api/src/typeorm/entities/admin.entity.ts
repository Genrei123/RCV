import {
  Entity,
  Column,
} from 'typeorm';
import { User } from './user.entity';

@Entity()
export class Admin extends User {
    @Column({ unique: true })
    generatedQR!: string;
}