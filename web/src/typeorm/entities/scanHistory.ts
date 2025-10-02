import type { Product } from "./product.entity";
import type { User } from "./user.entity";

export const ScanHistoryValidation = {
    id: 'string',
    lat: 'string',
    long: 'string',
    product: 'Product',
    scannedBy: 'User',
    scannedAt: 'Date',
    scanResult: 'number',
    remarks: 'string',
};

export interface ScanHistory {
    _id: string;
    lat: string;
    long: string;
    product: Product;
    scannedBy: User;
    scannedAt: Date;
    scanResult: number;
    remarks: string;
}
