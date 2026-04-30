const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const unitColl = mongoose.connection.collection('units');
  const residentColl = mongoose.connection.collection('residents');

  const units = await unitColl.find({ number: 'E2E-101' }).toArray();
  console.log(`Found ${units.length} units with number E2E-101`);

  for (const u of units) {
    const count = await residentColl.countDocuments({ unitId: u._id });
    console.log(`Unit ${u._id} has ${count} residents`);
  }

  await mongoose.connection.close();
}

check();
