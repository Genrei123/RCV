import { Column, Entity, ManyToOne, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import { Product } from "./product.entity";
import { User } from "./user.entity";
import { ScanResult } from "../../types/enums";

@Entity()
export class ScanHistory {
    @PrimaryGeneratedColumn('uuid')
    _id!: string;

    @Column()
    lat!: string;

    @Column()
    long!: string;

    @ManyToOne(() => Product, product => product._id)
    product!: Product;

    @ManyToOne(() => User, user => user._id)
    scannedBy!: User;

    @Column()
    scannedAt!: Date;

    @Column({ type: 'enum', enum: ScanResult })
    scanResult!: ScanResult;

    @Column()
    remarks!: string;
}