import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import connectDB from '../config/database';
import Tenant from '../modules/tenants/model';
import User from '../modules/users/model';

// Load env variables from root of backend
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function reset() {
  try {
    console.log('Connecting to database...');
    await connectDB();

    console.log('Deleting all data from collections...');
    const collections = await mongoose.connection.db?.collections();
    if (collections) {
      for (const collection of collections) {
        await collection.deleteMany({});
        console.log(`Cleared collection: ${collection.collectionName}`);
      }
    }

    console.log('Creating default tenant...');
    const tenant = await Tenant.create({
      name: 'Administración Central',
      identifier: 'mac-admin',
      address: 'Sede Principal',
      contactEmail: 'admin@admin.com'
    });
    console.log('Tenant created:', tenant.name);

    console.log('Creating superadmin user...');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const superadmin = await User.create({
      tenantId: tenant._id,
      name: 'Super Admin',
      email: 'admin@admin.com',
      password: hashedPassword,
      role: 'superadmin',
      isActive: true
    });
    console.log('Superadmin created:', superadmin.email);

    console.log('Database reset successfully!');
    console.log('---------------------------');
    console.log('Credentials:');
    console.log(`Condo ID: ${tenant.identifier}`);
    console.log('Email: admin@admin.com');
    console.log('Password: admin123');
    console.log('---------------------------');
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error resetting database:', error);
    process.exit(1);
  }
}

reset();
