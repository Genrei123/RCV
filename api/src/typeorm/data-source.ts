import { DataSource } from 'typeorm';
import config from './config/config';
import { User } from './entities/user.entity';
import { Product } from './entities/product.entity';
import { AuditTrail } from './entities/audit-trail.entity';

// Initialize the datasource/database connection
export const DB = new DataSource(config);

// Export Repository for the Entities
// https://typeorm.io/working-with-repository
const UserRepo = DB.getRepository(User);
const ProductRepo = DB.getRepository(Product);
const AuditTrailRepo = DB.getRepository(AuditTrail);

export { UserRepo, ProductRepo, AuditTrailRepo };
