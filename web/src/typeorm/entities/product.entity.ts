import type { User } from './user.entity';
import type { Company } from './company.entity';

export const ProductValidation = {
  id: 'string',
  LTONumber: 'string',
  CFPRNumber: 'string',
  lotNumber: 'string',
  brandName: 'string',
  productName: 'string',
  productClassification: 'number',
  productSubClassification: 'number',
  expirationDate: 'Date',
  dateOfRegistration: 'Date',
  registeredBy: 'User',
  registeredAt: 'Date',
  company: 'Company',
};

export interface Product {
  _id: string;
  LTONumber: string;
  CFPRNumber: string;
  lotNumber: string;
  brandName: string;
  productName: string;
  productClassification: number;
  productSubClassification: number;
  expirationDate: Date;
  dateOfRegistration: Date;
  registeredBy: User;
  registeredAt: Date;
  company: Company;
}
