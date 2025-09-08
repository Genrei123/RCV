import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ProductType } from '../../types/enums';
import { Admin } from './admin.entity';

@Entity()
export class Product {
    @Column({ primary: true, unique: true })
    LTONumber!: string;

    @Column({ unique: true })
    CFPRNumber!: string;

    @Column()
    productName!: string;

    @Column({
        type: "enum",
        enum: ProductType,
        default: ProductType["Others"]
    })
    productType!: ProductType;

    @Column()
    manufacturerName!: string;

    @Column()
    distributorName!: string;

    @Column()
    importerName!: string;

    @ManyToOne(() => Admin)
    @JoinColumn({ name: 'addedByAdmin' })
    addedByAdmin!: Admin;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    addedAt!: Date;
  }