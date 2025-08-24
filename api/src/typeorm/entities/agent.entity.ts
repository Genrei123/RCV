import {
  Entity,
  Column,
} from 'typeorm';
import { User } from './user.entity';

@Entity()
export class Agent extends User {
    @Column({ unique: true })
    employeeID!: string;
}