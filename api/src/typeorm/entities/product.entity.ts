import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ProductType } from '../../types/enums';
import { User } from './user.entity';

@Entity()
export class Product {
    @Column({ primary: true, unique: true, nullable: false })
    LTONumber!: string;

    @Column({ unique: true, nullable: false })
    CFPRNumber!: string;

    @Column({ nullable: false })
    productName!: string;

    @Column({
        type: "enum",
        enum: ProductType,
        default: ProductType["Others"],
        nullable: false
    })
    productType!: ProductType;

    @Column({ nullable: false })
    manufacturerName!: string;

    @Column({ nullable: false })
    distributorName!: string;

    @Column({ nullable: false })
    importerName!: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'addedByUser' })
    addedBy!: User;

    @Column({ nullable: false, type: 'timestamp', default: () => 'CURRENT_TIMESTAMP',  })
    addedAt!: Date;
  }