/**
 * seed-labs.js
 * Seeds lab results for each patient (IDs 20001-20010).
 * Schema reference: date, test_name, test_code, result, unit, reference_range
 * Run AFTER seed-patients.js.
 */
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:admin@localhost:27017/patientrecords?authSource=admin';
const Patient = mongoose.model('Patient', new mongoose.Schema({ patientid: Number }, { strict: false }));

// Add or modify lab entries per patient here.
const labsData = {
  20001: [
    { date: '2024-02-15', test_name: 'Complete Blood Count',  test_code: 'CBC',   result: '4.5',  unit: 'M/uL',     reference_range: '4.5-11.0' },
    { date: '2024-02-15', test_name: 'Hemoglobin',            test_code: 'HGB',   result: '13.8', unit: 'g/dL',     reference_range: '12.0-16.0' },
    { date: '2024-01-10', test_name: 'Glucose',               test_code: 'GLU',   result: '95',   unit: 'mg/dL',    reference_range: '70-100' },
    { date: '2024-01-10', test_name: 'Hemoglobin A1C',        test_code: 'HBA1C', result: '5.2',  unit: '%',        reference_range: '<5.7' },
    { date: '2024-01-10', test_name: 'Total Cholesterol',     test_code: 'CHOL',  result: '185',  unit: 'mg/dL',    reference_range: '<200' },
    { date: '2023-12-05', test_name: 'Creatinine',            test_code: 'CREAT', result: '0.8',  unit: 'mg/dL',    reference_range: '0.6-1.2' }
  ],
  20002: [
    { date: '2024-02-15', test_name: 'Complete Blood Count',  test_code: 'CBC',   result: '6.8',  unit: 'M/uL',     reference_range: '4.5-11.0' },
    { date: '2024-02-15', test_name: 'Hemoglobin',            test_code: 'HGB',   result: '15.1', unit: 'g/dL',     reference_range: '13.5-17.5' },
    { date: '2024-01-10', test_name: 'Glucose',               test_code: 'GLU',   result: '142',  unit: 'mg/dL',    reference_range: '70-100' },
    { date: '2024-01-10', test_name: 'Hemoglobin A1C',        test_code: 'HBA1C', result: '6.8',  unit: '%',        reference_range: '<5.7' },
    { date: '2024-01-10', test_name: 'LDL Cholesterol',       test_code: 'LDL',   result: '148',  unit: 'mg/dL',    reference_range: '<100' },
    { date: '2023-12-05', test_name: 'Creatinine',            test_code: 'CREAT', result: '1.0',  unit: 'mg/dL',    reference_range: '0.7-1.3' }
  ],
  20003: [
    { date: '2024-02-15', test_name: 'Complete Blood Count',  test_code: 'CBC',   result: '4.8',  unit: 'M/uL',     reference_range: '4.5-11.0' },
    { date: '2024-01-10', test_name: 'Glucose',               test_code: 'GLU',   result: '88',   unit: 'mg/dL',    reference_range: '70-100' },
    { date: '2024-01-10', test_name: 'Hemoglobin A1C',        test_code: 'HBA1C', result: '4.9',  unit: '%',        reference_range: '<5.7' },
    { date: '2024-01-10', test_name: 'TSH',                   test_code: 'TSH',   result: '2.1',  unit: 'mIU/L',    reference_range: '0.4-4.0' }
  ],
  20004: [
    { date: '2024-02-15', test_name: 'Complete Blood Count',  test_code: 'CBC',   result: '7.2',  unit: 'M/uL',     reference_range: '4.5-11.0' },
    { date: '2024-01-10', test_name: 'Glucose',               test_code: 'GLU',   result: '156',  unit: 'mg/dL',    reference_range: '70-100' },
    { date: '2024-01-10', test_name: 'Hemoglobin A1C',        test_code: 'HBA1C', result: '7.5',  unit: '%',        reference_range: '<5.7' },
    { date: '2024-01-10', test_name: 'BNP',                   test_code: 'BNP',   result: '310',  unit: 'pg/mL',    reference_range: '<100' },
    { date: '2023-12-05', test_name: 'Creatinine',            test_code: 'CREAT', result: '1.1',  unit: 'mg/dL',    reference_range: '0.7-1.3' },
    { date: '2023-12-05', test_name: 'INR',                   test_code: 'INR',   result: '2.4',  unit: '',         reference_range: '2.0-3.0' }
  ],
  20005: [
    { date: '2024-02-15', test_name: 'Complete Blood Count',  test_code: 'CBC',   result: '5.1',  unit: 'M/uL',     reference_range: '4.5-11.0' },
    { date: '2024-01-10', test_name: 'Glucose',               test_code: 'GLU',   result: '102',  unit: 'mg/dL',    reference_range: '70-100' },
    { date: '2024-01-10', test_name: 'Hemoglobin A1C',        test_code: 'HBA1C', result: '5.8',  unit: '%',        reference_range: '<5.7' },
    { date: '2024-01-10', test_name: 'TSH',                   test_code: 'TSH',   result: '6.8',  unit: 'mIU/L',    reference_range: '0.4-4.0' }
  ],
  20006: [
    { date: '2024-02-15', test_name: 'Complete Blood Count',  test_code: 'CBC',   result: '5.5',  unit: 'M/uL',     reference_range: '4.5-11.0' },
    { date: '2024-01-10', test_name: 'Glucose',               test_code: 'GLU',   result: '98',   unit: 'mg/dL',    reference_range: '70-100' },
    { date: '2024-01-10', test_name: 'Total Cholesterol',     test_code: 'CHOL',  result: '200',  unit: 'mg/dL',    reference_range: '<200' },
    { date: '2024-01-10', test_name: 'LDL Cholesterol',       test_code: 'LDL',   result: '128',  unit: 'mg/dL',    reference_range: '<100' },
    { date: '2024-01-10', test_name: 'HDL Cholesterol',       test_code: 'HDL',   result: '52',   unit: 'mg/dL',    reference_range: '>40' }
  ],
  20007: [
    { date: '2024-02-15', test_name: 'Complete Blood Count',  test_code: 'CBC',   result: '4.2',  unit: 'M/uL',     reference_range: '4.5-11.0' },
    { date: '2024-01-10', test_name: 'Glucose',               test_code: 'GLU',   result: '85',   unit: 'mg/dL',    reference_range: '70-100' },
    { date: '2024-01-10', test_name: 'TSH',                   test_code: 'TSH',   result: '2.1',  unit: 'mIU/L',    reference_range: '0.4-4.0' },
    { date: '2024-01-10', test_name: 'Total IgE',             test_code: 'IGE',   result: '240',  unit: 'IU/mL',    reference_range: '<100' }
  ],
  20008: [
    { date: '2024-02-15', test_name: 'Complete Blood Count',  test_code: 'CBC',   result: '6.2',  unit: 'M/uL',     reference_range: '4.5-11.0' },
    { date: '2024-01-10', test_name: 'Glucose',               test_code: 'GLU',   result: '118',  unit: 'mg/dL',    reference_range: '70-100' },
    { date: '2024-01-10', test_name: 'Creatinine',            test_code: 'CREAT', result: '1.1',  unit: 'mg/dL',    reference_range: '0.6-1.2' },
    { date: '2024-01-10', test_name: 'ALT',                   test_code: 'ALT',   result: '25',   unit: 'U/L',      reference_range: '7-56' },
    { date: '2024-01-10', test_name: 'AST',                   test_code: 'AST',   result: '22',   unit: 'U/L',      reference_range: '10-40' }
  ],
  20009: [
    { date: '2024-02-15', test_name: 'Complete Blood Count',  test_code: 'CBC',   result: '4.9',  unit: 'M/uL',     reference_range: '4.5-11.0' },
    { date: '2024-01-10', test_name: 'Glucose',               test_code: 'GLU',   result: '93',   unit: 'mg/dL',    reference_range: '70-100' },
    { date: '2024-01-10', test_name: 'Hemoglobin A1C',        test_code: 'HBA1C', result: '5.5',  unit: '%',        reference_range: '<5.7' },
    { date: '2024-01-10', test_name: 'IgE (Specific)',        test_code: 'IGE',   result: '185',  unit: 'IU/mL',    reference_range: '<100' }
  ],
  20010: [
    { date: '2024-02-15', test_name: 'Complete Blood Count',  test_code: 'CBC',   result: '5.8',  unit: 'M/uL',     reference_range: '4.5-11.0' },
    { date: '2024-01-10', test_name: 'Glucose',               test_code: 'GLU',   result: '110',  unit: 'mg/dL',    reference_range: '70-100' },
    { date: '2024-01-10', test_name: 'PSA',                   test_code: 'PSA',   result: '1.2',  unit: 'ng/mL',    reference_range: '<4.0' },
    { date: '2024-01-10', test_name: 'Total Cholesterol',     test_code: 'CHOL',  result: '212',  unit: 'mg/dL',    reference_range: '<200' },
    { date: '2023-12-05', test_name: 'Creatinine',            test_code: 'CREAT', result: '0.9',  unit: 'mg/dL',    reference_range: '0.7-1.3' }
  ]
};

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  for (const [id, labs] of Object.entries(labsData)) {
    const r = await Patient.updateOne({ patientid: Number(id) }, { $set: { labs } });
    console.log(`  Patient ${id}: ${labs.length} labs seeded (matched: ${r.matchedCount})`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => { console.error('Error:', err.message); process.exit(1); });
