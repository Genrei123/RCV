import { Column, Entity, OneToMany, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import { Product } from "./product.entity";
import { z } from "zod";

export const CompanyValidation = z.object({
    id: z.uuidv4(),
    name: z.string().min(2).max(100),
    address: z.string().min(5).max(255),
    licenseNumber: z.string().min(2).max(50),
    products: z.array(z.instanceof(Product)).optional(),
});

@Entity()
export class Company {
    @PrimaryGeneratedColumn('uuid')
    _id!: string;

    @Column()
    name!: string;

    @Column()
    address!: string;

    @Column()
    licenseNumber!: string;

    @OneToMany(() => Product, product => product._id)
    products!: Product[];
}