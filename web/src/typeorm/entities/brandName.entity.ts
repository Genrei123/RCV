export interface BrandName {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  productCount?: number;
  createdAt: Date;
  updatedAt: Date;
}
