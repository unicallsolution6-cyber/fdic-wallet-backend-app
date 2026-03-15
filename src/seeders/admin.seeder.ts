import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

async function seedAdmin() {
  try {
    console.log('Starting admin seeder...');

    const defaultAdminEmail = 'admin@fdicwallet.com';

    // Check if admin already exists
    const existingAdmin = await prisma.admin.findUnique({
      where: { email: defaultAdminEmail },
    });

    if (existingAdmin) {
      console.log(
        `Admin with email ${defaultAdminEmail} already exists. Skipping...`,
      );
      return;
    }

    // Create default admin
    const hashedPassword = await hashPassword('Admin@123456');

    const admin = await prisma.admin.create({
      data: {
        email: defaultAdminEmail,
        password: hashedPassword,
        name: 'Default Admin',
      },
    });

    console.log('✅ Default admin created successfully!');
    console.log('📧 Email:', admin.email);
    console.log('🔑 Password: Admin@123456');
    console.log('⚠️  Please change the password after first login!');
  } catch (error) {
    console.error('❌ Error seeding admin:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedAdmin()
  .then(() => {
    console.log('Admin seeding completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Admin seeding failed:', error);
    process.exit(1);
  });
