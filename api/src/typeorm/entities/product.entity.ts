import {
  Entity,
  Column,
} from 'typeorm';
import { ProductType } from '../../types/enums';

@Entity()
export class Product {
    @Column({ unique: true })
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
}