/**
 * seed-clear.js
 * Clears all seeded data: patients collection (all embedded data)
 * and clinical_notes collection.
 * Run BEFORE seeding to start fresh.
 */
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:admin@localhost:27017/patientrecords?authSource=admin';

async function clear() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;

  const patientsResult = await db.collection('patients').deleteMany({});
  console.log(`  Cleared patients:       ${patientsResult.deletedCount} documents removed`);

  const notesResult = await db.collection('clinical_notes').deleteMany({});
  console.log(`  Cleared clinical_notes: ${notesResult.deletedCount} documents removed`);

  await mongoose.disconnect();
  console.log('Done.');
  process.exit(0);
}

clear().catch(err => { console.error('Error:', err.message); process.exit(1); });
