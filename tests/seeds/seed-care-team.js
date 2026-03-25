/**
 * seed-care-team.js
 * Seeds care team members for each patient (IDs 20001-20010).
 * Schema reference: name, role, specialty, phone, email,
 *   organization, startDate, isPrimary
 * Run AFTER seed-patients.js.
 */
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:admin@localhost:27017/patientrecords?authSource=admin';
const Patient = mongoose.model('Patient', new mongoose.Schema({ patientid: Number }, { strict: false }));

// Add or modify care team members per patient here.
const careTeamData = {
  20001: [
    { name: 'Dr. Sarah Johnson',  role: 'Primary Care Physician', specialty: 'Internal Medicine',  phone: '(555) 200-0001', email: 'sjohnson@clinic.com',  organization: 'Main Street Clinic',         startDate: new Date('2020-01-01'), isPrimary: true  },
    { name: 'Dr. Michael Chen',   role: 'Endocrinologist',        specialty: 'Endocrinology',       phone: '(555) 200-0002', email: 'mchen@endo.com',       organization: 'Endocrinology Clinic',       startDate: new Date('2022-03-15'), isPrimary: false }
  ],
  20002: [
    { name: 'Dr. James Patel',    role: 'Primary Care Physician', specialty: 'Family Medicine',     phone: '(555) 200-0003', email: 'jpatel@clinic.com',    organization: 'Cardiology Associates',      startDate: new Date('2018-06-01'), isPrimary: true  },
    { name: 'Dr. Angela Cruz',    role: 'Cardiologist',           specialty: 'Cardiology',          phone: '(555) 200-0004', email: 'acruz@cardio.com',     organization: 'Cardiology Associates',      startDate: new Date('2023-02-10'), isPrimary: false },
    { name: 'Marcus Webb RN',     role: 'Nurse',                  specialty: 'Cardiac Nursing',     phone: '(555) 200-0005', email: 'mwebb@cardio.com',     organization: 'Cardiology Associates',      startDate: new Date('2023-02-10'), isPrimary: false }
  ],
  20003: [
    { name: 'Dr. Linda Williams', role: 'Primary Care Physician', specialty: 'Obstetrics',          phone: '(555) 200-0006', email: 'lwilliams@womens.com', organization: "Women's Health Center",      startDate: new Date('2024-10-01'), isPrimary: true  },
    { name: 'Dr. Mark Anderson',  role: 'Pulmonologist',          specialty: 'Pulmonology',         phone: '(555) 200-0007', email: 'manderson@resp.com',   organization: 'Respiratory Clinic',         startDate: new Date('2022-05-20'), isPrimary: false }
  ],
  20004: [
    { name: 'Dr. Robert Brown',   role: 'Primary Care Physician', specialty: 'Internal Medicine',  phone: '(555) 200-0008', email: 'rbrown@general.com',   organization: 'Springfield General Hospital', startDate: new Date('2015-03-01'), isPrimary: true  },
    { name: 'Dr. Karen Davis',    role: 'Cardiologist',           specialty: 'Cardiology',          phone: '(555) 200-0009', email: 'kdavis@cardio.com',    organization: 'Cardiology Associates',      startDate: new Date('2019-07-15'), isPrimary: false },
    { name: 'Dr. Frank Nguyen',   role: 'Pulmonologist',          specialty: 'Pulmonology',         phone: '(555) 200-0010', email: 'fnguyen@resp.com',     organization: 'Respiratory Clinic',         startDate: new Date('2021-01-10'), isPrimary: false }
  ],
  20005: [
    { name: 'Dr. Susan Miller',   role: 'Primary Care Physician', specialty: 'Endocrinology',       phone: '(555) 200-0011', email: 'smiller@endo.com',     organization: 'Endocrinology Clinic',       startDate: new Date('2019-09-01'), isPrimary: true  },
    { name: 'Dr. Thomas Lee',     role: 'Psychiatrist',           specialty: 'Psychiatry',          phone: '(555) 200-0012', email: 'tlee@mental.com',      organization: 'Mental Health Associates',   startDate: new Date('2023-04-15'), isPrimary: false }
  ],
  20006: [
    { name: 'Dr. James Taylor',   role: 'Primary Care Physician', specialty: 'Family Medicine',     phone: '(555) 200-0013', email: 'jtaylor@clinic.com',   organization: 'Main Street Clinic',         startDate: new Date('2016-04-15'), isPrimary: true  }
  ],
  20007: [
    { name: 'Dr. Kevin Anderson', role: 'Primary Care Physician', specialty: 'Allergy & Immunology', phone: '(555) 200-0014', email: 'kanderson@allergy.com', organization: 'Allergy & Immunology Clinic', startDate: new Date('2022-09-01'), isPrimary: true }
  ],
  20008: [
    { name: 'Dr. Carlos Garcia',  role: 'Primary Care Physician', specialty: 'Internal Medicine',   phone: '(555) 200-0015', email: 'cgarcia@internal.com', organization: 'Internal Medicine Clinic',   startDate: new Date('2018-02-03'), isPrimary: true  },
    { name: 'Dr. Helen Park',     role: 'Nephrologist',           specialty: 'Nephrology',          phone: '(555) 200-0016', email: 'hpark@nephro.com',     organization: 'Kidney Care Center',         startDate: new Date('2022-09-10'), isPrimary: false }
  ],
  20009: [
    { name: 'Dr. Patricia Robinson', role: 'Primary Care Physician', specialty: 'Pulmonology',     phone: '(555) 200-0017', email: 'probinson@resp.com',   organization: 'Respiratory Clinic',         startDate: new Date('2017-05-01'), isPrimary: true  },
    { name: 'Lisa Nguyen RN',     role: 'Nurse',                  specialty: 'Respiratory Nursing', phone: '(555) 200-0018', email: 'lnguyen@resp.com',     organization: 'Respiratory Clinic',         startDate: new Date('2022-01-15'), isPrimary: false }
  ],
  20010: [
    { name: 'Dr. Brian Clark',    role: 'Primary Care Physician', specialty: 'Gastroenterology',    phone: '(555) 200-0019', email: 'bclark@gastro.com',    organization: 'Gastroenterology Clinic',    startDate: new Date('2020-11-01'), isPrimary: true  }
  ]
};

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  for (const [id, careTeam] of Object.entries(careTeamData)) {
    const r = await Patient.updateOne({ patientid: Number(id) }, { $set: { careTeam } });
    console.log(`  Patient ${id}: ${careTeam.length} care team member(s) seeded (matched: ${r.matchedCount})`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => { console.error('Error:', err.message); process.exit(1); });
