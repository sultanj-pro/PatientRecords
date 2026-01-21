const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:admin@localhost:27017/patientrecords?authSource=admin';

// Define Patient schema with nested clinical data
const patientSchema = new mongoose.Schema({
  patientid: { type: Number, unique: true, required: true },
  firstname: { type: String },
  lastname: { type: String },
  demographics: [
    {
      description: String,
      value: String
    }
  ],
  vitals: [
    {
      dateofobservation: String,
      observationcode: String,
      observationcodesystem: String,
      organizationname: String,
      vital_description: String,
      unit: String,
      value: String,
      percentile: String
    }
  ],
  labs: [
    {
      date: String,
      test_name: String,
      test_code: String,
      result: String,
      unit: String,
      reference_range: String
    }
  ],
  medications: [
    {
      startDate: String,
      name: String,
      dose: String,
      frequency: String,
      indication: String,
      route: String
    }
  ],
  physician_visits: [
    {
      date: String,
      clinic: String,
      reason: String,
      notes: String,
      provider_name: String,
      facility_name: String
    }
  ],
  hospital_visits: [
    {
      date: String,
      facility: String,
      reason: String,
      notes: String,
      discharge_status: String
    }
  ]
}, { timestamps: true });

const Patient = mongoose.model('Patient', patientSchema);

async function seedFromJson() {
  // Expect data at /data/patient-vitals-hierarchical.json
  const candidate = '/data/patient-vitals-hierarchical.json';
  if (!fs.existsSync(candidate)) {
    console.log('No sample data file found at', candidate);
    return;
  }

  const raw = fs.readFileSync(candidate, 'utf8');
  let patients = [];
  try {
    patients = JSON.parse(raw);
  } catch (err) {
    console.error('Invalid sample json:', err.message);
    return;
  }

  // Clear existing data
  try {
    await Patient.deleteMany({});
    console.log('Cleared existing patient data');
  } catch (err) {
    console.error('Error clearing data:', err.message);
  }

  // Insert all patients
  try {
    const result = await Patient.insertMany(patients);
    console.log(`Seeded ${result.length} patients successfully`);
  } catch (err) {
    console.error('Error seeding data:', err.message);
    throw err;
  }
}

async function main() {
  console.log('MongoDB init using:', MONGODB_URI);
  
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully');

    // Check if patients collection is empty
    const count = await Patient.countDocuments();
    if (count === 0) {
      console.log('No patients found; seeding from JSON file');
      await seedFromJson();
      console.log('Seeding complete');
    } else {
      console.log(`Database already contains ${count} patients; skipping seeding`);
    }

    // Don't disconnect - let the server start
    // await mongoose.disconnect();
  } catch (err) {
    console.error('Failed to initialize database:', err.message);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Initialization failed:', err);
  process.exit(1);
});
