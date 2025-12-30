/**
 * Run this script to add new action types to the audit_logs_actiontype_enum
 * 
 * Usage: npx ts-node src/scripts/addAuditLogEnumValues.ts
 */

import { DB } from '../typeorm/data-source';

async function addEnumValues() {
  try {
    await DB.initialize();
    console.log('Database connected');

    const enumValues = [
      'COMPLIANCE_REPORT',
      'CREATE_BRAND_NAME',
      'UPDATE_BRAND_NAME', 
      'DELETE_BRAND_NAME',
      'CREATE_CLASSIFICATION',
      'UPDATE_CLASSIFICATION',
      'DELETE_CLASSIFICATION',
      'CREATE_COMPANY',
      'UPDATE_COMPANY',
      'DELETE_COMPANY'
    ];

    for (const value of enumValues) {
      try {
        await DB.query(`ALTER TYPE "public"."audit_logs_actiontype_enum" ADD VALUE IF NOT EXISTS '${value}'`);
        console.log(`Added enum value: ${value}`);
      } catch (error: any) {
        if (error.code === '42710') {
          // Value already exists - this is fine
          console.log(`Enum value already exists: ${value}`);
        } else {
          throw error;
        }
      }
    }

    console.log('All enum values added successfully');
    await DB.destroy();
    process.exit(0);
  } catch (error) {
    console.error('Error adding enum values:', error);
    process.exit(1);
  }
}

addEnumValues();
