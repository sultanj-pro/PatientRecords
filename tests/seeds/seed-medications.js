/**
 * seed-medications.js
 * Seeds medications for each patient (IDs 20001-20010).
 * Schema reference: startDate, name, dose, frequency, indication, route
 * Run AFTER seed-patients.js.
 */
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:admin@localhost:27017/patientrecords?authSource=admin';
const Patient = mongoose.model('Patient', new mongoose.Schema({ patientid: Number }, { strict: false }));

// Add or modify medications per patient here.
const medicationsData = {
  20001: [
    { startDate: '2024-01-15', name: 'Vitamin D3',    dose: '1000 IU', frequency: 'Once Daily',  indication: 'Deficiency Prevention', route: 'Oral' }
  ],
  20002: [
    { startDate: '2023-06-01', name: 'Lisinopril',    dose: '10 mg',   frequency: 'Once Daily',  indication: 'Hypertension',          route: 'Oral' },
    { startDate: '2023-06-01', name: 'Metformin',     dose: '500 mg',  frequency: 'Twice Daily', indication: 'Type 2 Diabetes',       route: 'Oral' },
    { startDate: '2023-08-10', name: 'Atorvastatin',  dose: '20 mg',   frequency: 'Once Daily',  indication: 'High Cholesterol',      route: 'Oral' }
  ],
  20003: [
    { startDate: '2025-01-10', name: 'Prenatal Vitamin', dose: '1 tablet', frequency: 'Once Daily', indication: 'Pregnancy Support',  route: 'Oral' },
    { startDate: '2025-01-10', name: 'Folic Acid',    dose: '400 mcg', frequency: 'Once Daily',  indication: 'Neural Tube Prevention', route: 'Oral' }
  ],
  20004: [
    { startDate: '2022-03-01', name: 'Amlodipine',    dose: '5 mg',    frequency: 'Once Daily',  indication: 'Hypertension',          route: 'Oral' },
    { startDate: '2022-03-01', name: 'Furosemide',    dose: '40 mg',   frequency: 'Once Daily',  indication: 'Edema',                 route: 'Oral' },
    { startDate: '2022-05-15', name: 'Warfarin',      dose: '5 mg',    frequency: 'Once Daily',  indication: 'Atrial Fibrillation',   route: 'Oral' },
    { startDate: '2023-01-10', name: 'Digoxin',       dose: '0.25 mg', frequency: 'Once Daily',  indication: 'Heart Failure',         route: 'Oral' }
  ],
  20005: [
    { startDate: '2021-09-01', name: 'Levothyroxine', dose: '50 mcg',  frequency: 'Once Daily',  indication: 'Hypothyroidism',        route: 'Oral' },
    { startDate: '2023-04-15', name: 'Sertraline',    dose: '50 mg',   frequency: 'Once Daily',  indication: 'Depression',            route: 'Oral' }
  ],
  20006: [
    { startDate: '2023-02-01', name: 'Simvastatin',   dose: '20 mg',   frequency: 'Once Daily',  indication: 'High Cholesterol',      route: 'Oral' },
    { startDate: '2023-02-01', name: 'Aspirin',       dose: '81 mg',   frequency: 'Once Daily',  indication: 'Cardiovascular Protection', route: 'Oral' }
  ],
  20007: [
    { startDate: '2024-03-10', name: 'Loratadine',    dose: '10 mg',   frequency: 'Once Daily',  indication: 'Allergies',             route: 'Oral' }
  ],
  20008: [
    { startDate: '2020-08-01', name: 'Enalapril',     dose: '10 mg',   frequency: 'Once Daily',  indication: 'Hypertension',          route: 'Oral' },
    { startDate: '2020-08-01', name: 'Hydrochlorothiazide', dose: '12.5 mg', frequency: 'Once Daily', indication: 'Hypertension',    route: 'Oral' },
    { startDate: '2021-01-15', name: 'Pravastatin',   dose: '40 mg',   frequency: 'Once Daily',  indication: 'High Cholesterol',      route: 'Oral' }
  ],
  20009: [
    { startDate: '2019-05-20', name: 'Albuterol',     dose: '90 mcg',  frequency: 'As needed',   indication: 'Asthma relief',         route: 'Inhaled' },
    { startDate: '2019-05-20', name: 'Fluticasone',   dose: '44 mcg',  frequency: 'Twice Daily', indication: 'Asthma prevention',     route: 'Inhaled' },
    { startDate: '2024-01-05', name: 'Montelukast',   dose: '10 mg',   frequency: 'Once Daily',  indication: 'Allergic Asthma',       route: 'Oral' }
  ],
  20010: [
    { startDate: '2022-11-01', name: 'Omeprazole',    dose: '20 mg',   frequency: 'Once Daily',  indication: 'GERD',                  route: 'Oral' },
    { startDate: '2022-11-01', name: 'Metoprolol',    dose: '50 mg',   frequency: 'Twice Daily', indication: 'Hypertension',          route: 'Oral' }
  ]
};

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  for (const [id, medications] of Object.entries(medicationsData)) {
    const r = await Patient.updateOne({ patientid: Number(id) }, { $set: { medications } });
    console.log(`  Patient ${id}: ${medications.length} medications seeded (matched: ${r.matchedCount})`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => { console.error('Error:', err.message); process.exit(1); });
