import type { Product } from "./product.entity";

export interface Company {
    _id: string;
    name: string;
    address: string;
    licenseNumber: string;
    products: Product[];
}
