const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB:', mongoose.connection.name);
  
  const unitColl = mongoose.connection.collection('units');
  const residentColl = mongoose.connection.collection('residents');

  const unit = await unitColl.findOne({ code: 'E2E-999' });
  console.log('Unit Data:', unit);

  const count = await residentColl.countDocuments({ unitId: unit._id });
  console.log('Resident count for this unit:', count);

  await mongoose.connection.close();
}

check();
