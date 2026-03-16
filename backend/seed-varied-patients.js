const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:admin@localhost:27017/patientrecords?authSource=admin';

// Define Patient schema
const patientSchema = new mongoose.Schema({
  patientid: { type: Number, unique: true, required: true },
  firstname: { type: String },
  lastname: { type: String },
  demographics: {
    // Basic Information
    legalName: {
      first: String,
      middle: String,
      last: String
    },
    preferredName: String,
    dateOfBirth: Date,
    gender: { type: String, enum: ['Male', 'Female'] },
    sexAssignedAtBirth: { type: String, enum: ['Male', 'Female'] },
    
    // Identification
    ssn: String, // Will be masked in responses
    mrn: String,
    bloodType: String,
    
    // Contact Information
    primaryPhone: String,
    secondaryPhone: String,
    email: String,
    address: {
      street: String,
      city: String,
      state: String,
      zip: String,
      country: String
    },
    
    // Emergency Contacts
    emergencyContacts: [
      {
        name: String,
        relationship: String,
        phone: String,
        isPrimary: { type: Boolean, default: false }
      }
    ],
    
    // Cultural & Social
    preferredLanguage: String,
    race: String,
    ethnicity: String,
    maritalStatus: String,
    
    // Insurance
    insurance: [
      {
        type: { type: String, enum: ['primary', 'secondary', 'tertiary'] },
        provider: String,
        policyNumber: String,
        groupNumber: String,
        subscriberName: String,
        subscriberRelationship: String,
        effectiveDate: Date,
        expirationDate: Date
      }
    ]
  },
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
  ],
  allergies: [
    {
      type: String,
      substance: String,
      severity: String,
      reaction: String,
      dateReported: Date
    }
  ]
}, { timestamps: true });

const Patient = mongoose.model('Patient', patientSchema);

// Patient base data with comprehensive demographics
const patientBaseData = [
  {
    patientid: 20001,
    firstname: 'Sarah',
    lastname: 'Mitchell',
    demographics: {
      legalName: { first: 'Sarah', middle: 'Marie', last: 'Mitchell' },
      preferredName: 'Sarah',
      dateOfBirth: new Date('1985-03-15'),
      gender: 'Female',
      sexAssignedAtBirth: 'Female',
      ssn: '123-45-6789',
      mrn: 'MRN-20001',
      bloodType: 'A+',
      primaryPhone: '(555) 123-0001',
      secondaryPhone: '(555) 234-0001',
      email: 'sarah.mitchell@email.com',
      address: {
        street: '1 Main Street',
        city: 'Springfield',
        state: 'IL',
        zip: '62701',
        country: 'USA'
      },
      emergencyContacts: [
        { name: 'John Mitchell', relationship: 'Spouse', phone: '(555) 345-0001', isPrimary: true },
        { name: 'Robert Mitchell', relationship: 'Father', phone: '(555) 456-0001', isPrimary: false }
      ],
      preferredLanguage: 'English',
      race: 'White',
      ethnicity: 'Non-Hispanic',
      maritalStatus: 'Married',
      insurance: [
        {
          type: 'primary',
          provider: 'Blue Cross Blue Shield',
          policyNumber: 'BC123456789',
          groupNumber: 'GRP-5001',
          subscriberName: 'Sarah Mitchell',
          subscriberRelationship: 'Self',
          effectiveDate: new Date('2025-01-01'),
          expirationDate: new Date('2026-12-31')
        }
      ]
    },
    allergies: [
      { type: 'drug', substance: 'Penicillin', severity: 'severe', reaction: 'Anaphylaxis', dateReported: new Date('2020-05-10') },
      { type: 'food', substance: 'Shellfish', severity: 'moderate', reaction: 'Hives and swelling' }
    ]
  },
  {
    patientid: 20002,
    firstname: 'John',
    lastname: 'Anderson',
    demographics: {
      legalName: { first: 'John', middle: 'David', last: 'Anderson' },
      preferredName: 'John',
      dateOfBirth: new Date('1978-07-22'),
      gender: 'Male',
      sexAssignedAtBirth: 'Male',
      ssn: '234-56-7890',
      mrn: 'MRN-20002',
      bloodType: 'B-',
      primaryPhone: '(555) 123-0002',
      secondaryPhone: '',
      email: 'john.anderson@email.com',
      address: {
        street: '2 Main Street',
        city: 'Springfield',
        state: 'IL',
        zip: '62701',
        country: 'USA'
      },
      emergencyContacts: [
        { name: 'Karen Anderson', relationship: 'Sister', phone: '(555) 345-0002', isPrimary: true }
      ],
      preferredLanguage: 'English',
      race: 'White',
      ethnicity: 'Non-Hispanic',
      maritalStatus: 'Single',
      insurance: [
        {
          type: 'primary',
          provider: 'Aetna',
          policyNumber: 'AET987654321',
          groupNumber: 'GRP-5002',
          subscriberName: 'John Anderson',
          subscriberRelationship: 'Self',
          effectiveDate: new Date('2024-06-01'),
          expirationDate: new Date('2027-05-31')
        },
        {
          type: 'secondary',
          provider: 'United Healthcare',
          policyNumber: 'UH456123789',
          groupNumber: 'GRP-5002B',
          subscriberName: 'John Anderson',
          subscriberRelationship: 'Self',
          effectiveDate: new Date('2024-09-01'),
          expirationDate: new Date('2027-08-31')
        }
      ]
    },
    allergies: [
      { type: 'drug', substance: 'Lisinopril', severity: 'moderate', reaction: 'Persistent dry cough' }
    ]
  },
  {
    patientid: 20003,
    firstname: 'Emily',
    lastname: 'Rodriguez',
    demographics: {
      legalName: { first: 'Emily', middle: 'Grace', last: 'Rodriguez' },
      preferredName: 'Em',
      dateOfBirth: new Date('1992-11-08'),
      gender: 'Female',
      sexAssignedAtBirth: 'Female',
      ssn: '345-67-8901',
      mrn: 'MRN-20003',
      bloodType: 'O+',
      primaryPhone: '(555) 123-0003',
      secondaryPhone: '(555) 234-0003',
      email: 'emily.r@email.com',
      address: {
        street: '3 Main Street',
        city: 'Springfield',
        state: 'IL',
        zip: '62701',
        country: 'USA'
      },
      emergencyContacts: [
        { name: 'Maria Rodriguez', relationship: 'Mother', phone: '(555) 345-0003', isPrimary: true },
        { name: 'Carlos Rodriguez', relationship: 'Brother', phone: '(555) 456-0003', isPrimary: false }
      ],
      preferredLanguage: 'Spanish',
      race: 'Hispanic',
      ethnicity: 'Hispanic',
      maritalStatus: 'Married',
      insurance: [
        {
          type: 'primary',
          provider: 'Cigna',
          policyNumber: 'CIG234567890',
          groupNumber: 'GRP-5003',
          subscriberName: 'Emily Rodriguez',
          subscriberRelationship: 'Self',
          effectiveDate: new Date('2025-02-01'),
          expirationDate: new Date('2026-01-31')
        }
      ]
    },
    allergies: []
  },
  {
    patientid: 20004,
    firstname: 'Michael',
    lastname: 'Thompson',
    demographics: {
      legalName: { first: 'Michael', middle: 'James', last: 'Thompson' },
      preferredName: 'Mike',
      dateOfBirth: new Date('1965-05-30'),
      gender: 'Male',
      sexAssignedAtBirth: 'Male',
      ssn: '456-78-9012',
      mrn: 'MRN-20004',
      bloodType: 'AB+',
      primaryPhone: '(555) 123-0004',
      secondaryPhone: '(555) 234-0004',
      email: 'michael.thompson@email.com',
      address: {
        street: '4 Main Street',
        city: 'Springfield',
        state: 'IL',
        zip: '62701',
        country: 'USA'
      },
      emergencyContacts: [
        { name: 'Linda Thompson', relationship: 'Spouse', phone: '(555) 345-0004', isPrimary: true },
        { name: 'David Thompson', relationship: 'Son', phone: '(555) 456-0004', isPrimary: false }
      ],
      preferredLanguage: 'English',
      race: 'White',
      ethnicity: 'Non-Hispanic',
      maritalStatus: 'Married',
      insurance: [
        {
          type: 'primary',
          provider: 'Humana',
          policyNumber: 'HUM567890123',
          groupNumber: 'GRP-5004',
          subscriberName: 'Michael Thompson',
          subscriberRelationship: 'Self',
          effectiveDate: new Date('2024-01-01'),
          expirationDate: new Date('2026-12-31')
        },
        {
          type: 'secondary',
          provider: 'Medicare',
          policyNumber: 'MED456789123',
          groupNumber: 'MEDICARE',
          subscriberName: 'Michael Thompson',
          subscriberRelationship: 'Self',
          effectiveDate: new Date('2023-05-30'),
          expirationDate: new Date('2030-05-30')
        }
      ]
    },
    allergies: [
      { type: 'environmental', substance: 'Latex', severity: 'severe', reaction: 'Contact dermatitis and swelling' }
    ]
  },
  {
    patientid: 20005,
    firstname: 'Jennifer',
    lastname: 'Kumar',
    demographics: {
      legalName: { first: 'Jennifer', middle: 'Lynn', last: 'Kumar' },
      preferredName: 'Jennifer',
      dateOfBirth: new Date('1988-09-14'),
      gender: 'Female',
      sexAssignedAtBirth: 'Female',
      ssn: '567-89-0123',
      mrn: 'MRN-20005',
      bloodType: 'A-',
      primaryPhone: '(555) 123-0005',
      secondaryPhone: '',
      email: 'jennifer.kumar@email.com',
      address: {
        street: '5 Main Street',
        city: 'Springfield',
        state: 'IL',
        zip: '62701',
        country: 'USA'
      },
      emergencyContacts: [
        { name: 'Amit Kumar', relationship: 'Spouse', phone: '(555) 345-0005', isPrimary: true }
      ],
      preferredLanguage: 'English',
      race: 'Asian',
      ethnicity: 'Indian',
      maritalStatus: 'Married',
      insurance: [
        {
          type: 'primary',
          provider: 'Oxford Health Plans',
          policyNumber: 'OXF678901234',
          groupNumber: 'GRP-5005',
          subscriberName: 'Jennifer Kumar',
          subscriberRelationship: 'Self',
          effectiveDate: new Date('2025-03-01'),
          expirationDate: new Date('2027-02-28')
        }
      ]
    },
    allergies: [
      { type: 'drug', substance: 'Aspirin', severity: 'mild', reaction: 'Stomach upset' },
      { type: 'food', substance: 'Peanuts', severity: 'severe', reaction: 'Anaphylaxis', dateReported: new Date('2018-03-22') }
    ]
  },
  {
    patientid: 20006,
    firstname: 'David',
    lastname: 'Wilson',
    demographics: {
      legalName: { first: 'David', middle: 'Christopher', last: 'Wilson' },
      preferredName: 'Dave',
      dateOfBirth: new Date('1975-12-25'),
      gender: 'Male',
      sexAssignedAtBirth: 'Male',
      ssn: '678-90-1234',
      mrn: 'MRN-20006',
      bloodType: 'O-',
      primaryPhone: '(555) 123-0006',
      secondaryPhone: '(555) 234-0006',
      email: 'david.wilson@email.com',
      address: {
        street: '6 Main Street',
        city: 'Springfield',
        state: 'IL',
        zip: '62701',
        country: 'USA'
      },
      emergencyContacts: [
        { name: 'Patricia Wilson', relationship: 'Spouse', phone: '(555) 345-0006', isPrimary: true }
      ],
      preferredLanguage: 'English',
      race: 'White',
      ethnicity: 'Non-Hispanic',
      maritalStatus: 'Married',
      insurance: [
        {
          type: 'primary',
          provider: 'Kaiser Permanente',
          policyNumber: 'KP789012345',
          groupNumber: 'GRP-5006',
          subscriberName: 'David Wilson',
          subscriberRelationship: 'Self',
          effectiveDate: new Date('2024-04-15'),
          expirationDate: new Date('2027-04-14')
        }
      ]
    },
    allergies: [
      { type: 'environmental', substance: 'Pollen', severity: 'mild', reaction: 'Allergic rhinitis' }
    ]
  },
  {
    patientid: 20007,
    firstname: 'Lisa',
    lastname: 'Chen',
    demographics: {
      legalName: { first: 'Lisa', middle: 'Marie', last: 'Chen' },
      preferredName: 'Lisa',
      dateOfBirth: new Date('1995-08-17'),
      gender: 'Female',
      sexAssignedAtBirth: 'Female',
      ssn: '789-01-2345',
      mrn: 'MRN-20007',
      bloodType: 'B+',
      primaryPhone: '(555) 123-0007',
      secondaryPhone: '',
      email: 'lisa.chen@email.com',
      address: {
        street: '7 Main Street',
        city: 'Springfield',
        state: 'IL',
        zip: '62701',
        country: 'USA'
      },
      emergencyContacts: [
        { name: 'Wei Chen', relationship: 'Father', phone: '(555) 345-0007', isPrimary: true },
        { name: 'Susan Chen', relationship: 'Mother', phone: '(555) 456-0007', isPrimary: false }
      ],
      preferredLanguage: 'English',
      race: 'Asian',
      ethnicity: 'Chinese',
      maritalStatus: 'Single',
      insurance: [
        {
          type: 'primary',
          provider: 'Blue Cross Blue Shield',
          policyNumber: 'BC234567890',
          groupNumber: 'GRP-5007',
          subscriberName: 'Lisa Chen',
          subscriberRelationship: 'Self',
          effectiveDate: new Date('2024-09-01'),
          expirationDate: new Date('2025-08-31')
        }
      ]
    },
    allergies: []
  },
  {
    patientid: 20008,
    firstname: 'Robert',
    lastname: 'Martinez',
    demographics: {
      legalName: { first: 'Robert', middle: 'Luis', last: 'Martinez' },
      preferredName: 'Roberto',
      dateOfBirth: new Date('1954-02-03'),
      gender: 'Male',
      sexAssignedAtBirth: 'Male',
      ssn: '890-12-3456',
      mrn: 'MRN-20008',
      bloodType: 'A+',
      primaryPhone: '(555) 123-0008',
      secondaryPhone: '(555) 234-0008',
      email: 'robert.martinez@email.com',
      address: {
        street: '8 Main Street',
        city: 'Springfield',
        state: 'IL',
        zip: '62701',
        country: 'USA'
      },
      emergencyContacts: [
        { name: 'Angela Martinez', relationship: 'Daughter', phone: '(555) 345-0008', isPrimary: true }
      ],
      preferredLanguage: 'Spanish',
      race: 'Hispanic',
      ethnicity: 'Puerto Rican',
      maritalStatus: 'Widowed',
      insurance: [
        {
          type: 'primary',
          provider: 'Medicare',
          policyNumber: 'MED123456789',
          groupNumber: 'MEDICARE',
          subscriberName: 'Robert Martinez',
          subscriberRelationship: 'Self',
          effectiveDate: new Date('2020-02-03'),
          expirationDate: new Date('2030-02-03')
        }
      ]
    },
    allergies: [
      { type: 'drug', substance: 'Codeine', severity: 'severe', reaction: 'Severe itching and hives' }
    ]
  },
  {
    patientid: 20009,
    firstname: 'Rebecca',
    lastname: 'Patterson',
    demographics: {
      legalName: { first: 'Rebecca', middle: 'Anne', last: 'Patterson' },
      preferredName: 'Becky',
      dateOfBirth: new Date('1982-06-19'),
      gender: 'Female',
      sexAssignedAtBirth: 'Female',
      ssn: '901-23-4567',
      mrn: 'MRN-20009',
      bloodType: 'AB-',
      primaryPhone: '(555) 123-0009',
      secondaryPhone: '(555) 234-0009',
      email: 'rebecca.p@email.com',
      address: {
        street: '9 Main Street',
        city: 'Springfield',
        state: 'IL',
        zip: '62701',
        country: 'USA'
      },
      emergencyContacts: [
        { name: 'Thomas Patterson', relationship: 'Spouse', phone: '(555) 345-0009', isPrimary: true },
        { name: 'Katherine Patterson', relationship: 'Daughter', phone: '(555) 456-0009', isPrimary: false }
      ],
      preferredLanguage: 'English',
      race: 'White',
      ethnicity: 'Non-Hispanic',
      maritalStatus: 'Married',
      insurance: [
        {
          type: 'primary',
          provider: 'Aetna',
          policyNumber: 'AET345678901',
          groupNumber: 'GRP-5009',
          subscriberName: 'Rebecca Patterson',
          subscriberRelationship: 'Self',
          effectiveDate: new Date('2025-01-01'),
          expirationDate: new Date('2026-12-31')
        }
      ]
    },
    allergies: [
      { type: 'environmental', substance: 'Dust mites', severity: 'moderate', reaction: 'Asthma attacks' }
    ]
  },
  {
    patientid: 20010,
    firstname: 'James',
    lastname: 'O\'Brien',
    demographics: {
      legalName: { first: 'James', middle: 'Patrick', last: 'O\'Brien' },
      preferredName: 'Jim',
      dateOfBirth: new Date('1970-11-11'),
      gender: 'Male',
      sexAssignedAtBirth: 'Male',
      ssn: '012-34-5678',
      mrn: 'MRN-20010',
      bloodType: 'B-',
      primaryPhone: '(555) 123-0010',
      secondaryPhone: '',
      email: 'james.obrien@email.com',
      address: {
        street: '10 Main Street',
        city: 'Springfield',
        state: 'IL',
        zip: '62701',
        country: 'USA'
      },
      emergencyContacts: [
        { name: 'Margaret O\'Brien', relationship: 'Sister', phone: '(555) 345-0010', isPrimary: true }
      ],
      preferredLanguage: 'English',
      race: 'White',
      ethnicity: 'Irish',
      maritalStatus: 'Divorced',
      insurance: [
        {
          type: 'primary',
          provider: 'CIGNA',
          policyNumber: 'CIG567890123',
          groupNumber: 'GRP-5010',
          subscriberName: 'James O\'Brien',
          subscriberRelationship: 'Self',
          effectiveDate: new Date('2024-07-01'),
          expirationDate: new Date('2027-06-30')
        }
      ]
    },
    allergies: [
      { type: 'food', substance: 'Dairy', severity: 'mild', reaction: 'Lactose intolerance' }
    ]
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
    ],
    20006: [
      { vital_description: 'Temperature', value: '98.5', unit: '°F' },
      { vital_description: 'Blood Pressure (Systolic)', value: '128', unit: 'mmHg' },
      { vital_description: 'Blood Pressure (Diastolic)', value: '82', unit: 'mmHg' },
      { vital_description: 'Heart Rate', value: '68', unit: 'bpm' },
      { vital_description: 'Respiratory Rate', value: '16', unit: 'breaths/min' }
    ],
    20007: [
      { vital_description: 'Temperature', value: '98.0', unit: '°F' },
      { vital_description: 'Blood Pressure (Systolic)', value: '112', unit: 'mmHg' },
      { vital_description: 'Blood Pressure (Diastolic)', value: '72', unit: 'mmHg' },
      { vital_description: 'Heart Rate', value: '62', unit: 'bpm' },
      { vital_description: 'Respiratory Rate', value: '15', unit: 'breaths/min' }
    ],
    20008: [
      { vital_description: 'Temperature', value: '98.7', unit: '°F' },
      { vital_description: 'Blood Pressure (Systolic)', value: '138', unit: 'mmHg' },
      { vital_description: 'Blood Pressure (Diastolic)', value: '84', unit: 'mmHg' },
      { vital_description: 'Heart Rate', value: '76', unit: 'bpm' },
      { vital_description: 'Respiratory Rate', value: '17', unit: 'breaths/min' }
    ],
    20009: [
      { vital_description: 'Temperature', value: '98.3', unit: '°F' },
      { vital_description: 'Blood Pressure (Systolic)', value: '120', unit: 'mmHg' },
      { vital_description: 'Blood Pressure (Diastolic)', value: '78', unit: 'mmHg' },
      { vital_description: 'Heart Rate', value: '74', unit: 'bpm' },
      { vital_description: 'Respiratory Rate', value: '16', unit: 'breaths/min' }
    ],
    20010: [
      { vital_description: 'Temperature', value: '99.0', unit: '°F' },
      { vital_description: 'Blood Pressure (Systolic)', value: '132', unit: 'mmHg' },
      { vital_description: 'Blood Pressure (Diastolic)', value: '86', unit: 'mmHg' },
      { vital_description: 'Heart Rate', value: '80', unit: 'bpm' },
      { vital_description: 'Respiratory Rate', value: '18', unit: 'breaths/min' }
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
    ],
    20006: [
      { test_name: 'Complete Blood Count', value: '5.5', unit: 'M/uL', reference: '4.5-11.0' },
      { test_name: 'Glucose', value: '98', unit: 'mg/dL', reference: '70-100' },
      { test_name: 'Cholesterol Total', value: '200', unit: 'mg/dL', reference: '<200' }
    ],
    20007: [
      { test_name: 'Complete Blood Count', value: '4.2', unit: 'M/uL', reference: '4.5-11.0' },
      { test_name: 'Glucose', value: '85', unit: 'mg/dL', reference: '70-100' },
      { test_name: 'Thyroid (TSH)', value: '2.1', unit: 'mIU/L', reference: '0.4-4.0' }
    ],
    20008: [
      { test_name: 'Complete Blood Count', value: '6.2', unit: 'M/uL', reference: '4.5-11.0' },
      { test_name: 'Glucose', value: '118', unit: 'mg/dL', reference: '70-100' },
      { test_name: 'Creatinine', value: '1.1', unit: 'mg/dL', reference: '0.6-1.2' }
    ],
    20009: [
      { test_name: 'Complete Blood Count', value: '4.9', unit: 'M/uL', reference: '4.5-11.0' },
      { test_name: 'Glucose', value: '93', unit: 'mg/dL', reference: '70-100' },
      { test_name: 'Hemoglobin A1C', value: '5.5', unit: '%', reference: '<5.7' }
    ],
    20010: [
      { test_name: 'Complete Blood Count', value: '5.8', unit: 'M/uL', reference: '4.5-11.0' },
      { test_name: 'Glucose', value: '110', unit: 'mg/dL', reference: '70-100' },
      { test_name: 'Prostate (PSA)', value: '1.2', unit: 'ng/mL', reference: '<4.0' }
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
    ],
    20006: [
      { name: 'Simvastatin', dose: '20 mg', frequency: 'Once Daily', indication: 'High Cholesterol' },
      { name: 'Aspirin', dose: '81 mg', frequency: 'Once Daily', indication: 'Cardiovascular Protection' }
    ],
    20007: [
      { name: 'Loratadine', dose: '10 mg', frequency: 'Once Daily', indication: 'Allergies' }
    ],
    20008: [
      { name: 'Enalapril', dose: '10 mg', frequency: 'Once Daily', indication: 'Hypertension' },
      { name: 'Hydrochlorothiazide', dose: '12.5 mg', frequency: 'Once Daily', indication: 'Hypertension' },
      { name: 'Pravastatin', dose: '40 mg', frequency: 'Once Daily', indication: 'High Cholesterol' }
    ],
    20009: [
      { name: 'Albuterol', dose: '90 mcg', frequency: 'As needed', indication: 'Asthma' },
      { name: 'Fluticasone', dose: '44 mcg', frequency: 'Twice Daily', indication: 'Asthma Prevention' }
    ],
    20010: [
      { name: 'Omeprazole', dose: '20 mg', frequency: 'Once Daily', indication: 'GERD' },
      { name: 'Metoprolol', dose: '50 mg', frequency: 'Twice Daily', indication: 'Hypertension' }
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
    ],
    20006: [
      { date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], reason: 'Annual physical', provider: 'Dr. Taylor' }
    ],
    20007: [
      { date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], reason: 'Allergy management', provider: 'Dr. Anderson' }
    ],
    20008: [
      { date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], reason: 'Blood pressure check', provider: 'Dr. Garcia' },
      { date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], reason: 'Kidney function monitoring', provider: 'Dr. Martinez' }
    ],
    20009: [
      { date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], reason: 'Asthma control assessment', provider: 'Dr. Robinson' }
    ],
    20010: [
      { date: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], reason: 'GERD management review', provider: 'Dr. Clark' },
      { date: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], reason: 'Cardiac risk assessment', provider: 'Dr. White' }
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
      demographics: p.demographics,
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
