import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import connectDB from '../src/config/database';
import Tenant from '../src/modules/tenants/model';
import User from '../src/modules/users/model';
import Unit from '../src/modules/units/model';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function seedE2E() {
  try {
    await connectDB();
    
    // Check if E2E tenant exists
    let tenant = await Tenant.findOne({ name: 'E2E Test Tenant' });
    if (!tenant) {
      tenant = await Tenant.create({
        name: 'E2E Test Tenant',
        address: 'Test Street 123',
        contactEmail: 'e2e@test.com'
      });
    }

    // Check if E2E unit exists
    let unit = await Unit.findOne({ tenantId: tenant._id, number: 'E2E-101' });
    if (!unit) {
      unit = await Unit.create({
        tenantId: tenant._id,
        number: 'E2E-101',
        type: 'departamento',
        floor: '1'
      });
    }

    // Check if E2E resident user exists
    const hashedPassword = await bcrypt.hash('password123', 10);
    let user = await User.findOne({ email: 'resident@test.com' });
    if (!user) {
      user = await User.create({
        tenantId: tenant._id,
        name: 'E2E Resident User',
        email: 'resident@test.com',
        password: hashedPassword,
        role: 'residente',
        isActive: true
      });
    }

    console.log('E2E Seed complete:');
    console.log('Tenant:', tenant.name);
    console.log('Unit:', unit.number);
    console.log('User:', user.email);

    await mongoose.connection.close();
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seedE2E();
