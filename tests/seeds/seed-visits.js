/**
 * seed-visits.js
 * Seeds visit history for each patient (IDs 20001-20010).
 * Schema reference: date, visitType (hospital|clinic|office), reason,
 *   notes, provider_name, facility_name, discharge_status
 * Run AFTER seed-patients.js.
 */
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:admin@localhost:27017/patientrecords?authSource=admin';
const Patient = mongoose.model('Patient', new mongoose.Schema({ patientid: Number }, { strict: false }));

// Add or modify visits per patient here.
const visitsData = {
  20001: [
    { date: '2024-03-10T14:00:00', visitType: 'clinic',  reason: 'Annual physical examination',    notes: 'Patient in good health. BP slightly elevated — monitoring.',          provider_name: 'Dr. Sarah Johnson',    facility_name: 'Main Street Clinic'        },
    { date: '2024-01-10T10:00:00', visitType: 'clinic',  reason: 'Routine checkup and blood work', notes: 'Ordered CMP and lipid panel.',                                        provider_name: 'Dr. Michael Chen',     facility_name: 'Main Street Clinic'        },
    { date: '2023-10-20T15:30:00', visitType: 'clinic',  reason: 'Medication refill',              notes: 'Refilled Vitamin D3 prescription.',                                   provider_name: 'Dr. Sarah Johnson',    facility_name: 'Main Street Clinic'        }
  ],
  20002: [
    { date: '2024-03-07T09:00:00', visitType: 'clinic',  reason: 'Hypertension monitoring',        notes: 'BP 142/88 — medication dose under review.',                           provider_name: 'Dr. James Patel',      facility_name: 'Cardiology Associates'     },
    { date: '2024-02-15T11:00:00', visitType: 'clinic',  reason: 'Diabetes follow-up',             notes: 'HbA1c elevated. Metformin dose increased.',                           provider_name: 'Dr. James Patel',      facility_name: 'Cardiology Associates'     },
    { date: '2023-12-05T09:30:00', visitType: 'office',  reason: 'Flu-like symptoms',              notes: 'Diagnosed with viral infection. Rest and hydration advised.',          provider_name: 'Dr. Emily Rodriguez',  facility_name: 'Urgent Care Center'        }
  ],
  20003: [
    { date: '2025-03-05T10:00:00', visitType: 'clinic',  reason: 'Prenatal visit (28 weeks)',      notes: 'Fetal growth on track. Blood pressure normal.',                       provider_name: 'Dr. Linda Williams',   facility_name: 'Women\'s Health Center'    },
    { date: '2025-02-01T10:00:00', visitType: 'clinic',  reason: 'Prenatal visit (24 weeks)',      notes: 'Glucose screening ordered. Vitamins reviewed.',                        provider_name: 'Dr. Linda Williams',   facility_name: 'Women\'s Health Center'    },
    { date: '2024-11-15T14:00:00', visitType: 'clinic',  reason: 'Asthma control assessment',      notes: 'Inhaler technique corrected. Step-up therapy initiated.',              provider_name: 'Dr. Mark Anderson',    facility_name: 'Respiratory Clinic'        }
  ],
  20004: [
    { date: '2024-03-23T08:00:00', visitType: 'hospital', reason: 'COPD exacerbation',             notes: 'Admitted with acute exacerbation. O2 therapy and nebulisers.', discharge_status: 'Discharged Home',   provider_name: 'Dr. Robert Brown',     facility_name: 'Springfield General Hospital' },
    { date: '2024-03-11T13:00:00', visitType: 'clinic',  reason: 'Heart failure follow-up',        notes: 'Weight stable. No oedema. Continue current medications.',             provider_name: 'Dr. Robert Brown',     facility_name: 'Cardiology Associates'     },
    { date: '2024-02-10T09:00:00', visitType: 'clinic',  reason: 'INR check',                      notes: 'INR 2.4 — within target range 2.0-3.0.',                              provider_name: 'Dr. Karen Davis',      facility_name: 'Anticoag Clinic'           }
  ],
  20005: [
    { date: '2024-03-24T09:00:00', visitType: 'clinic',  reason: 'Thyroid function check',         notes: 'TSH elevated at 6.8. Levothyroxine dose adjusted to 75 mcg.',        provider_name: 'Dr. Susan Miller',     facility_name: 'Endocrinology Clinic'      },
    { date: '2024-01-15T14:30:00', visitType: 'clinic',  reason: 'Mental health follow-up',        notes: 'PHQ-9 score 6. Patient reporting improved mood on Sertraline.',        provider_name: 'Dr. Susan Miller',     facility_name: 'Endocrinology Clinic'      }
  ],
  20006: [
    { date: '2024-03-15T10:00:00', visitType: 'clinic',  reason: 'Annual physical',                notes: 'Cholesterol borderline. Dietary changes discussed. Statin continued.', provider_name: 'Dr. James Taylor',    facility_name: 'Main Street Clinic'        },
    { date: '2023-08-15T08:00:00', visitType: 'hospital', reason: 'Minor surgery — mole removal',  notes: 'Successful removal of benign mole. Patient discharged same day.', discharge_status: 'Discharged Home', provider_name: 'Dr. Robert Martinez', facility_name: 'Springfield General Hospital' }
  ],
  20007: [
    { date: '2024-03-21T11:00:00', visitType: 'clinic',  reason: 'Allergy management',             notes: 'Loratadine effective. Peak flow diary reviewed. No wheeze.',           provider_name: 'Dr. Kevin Anderson',   facility_name: 'Allergy & Immunology Clinic' },
    { date: '2024-02-05T15:00:00', visitType: 'office',  reason: 'Sore throat',                    notes: 'Throat swab negative. Viral pharyngitis. Symptomatic treatment.',     provider_name: 'Dr. Amy White',        facility_name: 'Urgent Care Center'        }
  ],
  20008: [
    { date: '2024-03-19T10:00:00', visitType: 'clinic',  reason: 'Blood pressure check',           notes: 'BP 138/84 — stable on Enalapril + HCTZ.',                             provider_name: 'Dr. Carlos Garcia',    facility_name: 'Internal Medicine Clinic'  },
    { date: '2024-02-05T09:00:00', visitType: 'clinic',  reason: 'Kidney function monitoring',     notes: 'Creatinine stable at 1.1. eGFR 58 — mild CKD, monitoring.',           provider_name: 'Dr. Carlos Garcia',    facility_name: 'Internal Medicine Clinic'  },
    { date: '2023-10-10T14:00:00', visitType: 'clinic',  reason: 'Annual physical',                notes: 'Overall health stable for age. Influenza vaccine administered.',       provider_name: 'Dr. Carlos Garcia',    facility_name: 'Internal Medicine Clinic'  }
  ],
  20009: [
    { date: '2024-03-17T09:00:00', visitType: 'clinic',  reason: 'Asthma control assessment',      notes: 'ACT score 15 — not well controlled. Montelukast added.',               provider_name: 'Dr. Patricia Robinson', facility_name: 'Respiratory Clinic'       },
    { date: '2024-01-22T11:00:00', visitType: 'clinic',  reason: 'Asthma follow-up',               notes: 'Inhaler technique good. Peak flow 82% predicted.',                     provider_name: 'Dr. Patricia Robinson', facility_name: 'Respiratory Clinic'       }
  ],
  20010: [
    { date: '2024-03-16T10:00:00', visitType: 'clinic',  reason: 'GERD management review',         notes: 'Symptoms controlled on Omeprazole. Dietary triggers discussed.',       provider_name: 'Dr. Brian Clark',      facility_name: 'Gastroenterology Clinic'   },
    { date: '2024-02-28T14:00:00', visitType: 'clinic',  reason: 'Cardiac risk assessment',        notes: 'BP 132/86. Metoprolol dose maintained. 10-year CV risk 14%.',          provider_name: 'Dr. Brian Clark',      facility_name: 'Gastroenterology Clinic'   },
    { date: '2023-11-05T09:00:00', visitType: 'office',  reason: 'Routine checkup',                notes: 'General health good. Cholesterol slightly elevated — dietary advice.', provider_name: 'Dr. Nancy White',      facility_name: 'Main Street Clinic'        }
  ]
};

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  for (const [id, visits] of Object.entries(visitsData)) {
    const r = await Patient.updateOne({ patientid: Number(id) }, { $set: { visits } });
    console.log(`  Patient ${id}: ${visits.length} visits seeded (matched: ${r.matchedCount})`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => { console.error('Error:', err.message); process.exit(1); });
