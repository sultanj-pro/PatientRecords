const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:admin@localhost:27017/patientrecords?authSource=admin';

// Define Patient schema
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
      percentile: String,
      deletedAt: { type: Date, default: null }
    }
  ],
  labs: [
    {
      date: String,
      test_name: String,
      test_code: String,
      result: String,
      unit: String,
      reference_range: String,
      deletedAt: { type: Date, default: null }
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
  visits: [
    {
      date: String,
      visitType: String,
      reason: String,
      notes: String,
      provider_name: String,
      facility_name: String,
      discharge_status: String
    }
  ]
}, { timestamps: true });

const Patient = mongoose.model('Patient', patientSchema);

// Patient base data
const patientBaseData = [
  {
    patientid: 20001,
    firstname: 'Sarah',
    lastname: 'Mitchell',
    dob: '1985-03-15',
    gender: 'Female'
  },
  {
    patientid: 20002,
    firstname: 'John',
    lastname: 'Anderson',
    dob: '1978-07-22',
    gender: 'Male'
  },
  {
    patientid: 20003,
    firstname: 'Emily',
    lastname: 'Rodriguez',
    dob: '1992-11-08',
    gender: 'Female'
  },
  {
    patientid: 20004,
    firstname: 'Michael',
    lastname: 'Thompson',
    dob: '1965-05-30',
    gender: 'Male'
  },
  {
    patientid: 20005,
    firstname: 'Jennifer',
    lastname: 'Kumar',
    dob: '1988-09-14',
    gender: 'Female'
  }
];

function generateVitals(patientId) {
  const vitalVariations = {
    20001: [
      { vital_description: 'Temperature', value: '98.2', unit: '°F' },
      { vital_description: 'Blood Pressure (Systolic)', value: '118', unit: 'mmHg' },
      { vital_description: 'Blood Pressure (Diastolic)', value: '76', unit: 'mmHg' },
      { vital_description: 'Heart Rate', value: '72', unit: 'bpm' },
      { vital_description: 'Respiratory Rate', value: '16', unit: 'breaths/min' }
    ],
    20002: [
      { vital_description: 'Temperature', value: '99.1', unit: '°F' },
      { vital_description: 'Blood Pressure (Systolic)', value: '142', unit: 'mmHg' },
      { vital_description: 'Blood Pressure (Diastolic)', value: '88', unit: 'mmHg' },
      { vital_description: 'Heart Rate', value: '82', unit: 'bpm' },
      { vital_description: 'Respiratory Rate', value: '18', unit: 'breaths/min' }
    ],
    20003: [
      { vital_description: 'Temperature', value: '97.8', unit: '°F' },
      { vital_description: 'Blood Pressure (Systolic)', value: '110', unit: 'mmHg' },
      { vital_description: 'Blood Pressure (Diastolic)', value: '68', unit: 'mmHg' },
      { vital_description: 'Heart Rate', value: '65', unit: 'bpm' },
      { vital_description: 'Respiratory Rate', value: '14', unit: 'breaths/min' }
    ],
    20004: [
      { vital_description: 'Temperature', value: '98.6', unit: '°F' },
      { vital_description: 'Blood Pressure (Systolic)', value: '156', unit: 'mmHg' },
      { vital_description: 'Blood Pressure (Diastolic)', value: '96', unit: 'mmHg' },
      { vital_description: 'Heart Rate', value: '88', unit: 'bpm' },
      { vital_description: 'Respiratory Rate', value: '20', unit: 'breaths/min' }
    ],
    20005: [
      { vital_description: 'Temperature', value: '98.4', unit: '°F' },
      { vital_description: 'Blood Pressure (Systolic)', value: '124', unit: 'mmHg' },
      { vital_description: 'Blood Pressure (Diastolic)', value: '80', unit: 'mmHg' },
      { vital_description: 'Heart Rate', value: '70', unit: 'bpm' },
      { vital_description: 'Respiratory Rate', value: '16', unit: 'breaths/min' }
    ]
  };

  return (vitalVariations[patientId] || vitalVariations[20001]).map(v => ({
    dateofobservation: new Date().toISOString(),
    observationcode: 'vital',
    observationcodesystem: 'LOINC',
    organizationname: 'Springfield General Hospital',
    vital_description: v.vital_description,
    unit: v.unit,
    value: v.value,
    percentile: '50'
  }));
}

function generateLabs(patientId) {
  const labVariations = {
    20001: [
      { test_name: 'Complete Blood Count', value: '4.5', unit: 'M/uL', reference: '4.5-11.0' },
      { test_name: 'Glucose', value: '95', unit: 'mg/dL', reference: '70-100' },
      { test_name: 'Hemoglobin A1C', value: '5.2', unit: '%', reference: '<5.7' }
    ],
    20002: [
      { test_name: 'Complete Blood Count', value: '6.8', unit: 'M/uL', reference: '4.5-11.0' },
      { test_name: 'Glucose', value: '142', unit: 'mg/dL', reference: '70-100' },
      { test_name: 'Hemoglobin A1C', value: '6.8', unit: '%', reference: '<5.7' }
    ],
    20003: [
      { test_name: 'Complete Blood Count', value: '4.8', unit: 'M/uL', reference: '4.5-11.0' },
      { test_name: 'Glucose', value: '88', unit: 'mg/dL', reference: '70-100' },
      { test_name: 'Hemoglobin A1C', value: '4.9', unit: '%', reference: '<5.7' }
    ],
    20004: [
      { test_name: 'Complete Blood Count', value: '7.2', unit: 'M/uL', reference: '4.5-11.0' },
      { test_name: 'Glucose', value: '156', unit: 'mg/dL', reference: '70-100' },
      { test_name: 'Hemoglobin A1C', value: '7.5', unit: '%', reference: '<5.7' }
    ],
    20005: [
      { test_name: 'Complete Blood Count', value: '5.1', unit: 'M/uL', reference: '4.5-11.0' },
      { test_name: 'Glucose', value: '102', unit: 'mg/dL', reference: '70-100' },
      { test_name: 'Hemoglobin A1C', value: '5.8', unit: '%', reference: '<5.7' }
    ]
  };

  return (labVariations[patientId] || labVariations[20001]).map(l => ({
    date: new Date().toISOString().split('T')[0],
    test_name: l.test_name,
    test_code: 'LAB-001',
    result: l.value,
    unit: l.unit,
    reference_range: l.reference
  }));
}

function generateMedications(patientId) {
  const medVariations = {
    20001: [
      { name: 'Vitamin D3', dose: '1000 IU', frequency: 'Daily', indication: 'Deficiency Prevention' }
    ],
    20002: [
      { name: 'Lisinopril', dose: '10 mg', frequency: 'Once Daily', indication: 'Hypertension' },
      { name: 'Metformin', dose: '500 mg', frequency: 'Twice Daily', indication: 'Type 2 Diabetes' },
      { name: 'Atorvastatin', dose: '20 mg', frequency: 'Once Daily', indication: 'High Cholesterol' }
    ],
    20003: [
      { name: 'Prenatal Vitamin', dose: '1 tablet', frequency: 'Once Daily', indication: 'Pregnancy Support' }
    ],
    20004: [
      { name: 'Amlodipine', dose: '5 mg', frequency: 'Once Daily', indication: 'Hypertension' },
      { name: 'Furosemide', dose: '40 mg', frequency: 'Once Daily', indication: 'Edema' },
      { name: 'Warfarin', dose: '5 mg', frequency: 'Once Daily', indication: 'Atrial Fibrillation' },
      { name: 'Digoxin', dose: '0.25 mg', frequency: 'Once Daily', indication: 'Heart Failure' }
    ],
    20005: [
      { name: 'Levothyroxine', dose: '50 mcg', frequency: 'Once Daily', indication: 'Hypothyroidism' },
      { name: 'Sertraline', dose: '50 mg', frequency: 'Once Daily', indication: 'Depression' }
    ]
  };

  return (medVariations[patientId] || medVariations[20001]).map(m => ({
    startDate: '2024-01-15',
    name: m.name,
    dose: m.dose,
    frequency: m.frequency,
    indication: m.indication,
    route: 'Oral'
  }));
}

function generateVisits(patientId) {
  const visitVariations = {
    20001: [
      { date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], reason: 'Routine checkup', provider: 'Dr. Smith' }
    ],
    20002: [
      { date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], reason: 'Hypertension monitoring', provider: 'Dr. Johnson' },
      { date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], reason: 'Diabetes follow-up', provider: 'Dr. Patel' }
    ],
    20003: [
      { date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], reason: 'Prenatal visit (28 weeks)', provider: 'Dr. Williams' }
    ],
    20004: [
      { date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], reason: 'Heart failure follow-up', provider: 'Dr. Brown' },
      { date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], reason: 'INR check', provider: 'Dr. Davis' }
    ],
    20005: [
      { date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], reason: 'Thyroid function check', provider: 'Dr. Miller' }
    ]
  };

  return (visitVariations[patientId] || visitVariations[20001]).map(v => ({
    date: v.date,
    visitType: 'office',
    reason: v.reason,
    provider_name: v.provider,
    notes: 'Patient in stable condition'
  }));
}

async function seedVariedPatients() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await Patient.deleteMany({});
    console.log('Cleared existing patient data');

    // Create patients with varied data
    const patients = patientBaseData.map(p => ({
      patientid: p.patientid,
      firstname: p.firstname,
      lastname: p.lastname,
      demographics: [
        { description: 'Date of Birth', value: p.dob },
        { description: 'Gender', value: p.gender },
        { description: 'Blood Type', value: p.patientid === 20001 ? 'A+' : p.patientid === 20002 ? 'B-' : p.patientid === 20003 ? 'O+' : p.patientid === 20004 ? 'AB+' : 'A-' },
        { description: 'Phone', value: `(555) 123-${(p.patientid % 10000).toString().padStart(4, '0')}` },
        { description: 'Email', value: `${p.firstname.toLowerCase()}.${p.lastname.toLowerCase()}@email.com` },
        { description: 'Address', value: `${p.patientid - 20000} Main Street, Springfield, IL 62701` }
      ],
      vitals: generateVitals(p.patientid),
      labs: generateLabs(p.patientid),
      medications: generateMedications(p.patientid),
      visits: generateVisits(p.patientid)
    }));

    const result = await Patient.insertMany(patients);
    console.log(`Successfully seeded ${result.length} patients with varied data`);

    console.log('\nPatient Summary:');
    result.forEach(p => {
      console.log(`- ${p.firstname} ${p.lastname} (ID: ${p.patientid}): ${p.medications.length} meds, ${p.vitals.length} vitals, ${p.labs.length} labs, ${p.visits.length} visits`);
    });

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error seeding data:', err.message);
    process.exit(1);
  }
}

seedVariedPatients();
