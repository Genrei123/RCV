import type { Product } from "./product.entity";

export interface CompanyDocument {
    name: string;
    url: string;
    type: string;
    uploadedAt: string | Date;
}

export interface Company {
    _id: string;
    name: string;
    address: string;
    licenseNumber: string;
    // Location coordinates
    latitude?: number | null;
    longitude?: number | null;
    // Contact information
    phone?: string | null;
    email?: string | null;
    website?: string | null;
    // Business details
    businessType?: string | null;
    registrationDate?: string | Date | null;
    // Documents
    documents?: CompanyDocument[] | null;
    // Description
    description?: string | null;
    // Timestamps
    createdAt?: string | Date;
    updatedAt?: string | Date;
    // Sepolia blockchain transaction ID for verification
    sepoliaTransactionId?: string;
    // Relations
    products?: Product[];
    productCount?: number;
}
