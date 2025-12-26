import { DataSourceOptions } from "typeorm";
import * as dotenv from "dotenv";
dotenv.config();
import { User } from "../entities/user.entity";
import { Product } from "../entities/product.entity";
import { Company } from "../entities/company.entity";
import { ScanHistory } from "../entities/scanHistory";
import { ForgotPassword } from "../entities/forgotPassword.entity";
import { AuditLog } from "../entities/auditLog.entity";
import { ComplianceReport } from "../entities/complianceReport.entity";
// import { AuditTrail } from '../entities/audit-trail.entity';

const { DEV_DATABASE_URI, MAIN_DATABASE_URI, DB_PORT, NODE_ENV } = process.env;
const config: DataSourceOptions = {
  type: "postgres",
  url: NODE_ENV === "development" ? DEV_DATABASE_URI : MAIN_DATABASE_URI,
  port: parseInt(DB_PORT!, 10),
  entities: [User, Product, Company, ScanHistory, ForgotPassword, AuditLog, ComplianceReport], // Add yung models na ginagawa
  migrations: ["src/typeorm/migrations/*.ts"],
  subscribers: [],
  // logging: NODE_ENV === 'development' ? true : false,
  logging: false,
  poolSize: 5,
  synchronize: true,
  // ssl: {
  //   rejectUnauthorized: false,
  // },
};

export = config;
