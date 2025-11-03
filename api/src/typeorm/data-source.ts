import { DataSource } from 'typeorm';
import config from './config/config';
import { User } from './entities/user.entity';
import { Product } from './entities/product.entity';
import { AuditTrail } from './entities/audit-trail.entity';
import { Company } from './entities/company.entity';
import { ScanHistory } from './entities/scanHistory';
import { ForgotPassword } from './entities/forgotPassword.entity';
import { AuditLog } from './entities/auditLog.entity';

// Initialize the datasource/database connection
export const DB = new DataSource(config);

// Export Repository for the Entities
// https://typeorm.io/working-with-repository
const UserRepo = DB.getRepository(User);
const ProductRepo = DB.getRepository(Product);
const AuditTrailRepo = DB.getRepository(AuditTrail);
const CompanyRepo = DB.getRepository(Company);
const ScanRepo = DB.getRepository(ScanHistory);
const ForgotPasswordRepo = DB.getRepository(ForgotPassword);
const AuditLogRepo = DB.getRepository(AuditLog);

export { UserRepo, ProductRepo, AuditTrailRepo, CompanyRepo, ScanRepo, ForgotPasswordRepo, AuditLogRepo };
