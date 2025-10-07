import { Column, Entity, ManyToOne, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import { Product } from "./product.entity";
import { User } from "./user.entity";
import { ScanResult } from "../../types/enums";
import { z } from "zod";

export const ScanHistoryValidation = z.object({
    id: z.uuidv4(),
    lat: z.string().min(2).max(50),
    long: z.string().min(2).max(50),
    product: z.instanceof(Product),
    scannedBy: z.instanceof(User),
    scannedAt: z.date(),
    scanResult: z.enum(ScanResult),
    remarks: z.string().min(2).max(255),
})

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