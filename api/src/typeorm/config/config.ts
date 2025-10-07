import { DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
dotenv.config();
import { User } from '../entities/user.entity';
import { Product } from '../entities/product.entity';
import { Company } from '../entities/company.entity';
import { ScanHistory } from '../entities/scanHistory';
// import { AuditTrail } from '../entities/audit-trail.entity';

const { DEV_DATABASE_URI, MAIN_DATABASE_URI, DB_PORT, NODE_ENV } = process.env;

// Parse database URL if provided, otherwise use individual config
const getDbConfig = () => {
  const dbUrl = NODE_ENV === 'development' ? DEV_DATABASE_URI : MAIN_DATABASE_URI;
  
  if (dbUrl) {
    try {
      // Clean the URL by removing newlines and extra spaces
      const cleanUrl = dbUrl.replace(/\n/g, '').replace(/\s+/g, ' ').trim();
      
      // Parse MySQL URL format: mysql://username:password@host:port/database
      const url = new URL(cleanUrl);
      return {
        host: url.hostname,
        port: parseInt(url.port || '3306', 10),
        username: url.username,
        password: url.password,
        database: url.pathname.slice(1) // Remove leading slash
      };
    } catch (error) {
      console.warn('Invalid database URL format, falling back to default config:', error instanceof Error ? error.message : String(error));
    }
  }
  
  // Fallback to default config
  return {
    host: 'localhost',
    port: 3306,
    username: 'root',
    password: '', // Try empty password first
    database: 'rcv_database'
  };
};

const dbConfig = getDbConfig();

// https://typeorm.io/data-source-options#postgres--cockroachdb-data-source-options
const config: DataSourceOptions = {
  type: 'mysql',
  host: dbConfig.host,
  port: dbConfig.port,
  username: dbConfig.username,
  password: dbConfig.password,
  database: dbConfig.database,
  entities: [User, Product, Company, ScanHistory], // Add yung models na ginagawa
  migrations: ['src/typeorm/migrations/*.ts'],
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
