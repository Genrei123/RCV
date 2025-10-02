import type { Product } from "./product.entity";

export const CompanyValidation = {
    id: 'string',
    name: 'string',
    address: 'string',
    licenseNumber: 'string',
};

export interface Company {
    _id: string;
    name: string;
    address: string;
    licenseNumber: string;
    products: Product[];
}
