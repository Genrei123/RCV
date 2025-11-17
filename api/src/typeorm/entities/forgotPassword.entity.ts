import { Column, Entity, ManyToOne, PrimaryColumn } from "typeorm";
import { User } from "./user.entity";

@Entity()
export class ForgotPassword {
    @PrimaryColumn({ generated: "increment" })
    id!: number;

    @ManyToOne(() => User, user => user._id)
    requestedBy!: User;

    @Column()
    key!: string;
}