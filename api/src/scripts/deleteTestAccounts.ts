import { DB, UserRepo } from '../typeorm/data-source';

/**
 * Script to delete test/dummy accounts from the database
 * Run with: npx ts-node src/scripts/deleteTestAccounts.ts
 */
async function deleteTestAccounts() {
  try {
    // Initialize database connection
    if (!DB.isInitialized) {
      await DB.initialize();
    }

    console.log('Deleting test/dummy accounts...\n');

    // List of test account emails to delete
    const testEmails = [
      'admin@gmail.com',
      'agent@gmail.com',
      'test@gmail.com',
      'testadmin@gmail.com',
      'testagent@gmail.com',
      'demo@gmail.com',
      'demoadmin@gmail.com',
      'demoagent@gmail.com',
      'sample@gmail.com',
      'user@gmail.com',
      'testuser@gmail.com',
    ];

    // Delete each test account
    let deletedCount = 0;
    for (const email of testEmails) {
      const user = await UserRepo.findOne({
        where: { email }
      });

      if (user) {
        await UserRepo.remove(user);
        console.log(`✓ Deleted: ${email}`);
        deletedCount++;
      }
    }

    console.log(`\n✅ Successfully deleted ${deletedCount} test account(s) from the database.`);

    if (deletedCount === 0) {
      console.log('No test accounts found to delete.');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error deleting test accounts:', error);
    process.exit(1);
  }
}

deleteTestAccounts();
