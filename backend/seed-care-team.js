const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:admin@localhost:27017/patientrecords?authSource=admin';

// Define Patient schema with careTeam
const patientSchema = new mongoose.Schema({
  patientid: { type: Number, unique: true, required: true },
  firstname: { type: String },
  lastname: { type: String },
  careTeam: [
    {
      name: { type: String, required: true },
      role: { type: String, required: true },
      specialty: String,
      phone: String,
      email: String,
      organization: String,
      startDate: Date,
      endDate: { type: Date, default: null },
      isPrimary: { type: Boolean, default: false },
      deletedAt: { type: Date, default: null }
    }
  ]
}, { timestamps: true });

const Patient = mongoose.model('Patient', patientSchema);

// Comprehensive pool of care team members with diverse specialties and organizations
const allCareTeamMembers = [
  // Primary Care Physicians
  { name: 'Dr. Robert Johnson', role: 'Primary Care Physician', specialty: 'Internal Medicine', organization: 'Central Medical Center' },
  { name: 'Dr. Margaret Sullivan', role: 'Primary Care Physician', specialty: 'Family Medicine', organization: 'Riverside Health Clinic' },
  { name: 'Dr. James Patterson', role: 'Primary Care Physician', specialty: 'Internal Medicine', organization: 'Downtown Medical' },
  { name: 'Dr. Elizabeth Wong', role: 'Primary Care Physician', specialty: 'Family Medicine', organization: 'Community Health Partners' },
  
  // Cardiologists
  { name: 'Dr. Sarah Mitchell', role: 'Cardiologist', specialty: 'Cardiology', organization: 'Heart & Vascular Center' },
  { name: 'Dr. Ahmed Hassan', role: 'Cardiologist', specialty: 'Cardiology', organization: 'Cardiac Specialists of America' },
  { name: 'Dr. Victoria Lane', role: 'Cardiologist', specialty: 'Interventional Cardiology', organization: 'Heart & Vascular Center' },
  
  // Pulmonologists
  { name: 'Dr. Michael Chen', role: 'Pulmonologist', specialty: 'Pulmonary Medicine', organization: 'Respiratory Care Institute' },
  { name: 'Dr. William Blake', role: 'Pulmonologist', specialty: 'Pulmonary Medicine', organization: 'Lung Health Specialists' },
  
  // Endocrinologists
  { name: 'Dr. David Rodriguez', role: 'Endocrinologist', specialty: 'Endocrinology', organization: 'Diabetes Care Specialists' },
  { name: 'Dr. Lisa Chen', role: 'Endocrinologist', specialty: 'Endocrinology & Metabolism', organization: 'Metabolic Disorders Center' },
  
  // Nephrologists
  { name: 'Dr. Lisa Martinez', role: 'Nephrologist', specialty: 'Nephrology', organization: 'Kidney Health Associates' },
  { name: 'Dr. Jonathan Foster', role: 'Nephrologist', specialty: 'Nephrology', organization: 'Renal Care Network' },
  
  // Neurologists
  { name: 'Dr. Rachel Goldman', role: 'Neurologist', specialty: 'Neurology', organization: 'Neuroscience Center' },
  { name: 'Dr. Christopher Lee', role: 'Neurologist', specialty: 'Neurology', organization: 'Brain & Spine Institute' },
  
  // Nurses & Coordinators
  { name: 'Jennifer Williams, RN', role: 'Care Coordinator', specialty: 'Nursing', organization: 'Central Medical Center' },
  { name: 'Mary Johnson, BSN', role: 'Nurse Practitioner', specialty: 'Nursing', organization: 'Community Health Partners' },
  { name: 'David Torres, RN', role: 'Clinical Nurse', specialty: 'Nursing', organization: 'Riverside Health Clinic' },
  { name: 'Susan Martinez, CCRN', role: 'Critical Care Nurse', specialty: 'Nursing', organization: 'Heart & Vascular Center' },
  { name: 'Karen Phillips, RN', role: 'Care Coordinator', specialty: 'Nursing', organization: 'Diabetes Care Specialists' },
  
  // Physician Assistants & NPs
  { name: 'Patricia Brown, PA-C', role: 'Physician Assistant', specialty: 'Internal Medicine', organization: 'Central Medical Center' },
  { name: 'Michael Davis, NP-C', role: 'Nurse Practitioner', specialty: 'Cardiology', organization: 'Heart & Vascular Center' },
  { name: 'Amanda Foster, PA-C', role: 'Physician Assistant', specialty: 'Pulmonary Medicine', organization: 'Respiratory Care Institute' },
  
  // Mental Health Professionals
  { name: 'Dr. Harrison Pierce', role: 'Psychiatrist', specialty: 'Psychiatry', organization: 'Mental Health Services' },
  { name: 'Marcus Thompson, MSW', role: 'Social Worker', specialty: 'Mental Health & Social Services', organization: 'Community Wellness' },
  { name: 'Dr. Laura Bennett', role: 'Psychologist', specialty: 'Behavioral Health', organization: 'Psychological Services Inc' },
  
  // Physical & Occupational Therapy
  { name: 'Kevin O\'Connor, PT', role: 'Physical Therapist', specialty: 'Physical Medicine', organization: 'Rehabilitation Services' },
  { name: 'Michelle Anderson, OTR', role: 'Occupational Therapist', specialty: 'Occupational Therapy', organization: 'Wellness Rehabilitation Center' },
  
  // Other Specialists
  { name: 'Dr. Howard Garrett', role: 'Gastroenterologist', specialty: 'Gastroenterology', organization: 'Digestive Health Center' },
  { name: 'Dr. Nicole Torres', role: 'Rheumatologist', specialty: 'Rheumatology', organization: 'Joint & Autoimmune Specialists' },
  { name: 'Dr. Samuel Wright', role: 'Oncologist', specialty: 'Oncology', organization: 'Cancer Treatment Center' },
  { name: 'Dr. Paula Anderson', role: 'Dermatologist', specialty: 'Dermatology', organization: 'Skin Health Clinic' }
];

// Generate phone number
function generatePhone() {
  const area = String(Math.floor(Math.random() * 900) + 100);
  const exchange = String(Math.floor(Math.random() * 900) + 100);
  const line = String(Math.floor(Math.random() * 9000) + 1000);
  return `(${area}) ${exchange}-${line}`;
}

// Generate email from name
function generateEmail(name, organization) {
  const names = name.split(' ');
  const firstName = names[0].toLowerCase();
  const lastName = names[names.length - 1].replace(/,.*/, '').toLowerCase();
  const domain = organization.toLowerCase().replace(/\s+/g, '') + '.com';
  const random = Math.floor(Math.random() * 1000);
  return `${firstName}.${lastName}${random}@${domain}`;
}

// Generate random start date within last 2 years
function generateStartDate() {
  const now = new Date();
  const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
  const randomTime = Math.random() * (now - twoYearsAgo);
  return new Date(twoYearsAgo.getTime() + randomTime);
}

async function seedCareTeam() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected!');

    // Clear existing care teams first
    console.log('Clearing existing care team data...');
    await Patient.updateMany({}, { $set: { careTeam: [] } });
    console.log('✓ Care teams cleared');

    // Find all patients
    const patients = await Patient.find({});
    console.log(`Found ${patients.length} patients`);

    if (patients.length === 0) {
      console.log('No patients found. Please seed patients first.');
      await mongoose.disconnect();
      return;
    }

    // Add care team members to each patient
    let updatedCount = 0;
    for (const patient of patients) {
      // Determine patient-specific care team (simulate different conditions)
      const patientId = patient.patientid;
      const selectedMembers = [];
      const usedIndices = new Set();

      // Assign 4-8 care team members for better variation
      const numMembers = Math.floor(Math.random() * 5) + 4; // 4-8 members
      
      // Always add a Primary Care Physician as primary (indices 0-3)
      const pcpIndex = Math.floor(Math.random() * 4);
      const pcp = JSON.parse(JSON.stringify(allCareTeamMembers[pcpIndex]));
      pcp.phone = generatePhone();
      pcp.email = generateEmail(pcp.name, pcp.organization);
      pcp.startDate = generateStartDate();
      pcp.isPrimary = true;
      selectedMembers.push(pcp);
      usedIndices.add(pcpIndex);

      // Add random additional members
      const startIdx = 4; // Skip PCP indices
      while (selectedMembers.length < numMembers && usedIndices.size < allCareTeamMembers.length) {
        const randomIndex = Math.floor(Math.random() * (allCareTeamMembers.length - startIdx)) + startIdx;
        if (!usedIndices.has(randomIndex)) {
          const member = JSON.parse(JSON.stringify(allCareTeamMembers[randomIndex]));
          member.phone = generatePhone();
          member.email = generateEmail(member.name, member.organization);
          member.startDate = generateStartDate();
          member.isPrimary = false;
          selectedMembers.push(member);
          usedIndices.add(randomIndex);
        }
      }

      patient.careTeam = selectedMembers;
      await patient.save();
      updatedCount++;
      console.log(`✓ Patient ${patient.patientid} (${patient.firstname} ${patient.lastname}): ${selectedMembers.length} team members`);
      console.log(`  - PCP: ${selectedMembers.filter(m => m.isPrimary)[0]?.name}`);
      console.log(`  - Specialists: ${selectedMembers.filter(m => !m.isPrimary).map(m => m.role).join(', ')}`);
    }

    console.log(`\n✓ Successfully updated ${updatedCount} patients with varied care team data`);
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error seeding care team data:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run if this is the main module
if (require.main === module) {
  seedCareTeam();
}

module.exports = seedCareTeam;
