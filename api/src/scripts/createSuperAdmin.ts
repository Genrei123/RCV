import { DB, UserRepo } from '../typeorm/data-source';
import * as bcrypt from 'bcryptjs';
import { User } from '../typeorm/entities/user.entity';

/**
 * Script to create a super admin account
 * Run with: npx ts-node src/scripts/createSuperAdmin.ts
 */
async function createSuperAdmin() {
  try {
    // Initialize database connection
    if (!DB.isInitialized) {
      await DB.initialize();
    }

    console.log('Creating super admin account...');

    // Check if super admin already exists
    const existingSuperAdmin = await UserRepo.findOne({
      where: { email: 'super@gmail.com' }
    });

    if (existingSuperAdmin) {
      console.log('Super admin account already exists.');
      process.exit(0);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('super@123', 10);

    // Create super admin user
    const superAdmin = UserRepo.create({
      firstName: 'Super',
      lastName: 'Admin',
      fullName: 'Super Admin',
      email: 'super@gmail.com',
      password: hashedPassword,
      phoneNumber: '+1-000-000-0000',
      location: 'System',
      dateOfBirth: '1990-01-01',
      badgeId: 'SUPER-ADMIN-001',
      role: 'ADMIN',
      isSuperAdmin: true,
      status: 'Active',
      approved: true,
      webAccess: true,
      appAccess: true,
      emailVerified: true,
      walletAuthorized: false,
    });

    await UserRepo.save(superAdmin);

    console.log('✅ Super admin account created successfully!');
    console.log('Email: super@gmail.com');
    console.log('Password: super@123');
    console.log('Role: ADMIN (Super Admin)');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating super admin:', error);
    process.exit(1);
  }
}

createSuperAdmin();
