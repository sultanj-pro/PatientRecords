/**
 * seed-patients.js
 * Seeds 10 patients (IDs 20001-20010) with demographics and allergies.
 * Clears the patients collection first.
 * Run BEFORE all other seed scripts.
 */
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:admin@localhost:27017/patientrecords?authSource=admin';

const patients = [
  {
    patientid: 20001, firstname: 'Sarah', lastname: 'Mitchell',
    demographics: {
      legalName: { first: 'Sarah', middle: 'Marie', last: 'Mitchell' },
      preferredName: 'Sarah', dateOfBirth: new Date('1985-03-15'),
      gender: 'Female', sexAssignedAtBirth: 'Female',
      ssn: '123-45-6789', mrn: 'MRN-20001', bloodType: 'A+',
      primaryPhone: '(555) 123-0001', secondaryPhone: '(555) 234-0001',
      email: 'sarah.mitchell@email.com',
      address: { street: '1 Main Street', city: 'Springfield', state: 'IL', zip: '62701', country: 'USA' },
      emergencyContacts: [
        { name: 'John Mitchell',   relationship: 'Spouse',  phone: '(555) 345-0001', isPrimary: true  },
        { name: 'Robert Mitchell', relationship: 'Father',  phone: '(555) 456-0001', isPrimary: false }
      ],
      preferredLanguage: 'English', race: 'White', ethnicity: 'Non-Hispanic', maritalStatus: 'Married',
      insurance: [{
        type: 'primary', provider: 'Blue Cross Blue Shield', policyNumber: 'BC123456789',
        groupNumber: 'GRP-5001', subscriberName: 'Sarah Mitchell', subscriberRelationship: 'Self',
        effectiveDate: new Date('2025-01-01'), expirationDate: new Date('2026-12-31')
      }]
    },
    allergies: [
      { type: 'drug',  substance: 'Penicillin', severity: 'severe',   reaction: 'Anaphylaxis',        dateReported: new Date('2020-05-10') },
      { type: 'food',  substance: 'Shellfish',  severity: 'moderate', reaction: 'Hives and swelling' }
    ]
  },
  {
    patientid: 20002, firstname: 'John', lastname: 'Anderson',
    demographics: {
      legalName: { first: 'John', middle: 'David', last: 'Anderson' },
      preferredName: 'John', dateOfBirth: new Date('1978-07-22'),
      gender: 'Male', sexAssignedAtBirth: 'Male',
      ssn: '234-56-7890', mrn: 'MRN-20002', bloodType: 'B-',
      primaryPhone: '(555) 123-0002', secondaryPhone: '',
      email: 'john.anderson@email.com',
      address: { street: '2 Main Street', city: 'Springfield', state: 'IL', zip: '62701', country: 'USA' },
      emergencyContacts: [
        { name: 'Karen Anderson', relationship: 'Sister', phone: '(555) 345-0002', isPrimary: true }
      ],
      preferredLanguage: 'English', race: 'White', ethnicity: 'Non-Hispanic', maritalStatus: 'Single',
      insurance: [
        {
          type: 'primary', provider: 'Aetna', policyNumber: 'AET987654321',
          groupNumber: 'GRP-5002', subscriberName: 'John Anderson', subscriberRelationship: 'Self',
          effectiveDate: new Date('2024-06-01'), expirationDate: new Date('2027-05-31')
        },
        {
          type: 'secondary', provider: 'United Healthcare', policyNumber: 'UH456123789',
          groupNumber: 'GRP-5002B', subscriberName: 'John Anderson', subscriberRelationship: 'Self',
          effectiveDate: new Date('2024-09-01'), expirationDate: new Date('2027-08-31')
        }
      ]
    },
    allergies: [
      { type: 'drug', substance: 'Lisinopril', severity: 'moderate', reaction: 'Persistent dry cough' }
    ]
  },
  {
    patientid: 20003, firstname: 'Emily', lastname: 'Rodriguez',
    demographics: {
      legalName: { first: 'Emily', middle: 'Grace', last: 'Rodriguez' },
      preferredName: 'Em', dateOfBirth: new Date('1992-11-08'),
      gender: 'Female', sexAssignedAtBirth: 'Female',
      ssn: '345-67-8901', mrn: 'MRN-20003', bloodType: 'O+',
      primaryPhone: '(555) 123-0003', secondaryPhone: '(555) 234-0003',
      email: 'emily.r@email.com',
      address: { street: '3 Main Street', city: 'Springfield', state: 'IL', zip: '62701', country: 'USA' },
      emergencyContacts: [
        { name: 'Maria Rodriguez',  relationship: 'Mother',  phone: '(555) 345-0003', isPrimary: true  },
        { name: 'Carlos Rodriguez', relationship: 'Brother', phone: '(555) 456-0003', isPrimary: false }
      ],
      preferredLanguage: 'Spanish', race: 'Hispanic', ethnicity: 'Hispanic', maritalStatus: 'Married',
      insurance: [{
        type: 'primary', provider: 'Cigna', policyNumber: 'CIG234567890',
        groupNumber: 'GRP-5003', subscriberName: 'Emily Rodriguez', subscriberRelationship: 'Self',
        effectiveDate: new Date('2025-02-01'), expirationDate: new Date('2026-01-31')
      }]
    },
    allergies: []
  },
  {
    patientid: 20004, firstname: 'Michael', lastname: 'Thompson',
    demographics: {
      legalName: { first: 'Michael', middle: 'James', last: 'Thompson' },
      preferredName: 'Mike', dateOfBirth: new Date('1965-05-30'),
      gender: 'Male', sexAssignedAtBirth: 'Male',
      ssn: '456-78-9012', mrn: 'MRN-20004', bloodType: 'AB+',
      primaryPhone: '(555) 123-0004', secondaryPhone: '(555) 234-0004',
      email: 'michael.thompson@email.com',
      address: { street: '4 Main Street', city: 'Springfield', state: 'IL', zip: '62701', country: 'USA' },
      emergencyContacts: [
        { name: 'Linda Thompson', relationship: 'Spouse', phone: '(555) 345-0004', isPrimary: true  },
        { name: 'David Thompson', relationship: 'Son',    phone: '(555) 456-0004', isPrimary: false }
      ],
      preferredLanguage: 'English', race: 'White', ethnicity: 'Non-Hispanic', maritalStatus: 'Married',
      insurance: [
        {
          type: 'primary', provider: 'Humana', policyNumber: 'HUM567890123',
          groupNumber: 'GRP-5004', subscriberName: 'Michael Thompson', subscriberRelationship: 'Self',
          effectiveDate: new Date('2024-01-01'), expirationDate: new Date('2026-12-31')
        },
        {
          type: 'secondary', provider: 'Medicare', policyNumber: 'MED456789123',
          groupNumber: 'MEDICARE', subscriberName: 'Michael Thompson', subscriberRelationship: 'Self',
          effectiveDate: new Date('2023-05-30'), expirationDate: new Date('2030-05-30')
        }
      ]
    },
    allergies: [
      { type: 'environmental', substance: 'Latex', severity: 'severe', reaction: 'Contact dermatitis and swelling' }
    ]
  },
  {
    patientid: 20005, firstname: 'Jennifer', lastname: 'Kumar',
    demographics: {
      legalName: { first: 'Jennifer', middle: 'Lynn', last: 'Kumar' },
      preferredName: 'Jennifer', dateOfBirth: new Date('1988-09-14'),
      gender: 'Female', sexAssignedAtBirth: 'Female',
      ssn: '567-89-0123', mrn: 'MRN-20005', bloodType: 'A-',
      primaryPhone: '(555) 123-0005', secondaryPhone: '',
      email: 'jennifer.kumar@email.com',
      address: { street: '5 Main Street', city: 'Springfield', state: 'IL', zip: '62701', country: 'USA' },
      emergencyContacts: [
        { name: 'Amit Kumar', relationship: 'Spouse', phone: '(555) 345-0005', isPrimary: true }
      ],
      preferredLanguage: 'English', race: 'Asian', ethnicity: 'Indian', maritalStatus: 'Married',
      insurance: [{
        type: 'primary', provider: 'Oxford Health Plans', policyNumber: 'OXF678901234',
        groupNumber: 'GRP-5005', subscriberName: 'Jennifer Kumar', subscriberRelationship: 'Self',
        effectiveDate: new Date('2025-03-01'), expirationDate: new Date('2027-02-28')
      }]
    },
    allergies: [
      { type: 'drug',  substance: 'Aspirin',  severity: 'mild',   reaction: 'Stomach upset'                                        },
      { type: 'food',  substance: 'Peanuts',  severity: 'severe', reaction: 'Anaphylaxis', dateReported: new Date('2018-03-22') }
    ]
  },
  {
    patientid: 20006, firstname: 'David', lastname: 'Wilson',
    demographics: {
      legalName: { first: 'David', middle: 'Christopher', last: 'Wilson' },
      preferredName: 'Dave', dateOfBirth: new Date('1975-12-25'),
      gender: 'Male', sexAssignedAtBirth: 'Male',
      ssn: '678-90-1234', mrn: 'MRN-20006', bloodType: 'O-',
      primaryPhone: '(555) 123-0006', secondaryPhone: '(555) 234-0006',
      email: 'david.wilson@email.com',
      address: { street: '6 Main Street', city: 'Springfield', state: 'IL', zip: '62701', country: 'USA' },
      emergencyContacts: [
        { name: 'Patricia Wilson', relationship: 'Spouse', phone: '(555) 345-0006', isPrimary: true }
      ],
      preferredLanguage: 'English', race: 'White', ethnicity: 'Non-Hispanic', maritalStatus: 'Married',
      insurance: [{
        type: 'primary', provider: 'Kaiser Permanente', policyNumber: 'KP789012345',
        groupNumber: 'GRP-5006', subscriberName: 'David Wilson', subscriberRelationship: 'Self',
        effectiveDate: new Date('2024-04-15'), expirationDate: new Date('2027-04-14')
      }]
    },
    allergies: [
      { type: 'environmental', substance: 'Pollen', severity: 'mild', reaction: 'Allergic rhinitis' }
    ]
  },
  {
    patientid: 20007, firstname: 'Lisa', lastname: 'Chen',
    demographics: {
      legalName: { first: 'Lisa', middle: 'Marie', last: 'Chen' },
      preferredName: 'Lisa', dateOfBirth: new Date('1995-08-17'),
      gender: 'Female', sexAssignedAtBirth: 'Female',
      ssn: '789-01-2345', mrn: 'MRN-20007', bloodType: 'B+',
      primaryPhone: '(555) 123-0007', secondaryPhone: '',
      email: 'lisa.chen@email.com',
      address: { street: '7 Main Street', city: 'Springfield', state: 'IL', zip: '62701', country: 'USA' },
      emergencyContacts: [
        { name: 'Wei Chen',   relationship: 'Father', phone: '(555) 345-0007', isPrimary: true  },
        { name: 'Susan Chen', relationship: 'Mother', phone: '(555) 456-0007', isPrimary: false }
      ],
      preferredLanguage: 'English', race: 'Asian', ethnicity: 'Chinese', maritalStatus: 'Single',
      insurance: [{
        type: 'primary', provider: 'Blue Cross Blue Shield', policyNumber: 'BC234567890',
        groupNumber: 'GRP-5007', subscriberName: 'Lisa Chen', subscriberRelationship: 'Self',
        effectiveDate: new Date('2024-09-01'), expirationDate: new Date('2025-08-31')
      }]
    },
    allergies: []
  },
  {
    patientid: 20008, firstname: 'Robert', lastname: 'Martinez',
    demographics: {
      legalName: { first: 'Robert', middle: 'Luis', last: 'Martinez' },
      preferredName: 'Roberto', dateOfBirth: new Date('1954-02-03'),
      gender: 'Male', sexAssignedAtBirth: 'Male',
      ssn: '890-12-3456', mrn: 'MRN-20008', bloodType: 'A+',
      primaryPhone: '(555) 123-0008', secondaryPhone: '(555) 234-0008',
      email: 'robert.martinez@email.com',
      address: { street: '8 Main Street', city: 'Springfield', state: 'IL', zip: '62701', country: 'USA' },
      emergencyContacts: [
        { name: 'Angela Martinez', relationship: 'Daughter', phone: '(555) 345-0008', isPrimary: true }
      ],
      preferredLanguage: 'Spanish', race: 'Hispanic', ethnicity: 'Puerto Rican', maritalStatus: 'Widowed',
      insurance: [{
        type: 'primary', provider: 'Medicare', policyNumber: 'MED123456789',
        groupNumber: 'MEDICARE', subscriberName: 'Robert Martinez', subscriberRelationship: 'Self',
        effectiveDate: new Date('2020-02-03'), expirationDate: new Date('2030-02-03')
      }]
    },
    allergies: [
      { type: 'drug', substance: 'Codeine', severity: 'severe', reaction: 'Severe itching and hives' }
    ]
  },
  {
    patientid: 20009, firstname: 'Rebecca', lastname: 'Patterson',
    demographics: {
      legalName: { first: 'Rebecca', middle: 'Anne', last: 'Patterson' },
      preferredName: 'Becky', dateOfBirth: new Date('1982-06-19'),
      gender: 'Female', sexAssignedAtBirth: 'Female',
      ssn: '901-23-4567', mrn: 'MRN-20009', bloodType: 'AB-',
      primaryPhone: '(555) 123-0009', secondaryPhone: '(555) 234-0009',
      email: 'rebecca.p@email.com',
      address: { street: '9 Main Street', city: 'Springfield', state: 'IL', zip: '62701', country: 'USA' },
      emergencyContacts: [
        { name: 'Thomas Patterson',    relationship: 'Spouse',   phone: '(555) 345-0009', isPrimary: true  },
        { name: 'Katherine Patterson', relationship: 'Daughter', phone: '(555) 456-0009', isPrimary: false }
      ],
      preferredLanguage: 'English', race: 'White', ethnicity: 'Non-Hispanic', maritalStatus: 'Married',
      insurance: [{
        type: 'primary', provider: 'Aetna', policyNumber: 'AET345678901',
        groupNumber: 'GRP-5009', subscriberName: 'Rebecca Patterson', subscriberRelationship: 'Self',
        effectiveDate: new Date('2025-01-01'), expirationDate: new Date('2026-12-31')
      }]
    },
    allergies: [
      { type: 'environmental', substance: 'Dust mites', severity: 'moderate', reaction: 'Asthma attacks' }
    ]
  },
  {
    patientid: 20010, firstname: 'James', lastname: "O'Brien",
    demographics: {
      legalName: { first: 'James', middle: 'Patrick', last: "O'Brien" },
      preferredName: 'Jim', dateOfBirth: new Date('1970-11-11'),
      gender: 'Male', sexAssignedAtBirth: 'Male',
      ssn: '012-34-5678', mrn: 'MRN-20010', bloodType: 'B-',
      primaryPhone: '(555) 123-0010', secondaryPhone: '',
      email: 'james.obrien@email.com',
      address: { street: '10 Main Street', city: 'Springfield', state: 'IL', zip: '62701', country: 'USA' },
      emergencyContacts: [
        { name: "Margaret O'Brien", relationship: 'Sister', phone: '(555) 345-0010', isPrimary: true }
      ],
      preferredLanguage: 'English', race: 'White', ethnicity: 'Irish', maritalStatus: 'Divorced',
      insurance: [{
        type: 'primary', provider: 'CIGNA', policyNumber: 'CIG567890123',
        groupNumber: 'GRP-5010', subscriberName: "James O'Brien", subscriberRelationship: 'Self',
        effectiveDate: new Date('2024-07-01'), expirationDate: new Date('2027-06-30')
      }]
    },
    allergies: [
      { type: 'food', substance: 'Dairy', severity: 'mild', reaction: 'Lactose intolerance' }
    ]
  }
];

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const col = mongoose.connection.db.collection('patients');
  await col.deleteMany({});
  console.log('Cleared existing patient data');

  const now = new Date();
  const docs = patients.map(p => ({ ...p, createdAt: now, updatedAt: now }));
  const result = await col.insertMany(docs);
  console.log(`Inserted ${result.insertedCount} patients`);
  patients.forEach(p => console.log(`  - ${p.firstname} ${p.lastname} (ID: ${p.patientid})`));

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => { console.error('Error:', err.message); process.exit(1); });
