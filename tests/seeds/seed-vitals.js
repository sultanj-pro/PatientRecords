/**
 * seed-vitals.js
 * Seeds vitals for each patient (IDs 20001-20010).
 * Schema reference: dateofobservation, observationcode, observationcodesystem,
 *   organizationname, vital_description, unit, value, percentile
 * Run AFTER seed-patients.js.
 */
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:admin@localhost:27017/patientrecords?authSource=admin';
const Patient = mongoose.model('Patient', new mongoose.Schema({ patientid: Number }, { strict: false }));

const today = new Date().toISOString();

// One entry per vital sign per patient.
// Add more rows here to extend a patient's vitals.
const vitalsData = {
  20001: [
    { vital_description: 'Temperature',              value: '98.2', unit: '°F'          },
    { vital_description: 'Blood Pressure (Systolic)', value: '118',  unit: 'mmHg'        },
    { vital_description: 'Blood Pressure (Diastolic)',value: '76',   unit: 'mmHg'        },
    { vital_description: 'Heart Rate',               value: '72',   unit: 'bpm'         },
    { vital_description: 'Respiratory Rate',         value: '16',   unit: 'breaths/min' },
    { vital_description: 'Oxygen Saturation',        value: '98',   unit: '%'           }
  ],
  20002: [
    { vital_description: 'Temperature',              value: '99.1', unit: '°F'          },
    { vital_description: 'Blood Pressure (Systolic)', value: '142',  unit: 'mmHg'        },
    { vital_description: 'Blood Pressure (Diastolic)',value: '88',   unit: 'mmHg'        },
    { vital_description: 'Heart Rate',               value: '82',   unit: 'bpm'         },
    { vital_description: 'Respiratory Rate',         value: '18',   unit: 'breaths/min' },
    { vital_description: 'Oxygen Saturation',        value: '97',   unit: '%'           }
  ],
  20003: [
    { vital_description: 'Temperature',              value: '97.8', unit: '°F'          },
    { vital_description: 'Blood Pressure (Systolic)', value: '110',  unit: 'mmHg'        },
    { vital_description: 'Blood Pressure (Diastolic)',value: '68',   unit: 'mmHg'        },
    { vital_description: 'Heart Rate',               value: '65',   unit: 'bpm'         },
    { vital_description: 'Respiratory Rate',         value: '14',   unit: 'breaths/min' },
    { vital_description: 'Oxygen Saturation',        value: '97',   unit: '%'           }
  ],
  20004: [
    { vital_description: 'Temperature',              value: '98.6', unit: '°F'          },
    { vital_description: 'Blood Pressure (Systolic)', value: '156',  unit: 'mmHg'        },
    { vital_description: 'Blood Pressure (Diastolic)',value: '96',   unit: 'mmHg'        },
    { vital_description: 'Heart Rate',               value: '88',   unit: 'bpm'         },
    { vital_description: 'Respiratory Rate',         value: '20',   unit: 'breaths/min' },
    { vital_description: 'Oxygen Saturation',        value: '92',   unit: '%'           }
  ],
  20005: [
    { vital_description: 'Temperature',              value: '98.4', unit: '°F'          },
    { vital_description: 'Blood Pressure (Systolic)', value: '124',  unit: 'mmHg'        },
    { vital_description: 'Blood Pressure (Diastolic)',value: '80',   unit: 'mmHg'        },
    { vital_description: 'Heart Rate',               value: '70',   unit: 'bpm'         },
    { vital_description: 'Respiratory Rate',         value: '16',   unit: 'breaths/min' },
    { vital_description: 'Oxygen Saturation',        value: '99',   unit: '%'           }
  ],
  20006: [
    { vital_description: 'Temperature',              value: '98.5', unit: '°F'          },
    { vital_description: 'Blood Pressure (Systolic)', value: '128',  unit: 'mmHg'        },
    { vital_description: 'Blood Pressure (Diastolic)',value: '82',   unit: 'mmHg'        },
    { vital_description: 'Heart Rate',               value: '68',   unit: 'bpm'         },
    { vital_description: 'Respiratory Rate',         value: '16',   unit: 'breaths/min' },
    { vital_description: 'Oxygen Saturation',        value: '98',   unit: '%'           }
  ],
  20007: [
    { vital_description: 'Temperature',              value: '98.0', unit: '°F'          },
    { vital_description: 'Blood Pressure (Systolic)', value: '112',  unit: 'mmHg'        },
    { vital_description: 'Blood Pressure (Diastolic)',value: '72',   unit: 'mmHg'        },
    { vital_description: 'Heart Rate',               value: '62',   unit: 'bpm'         },
    { vital_description: 'Respiratory Rate',         value: '15',   unit: 'breaths/min' },
    { vital_description: 'Oxygen Saturation',        value: '99',   unit: '%'           }
  ],
  20008: [
    { vital_description: 'Temperature',              value: '98.7', unit: '°F'          },
    { vital_description: 'Blood Pressure (Systolic)', value: '138',  unit: 'mmHg'        },
    { vital_description: 'Blood Pressure (Diastolic)',value: '84',   unit: 'mmHg'        },
    { vital_description: 'Heart Rate',               value: '76',   unit: 'bpm'         },
    { vital_description: 'Respiratory Rate',         value: '17',   unit: 'breaths/min' },
    { vital_description: 'Oxygen Saturation',        value: '96',   unit: '%'           }
  ],
  20009: [
    { vital_description: 'Temperature',              value: '98.3', unit: '°F'          },
    { vital_description: 'Blood Pressure (Systolic)', value: '120',  unit: 'mmHg'        },
    { vital_description: 'Blood Pressure (Diastolic)',value: '78',   unit: 'mmHg'        },
    { vital_description: 'Heart Rate',               value: '74',   unit: 'bpm'         },
    { vital_description: 'Respiratory Rate',         value: '16',   unit: 'breaths/min' },
    { vital_description: 'Oxygen Saturation',        value: '98',   unit: '%'           }
  ],
  20010: [
    { vital_description: 'Temperature',              value: '99.0', unit: '°F'          },
    { vital_description: 'Blood Pressure (Systolic)', value: '132',  unit: 'mmHg'        },
    { vital_description: 'Blood Pressure (Diastolic)',value: '86',   unit: 'mmHg'        },
    { vital_description: 'Heart Rate',               value: '80',   unit: 'bpm'         },
    { vital_description: 'Respiratory Rate',         value: '18',   unit: 'breaths/min' },
    { vital_description: 'Oxygen Saturation',        value: '97',   unit: '%'           }
  ]
};

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  for (const [id, entries] of Object.entries(vitalsData)) {
    const vitals = entries.map(v => ({
      dateofobservation:  today,
      observationcode:    'vital',
      observationcodesystem: 'LOINC',
      organizationname:   'Springfield General Hospital',
      vital_description:  v.vital_description,
      unit:               v.unit,
      value:              v.value,
      percentile:         '50'
    }));
    const r = await Patient.updateOne({ patientid: Number(id) }, { $set: { vitals } });
    console.log(`  Patient ${id}: ${vitals.length} vitals seeded (matched: ${r.matchedCount})`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => { console.error('Error:', err.message); process.exit(1); });
