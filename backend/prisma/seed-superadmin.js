import prisma from './client.js';
import { hashPassword } from '../utils/password.js';

/**
 * Seed Superadmin User
 * 
 * Creates a superadmin user with:
 * - Email: deepak@digitalbevy.com
 * - Password: Deep@123 (hashed)
 * - Role: superadmin
 */

async function seedSuperadmin() {
  try {
    console.log('🌱 Seeding superadmin user...\n');

    const email = 'deepak@digitalbevy.com';
    const password = 'Deep@123';
    const name = 'Deepak';

    // Check if superadmin already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      console.log(`⚠️  User with email ${email} already exists.`);
      console.log(`   ID: ${existingUser.id}`);
      console.log(`   Name: ${existingUser.name}`);
      console.log(`   Role: ${existingUser.role}`);
      console.log(`\n✅ Skipping seed - user already exists.\n`);
      return;
    }

    // Hash the password
    console.log('🔐 Hashing password...');
    const hashedPassword = await hashPassword(password);

    // Create superadmin user
    console.log('👤 Creating superadmin user...');
    const superadmin = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'superadmin',
        isActive: true,
      }
    });

    console.log('\n✅ Superadmin user created successfully!\n');
    console.log('📋 Credentials:');
    console.log(`   ID: ${superadmin.id}`);
    console.log(`   Name: ${superadmin.name}`);
    console.log(`   Email: ${superadmin.email}`);
    console.log(`   Role: ${superadmin.role}`);
    console.log(`   Password: ${password}`);
    console.log('\n🔒 Password has been securely hashed in the database.\n');

  } catch (error) {
    console.error('❌ Error seeding superadmin:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedSuperadmin()
  .then(() => {
    console.log('✨ Seed completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seed failed:', error);
    process.exit(1);
  });
