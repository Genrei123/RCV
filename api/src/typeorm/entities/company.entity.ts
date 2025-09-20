import { Column, Entity, OneToMany, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import { Product } from "./product.entity";

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