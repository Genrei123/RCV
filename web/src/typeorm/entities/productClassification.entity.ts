export interface ProductClassification {
  _id: string;
  name: string;
  description?: string;
  parentId?: string;
  parent?: ProductClassification;
  children?: ProductClassification[];
  isActive: boolean;
  productCount?: number;
  subClassificationProductCount?: number;
  createdAt: Date;
  updatedAt: Date;
}
