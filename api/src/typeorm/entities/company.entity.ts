import { Column, Entity, OneToMany, PrimaryColumn, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Product } from "./product.entity";
import { z } from "zod";

// Helper to transform null to undefined for TypeORM compatibility
const nullToUndefined = <T>(val: T | null | undefined): T | undefined => 
    val === null ? undefined : val;

export const CompanyValidation = z.object({
    id: z.string().uuid().optional(),
    name: z.string().min(2).max(100),
    address: z.string().min(5).max(255),
    licenseNumber: z.string().min(2).max(50),
    // Location coordinates (optional)
    latitude: z.number().min(-90).max(90).optional().nullable().transform(nullToUndefined),
    longitude: z.number().min(-180).max(180).optional().nullable().transform(nullToUndefined),
    // Contact information
    phone: z.string().max(20).optional().nullable().transform(nullToUndefined),
    email: z.string().email().max(100).optional().nullable().transform(nullToUndefined),
    website: z.string().url().max(255).optional().nullable().transform(nullToUndefined),
    // Business details
    businessType: z.string().max(100).optional().nullable().transform(nullToUndefined),
    registrationDate: z.string().or(z.date()).optional().nullable().transform(nullToUndefined),
    // Documents (stored as JSON array of document URLs)
    documents: z.array(z.object({
        name: z.string(),
        url: z.string().url(),
        type: z.string(),
        uploadedAt: z.string().or(z.date()),
    })).optional().nullable().transform(nullToUndefined),
    // Description
    description: z.string().max(1000).optional().nullable().transform(nullToUndefined),
    // Sepolia blockchain transaction ID
    sepoliaTransactionId: z.string().optional().nullable().transform(nullToUndefined),
    // Status
    isArchived: z.boolean().optional().default(false),
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

    @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
    latitude?: number;

    @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
    longitude?: number;

    @Column({ nullable: true })
    phone?: string;

    @Column({ nullable: true })
    email?: string;

    @Column({ nullable: true })
    website?: string;

    @Column({ nullable: true })
    businessType?: string;

    @Column({ type: 'date', nullable: true })
    registrationDate?: Date;

    @Column({ type: 'jsonb', nullable: true })
    documents?: {
        name: string;
        url: string;
        type: string;
        uploadedAt: string | Date;
    }[];

    @Column({ type: 'text', nullable: true })
    description?: string;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    // Sepolia blockchain transaction ID for verification
    @Column({ nullable: true })
    sepoliaTransactionId?: string;

    @Column({ default: false })
    isArchived!: boolean;

    @OneToMany(() => Product, product => product._id)
    products!: Product[];
}