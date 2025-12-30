import { DB, UserRepo } from './data-source';
import { User } from './entities/user.entity';
import bcrypt from 'bcryptjs';

/**
 * Seeds default admin and agent accounts if they don't exist
 */
const seedDefaultAccounts = async (): Promise<void> => {
  try {
    // Check and create Admin account
    const existingAdmin = await UserRepo.findOne({ where: { email: 'admin@gmail.com' } });
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('admin@123', 10);
      const admin = UserRepo.create({
        firstName: 'System',
        lastName: 'Administrator',
        fullName: 'System Administrator',
        email: 'admin@gmail.com',
        password: hashedPassword,
        phoneNumber: '09000000001',
        location: 'Manila',
        dateOfBirth: '1990-01-01',
        badgeId: 'ADMIN-001',
        role: 'ADMIN',
        status: 'Active',
        approved: true,
      });
      await UserRepo.save(admin);
      console.log('✅ Default Admin account created (admin@gmail.com)');
    } else {
      console.log('ℹ️  Admin account already exists');
    }

    // Check and create Agent account
    const existingAgent = await UserRepo.findOne({ where: { email: 'agent@gmail.com' } });
    if (!existingAgent) {
      const hashedPassword = await bcrypt.hash('agent@123', 10);
      const agent = UserRepo.create({
        firstName: 'Sample',
        lastName: 'Agent',
        fullName: 'Sample Agent',
        email: 'agent@gmail.com',
        password: hashedPassword,
        phoneNumber: '09000000002',
        location: 'Manila',
        dateOfBirth: '1995-01-01',
        badgeId: 'AGT-001',
        role: 'AGENT',
        status: 'Active',
        approved: true,
      });
      await UserRepo.save(agent);
      console.log('✅ Default Agent account created (agent@gmail.com)');
    } else {
      console.log('ℹ️  Agent account already exists');
    }
  } catch (error) {
    console.error('Error seeding default accounts:', error);
  }
};

/**
 * Connects to the database and initializes the data source.
 *
 * This function attempts to establish a connection to the database and initialize the data source.
 * If successful, it logs a success message to the console. If an error occurs, it logs the error and exits the process.
 *
 * @async
 * @returns {Promise<void>}
 */
const ConnectDatabase = async (): Promise<void> => {
  try {
    await DB.initialize();
    console.log('Data Source has been initialized!');
    
    // Seed default accounts after DB initialization
    await seedDefaultAccounts();
  } catch (error) {
    console.error('Error during Data Source initialization:', error);
    process.exit(1);
  }
};

export default ConnectDatabase;
