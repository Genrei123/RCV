import { DB } from './data-source';
import { User } from './entities/user.entity';

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

    // First account seeder
    const userRepository = DB.getRepository(User);
    const dummyUser = userRepository.create({
      firstName: 'Admin',
      lastName: 'User',
      fullName: 'Admin User',
      email: 'adminuser@gmail.com',
      location: 'Admin City',
      dateOfBirth: '1990-01-01',
      phoneNumber: '1234567890',
      role: 'ADMIN',
      status: 'Active',
      approved: true,
      emailVerified: true,
    });
    const existingUser = await userRepository.findOneBy({ email: dummyUser.email });
    if (!existingUser) {
      await userRepository.save(dummyUser);
      console.log('Admin user created with email');
    }
  } catch (error) {
    console.error('Error during Data Source initialization:', error);
    process.exit(1);
  }
};

export default ConnectDatabase;
