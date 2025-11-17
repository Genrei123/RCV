import type { User } from './user.entity';
import type { Company } from './company.entity';

export interface Product {
  _id?: string;
  LTONumber: string;
  CFPRNumber: string;
  lotNumber: string;
  brandName: string;
  productName: string;
  productClassification: string;
  productSubClassification: string;
  expirationDate: Date;
  dateOfRegistration: Date;
  registeredBy: User;
  registeredAt: Date;
  company: Company;
}
