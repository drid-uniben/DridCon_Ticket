import User, { IUser, UserRole } from '../model/user.model';
import connectDB from '../db/database';
import validateEnv from '../utils/validateEnv';
import logger from '../utils/logger';

validateEnv();

export const createAdminUser = async (): Promise<void> => {
  try {
    await connectDB();
    logger.info('Connected to database');

    if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
      logger.error('Add ADMIN_EMAIL and ADMIN_PASSWORD to the .env records.');
      return;
    }

    // Check if admin already exists
    const adminExists = await User.findOne({ email: process.env.ADMIN_EMAIL });

    if (adminExists) {
      logger.info('Admin user already exists');
      return;
    }

    // Create admin user with required fields
    const adminData: Partial<IUser> = { // Use Partial<IUser> as not all fields are provided initially
      name: process.env.ADMIN_NAME || 'System Administrator',
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
      role: UserRole.ADMIN,
      isActive: true, // New users are active by default
      wallet: { balance: 0 }, // Initialize wallet
    };

    const admin = await User.create(adminData);

    logger.info(`Admin user created with email: ${admin.email}`);
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Error creating admin user:', error);
    } else {
      logger.error('Unknown error occurred while creating admin user');
    }
  }
};

createAdminUser();
