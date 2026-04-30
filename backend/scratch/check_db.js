const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const Resident = mongoose.model('Resident', new mongoose.Schema({
      tenantId: mongoose.Schema.Types.ObjectId,
      name: String
    }));
    const count = await Resident.countDocuments();
    console.log(`TOTAL_RESIDENTS: ${count}`);
    
    if (count > 0) {
      const sample = await Resident.find().limit(3);
      console.log('SAMPLE:', JSON.stringify(sample, null, 2));
    }
    
    await mongoose.disconnect();
  } catch (err) {
    console.error('ERROR:', err);
    process.exit(1);
  }
}

check();
