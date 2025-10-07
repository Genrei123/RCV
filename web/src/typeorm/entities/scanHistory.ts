import type { Product } from "./product.entity";
import type { User } from "./user.entity";
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
