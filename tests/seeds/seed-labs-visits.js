const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:admin@localhost:27017/patientrecords?authSource=admin';

// Define Patient schema matching server.js
const patientSchema = new mongoose.Schema({
  patientid: { type: Number, unique: true, required: true },
  firstname: { type: String },
  lastname: { type: String },
  demographics: [{ description: String, value: String }],
  vitals: [{ dateofobservation: String, observationcode: String, vital_description: String, unit: String, value: String }],
  labs: [{
    date: String,
    test_name: String,
    test_code: String,
    result: String,
    unit: String,
    reference_range: String,
    deletedAt: { type: Date, default: null }
  }],
  medications: [{ startDate: String, name: String, dose: String, frequency: String }],
  visits: [{
    date: String,
    visitType: { type: String, enum: ['hospital', 'clinic', 'office'] },
    reason: String,
    notes: String,
    provider_name: String,
    facility_name: String,
    discharge_status: String,
    deletedAt: { type: Date, default: null }
  }]
}, { timestamps: true });

const Patient = mongoose.model('Patient', patientSchema);

// Sample lab data
const sampleLabs = [
  { date: '2024-02-15', test_name: 'Complete Blood Count (CBC)', test_code: 'CBC', result: '4.5', unit: 'million cells/mcL', reference_range: '4.5-5.5' },
  { date: '2024-02-15', test_name: 'Hemoglobin', test_code: 'HGB', result: '14.2', unit: 'g/dL', reference_range: '13.5-17.5' },
  { date: '2024-02-15', test_name: 'White Blood Cell Count', test_code: 'WBC', result: '7.8', unit: 'K/uL', reference_range: '4.5-11.0' },
  { date: '2024-01-10', test_name: 'Glucose', test_code: 'GLU', result: '95', unit: 'mg/dL', reference_range: '70-100' },
  { date: '2024-01-10', test_name: 'Total Cholesterol', test_code: 'CHOL', result: '185', unit: 'mg/dL', reference_range: '<200' },
  { date: '2024-01-10', test_name: 'HDL Cholesterol', test_code: 'HDL', result: '55', unit: 'mg/dL', reference_range: '>40' },
  { date: '2024-01-10', test_name: 'LDL Cholesterol', test_code: 'LDL', result: '110', unit: 'mg/dL', reference_range: '<100' },
  { date: '2023-12-05', test_name: 'Creatinine', test_code: 'CREAT', result: '0.9', unit: 'mg/dL', reference_range: '0.7-1.3' },
  { date: '2023-12-05', test_name: 'ALT', test_code: 'ALT', result: '25', unit: 'U/L', reference_range: '7-56' },
  { date: '2023-12-05', test_name: 'AST', test_code: 'AST', result: '22', unit: 'U/L', reference_range: '10-40' },
  { date: '2023-11-20', test_name: 'TSH', test_code: 'TSH', result: '2.4', unit: 'mIU/L', reference_range: '0.4-4.0' }
];

// Sample visit data
const sampleVisits = [
  { date: '2024-03-10T14:00:00', visitType: 'clinic', reason: 'Annual physical examination', notes: 'Patient in good health. Recommended continued exercise and balanced diet.', provider_name: 'Dr. Sarah Johnson', facility_name: 'Main Street Clinic' },
  { date: '2024-02-15T09:30:00', visitType: 'clinic', reason: 'Follow-up for lab results', notes: 'Lab results reviewed. All values within normal range.', provider_name: 'Dr. Sarah Johnson', facility_name: 'Main Street Clinic' },
  { date: '2024-01-10T10:00:00', visitType: 'clinic', reason: 'Routine checkup and blood work', notes: 'Ordered comprehensive metabolic panel and lipid panel.', provider_name: 'Dr. Michael Chen', facility_name: 'Main Street Clinic' },
  { date: '2023-12-05T11:15:00', visitType: 'office', reason: 'Flu-like symptoms', notes: 'Diagnosed with viral infection. Recommended rest and hydration.', provider_name: 'Dr. Emily Rodriguez', facility_name: 'Urgent Care Center' },
  { date: '2023-10-20T15:30:00', visitType: 'clinic', reason: 'Medication refill and consultation', notes: 'Refilled prescriptions. Discussed treatment plan.', provider_name: 'Dr. Sarah Johnson', facility_name: 'Main Street Clinic' },
  { date: '2023-08-15T08:00:00', visitType: 'hospital', reason: 'Minor surgery - mole removal', notes: 'Successful removal of benign mole. Patient discharged same day.', provider_name: 'Dr. Robert Martinez', facility_name: 'General Hospital', discharge_status: 'Discharged Home' }
];

// Future visits
const futureVisits = [
  { date: '2024-06-15T10:00:00', visitType: 'clinic', reason: 'Annual physical examination', notes: 'Scheduled follow-up appointment', provider_name: 'Dr. Sarah Johnson', facility_name: 'Main Street Clinic' },
  { date: '2024-04-20T14:30:00', visitType: 'clinic', reason: 'Routine checkup', notes: '', provider_name: 'Dr. Michael Chen', facility_name: 'Main Street Clinic' }
];

async function seedLabsAndVisits() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get all patients
    const patients = await Patient.find({});
    console.log(`Found ${patients.length} patients`);

    if (patients.length === 0) {
      console.log('No patients found. Please seed patients first.');
      process.exit(0);
    }

    for (const patient of patients) {
      console.log(`\nAdding data for patient ${patient.patientid}: ${patient.firstname} ${patient.lastname}`);
      
      // Add labs if not already present
      if (!patient.labs || patient.labs.length === 0) {
        patient.labs = sampleLabs.map(lab => ({ ...lab }));
        console.log(`  Added ${patient.labs.length} lab results`);
      } else {
        console.log(`  Patient already has ${patient.labs.length} lab results`);
      }

      // Add visits if not already present
      if (!patient.visits || patient.visits.length === 0) {
        patient.visits = [...sampleVisits, ...futureVisits].map(visit => ({ ...visit }));
        console.log(`  Added ${patient.visits.length} visits`);
      } else {
        console.log(`  Patient already has ${patient.visits.length} visits`);
      }

      await patient.save();
    }

    console.log('\n✅ Successfully seeded lab and visit data for all patients');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

seedLabsAndVisits();
