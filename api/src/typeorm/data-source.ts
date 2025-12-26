import { DataSource } from 'typeorm';
import config from './config/config';
import { User } from './entities/user.entity';
import { Product } from './entities/product.entity';
import { AuditTrail } from './entities/audit-trail.entity';
import { Company } from './entities/company.entity';
import { CompanyOwner } from './entities/companyOwner.entity';
import { ScanHistory } from './entities/scanHistory';
import { ForgotPassword } from './entities/forgotPassword.entity';
import { AuditLog } from './entities/auditLog.entity';
import { ComplianceReport } from './entities/complianceReport.entity';
import { InviteToken } from './entities/inviteToken.entity';

// Initialize the datasource/database connection
export const DB = new DataSource(config);

// Export Repository for the Entities
// https://typeorm.io/working-with-repository
const UserRepo = DB.getRepository(User);
const ProductRepo = DB.getRepository(Product);
const AuditTrailRepo = DB.getRepository(AuditTrail);
const CompanyRepo = DB.getRepository(Company);
const CompanyOwnerRepo = DB.getRepository(CompanyOwner);
const ScanRepo = DB.getRepository(ScanHistory);
const ForgotPasswordRepo = DB.getRepository(ForgotPassword);
const AuditLogRepo = DB.getRepository(AuditLog);
const ComplianceReportRepo = DB.getRepository(ComplianceReport);
const InviteTokenRepo = DB.getRepository(InviteToken);

export { UserRepo, ProductRepo, AuditTrailRepo, CompanyRepo, CompanyOwnerRepo, ScanRepo, ForgotPasswordRepo, AuditLogRepo, ComplianceReportRepo, InviteTokenRepo };
