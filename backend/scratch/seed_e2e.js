const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

async function seedE2E() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to DB');

    const tenantColl = mongoose.connection.collection('tenants');
    const userColl = mongoose.connection.collection('users');
    const unitColl = mongoose.connection.collection('units');

    // Create Tenant
    let tenant = await tenantColl.findOne({ name: 'E2E Test Tenant' });
    if (!tenant) {
      const res = await tenantColl.insertOne({
        name: 'E2E Test Tenant',
        address: 'Test Street 123',
        contactEmail: 'e2e@test.com',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      tenant = { _id: res.insertedId, name: 'E2E Test Tenant' };
      console.log('Created Tenant');
    }

    // Create Unit
    let unit = await unitColl.findOne({ tenantId: tenant._id, number: 'E2E-101' });
    if (!unit) {
      await unitColl.insertOne({
        tenantId: tenant._id,
        number: 'E2E-101',
        type: 'departamento',
        floor: '1',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('Created Unit');
    }

    // Create Resident User
    let user = await userColl.findOne({ email: 'resident@test.com' });
    if (!user) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      await userColl.insertOne({
        tenantId: tenant._id,
        name: 'E2E Resident User',
        email: 'resident@test.com',
        password: hashedPassword,
        role: 'residente',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('Created Resident User');
    }

    console.log('E2E Seed complete!');
    await mongoose.connection.close();
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seedE2E();
