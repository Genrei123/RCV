import { DB, UserRepo } from './data-source';
import bcryptjs from 'bcryptjs';

/**
 * Creates the default Super Admin user if it doesn't exist.
 * This user is recreated on database reset.
 */
const createSuperAdmin = async (): Promise<void> => {
  try {
    const existingAdmin = await UserRepo.findOne({
      where: { email: 'admin@gmail.com' },
    });

    if (!existingAdmin) {
      const hashedPassword = bcryptjs.hashSync('admin@123456', 10);
      
      const superAdmin = UserRepo.create({
        firstName: 'Super',
        lastName: 'Admin',
        fullName: 'Super Admin',
        email: 'admin@gmail.com',
        password: hashedPassword,
        role: 'ADMIN',
        isSuperAdmin: true,
        status: 'Active',
        approved: true,
        hasWebAccess: true,
        hasAppAccess: true,
        hasKioskAccess: true,
        location: 'System',
        dateOfBirth: '1990-01-01',
        phoneNumber: '09000000000',
        badgeId: 'SUPERADMIN001',
      });

      await UserRepo.save(superAdmin);
      console.log('✅ Super Admin created: admin@gmail.com / admin@123456');
    } else {
      console.log('ℹ️ Super Admin already exists');
    }
  } catch (error) {
    console.error('Error creating Super Admin:', error);
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
    
    // Create Super Admin after database initialization
    await createSuperAdmin();
  } catch (error) {
    console.error('Error during Data Source initialization:', error);
    process.exit(1);
  }
};

export default ConnectDatabase;
