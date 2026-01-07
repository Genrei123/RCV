/**
 * Migration script to add walletAuthorized column to the User table
 * 
 * Run with: npx ts-node src/scripts/addWalletAuthorizedColumn.ts
 */

import { DB } from '../typeorm/data-source';

async function runMigration() {
  try {
    // Initialize the database connection
    await DB.initialize();
    console.log('Database connected successfully');

    const queryRunner = DB.createQueryRunner();
    
    // Check if the column already exists
    const tableColumns = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user' AND column_name = 'walletAuthorized'
    `);

    if (tableColumns.length > 0) {
      console.log('Column walletAuthorized already exists. Skipping migration.');
    } else {
      // Add the walletAuthorized column with default value false and nullable
      console.log('Adding walletAuthorized column to user table...');
      
      await queryRunner.query(`
        ALTER TABLE "user" 
        ADD COLUMN "walletAuthorized" boolean DEFAULT false
      `);
      
      console.log('Successfully added walletAuthorized column!');
    }

    await queryRunner.release();
    await DB.destroy();
    
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
