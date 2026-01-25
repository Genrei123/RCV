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
  companyId?: string;
  brandNameId?: string;
  classificationId?: string;
  subClassificationId?: string;
  // Product images (front and back) - captured by System Admin to show how the product should look
  productImageFront?: string;
  productImageBack?: string;
  // Sepolia blockchain transaction ID for verification
  sepoliaTransactionId?: string;
  isArchived?: boolean;
}
