const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const swaggerUi = require('swagger-ui-express');
const mongoose = require('mongoose');
const openapiSpec = require('./openapi.json');

// Initialize Express app
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));

// Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const PORT = process.env.PORT || 3001;
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
      route: String,
      deletedAt: { type: Date, default: null }
    }
  ],
  visits: [
    {
      date: String,
      visitType: { type: String, enum: ['hospital', 'clinic', 'office'], required: true },
      reason: String,
      notes: String,
      provider_name: String,
      facility_name: String,
      discharge_status: String,
      deletedAt: { type: Date, default: null }
    }
  ]
}, { timestamps: true });

const Patient = mongoose.model('Patient', patientSchema);

// Seed database function
const fs = require('fs');
const path = require('path');

async function seedDatabase() {
  try {
    const count = await Patient.countDocuments();
    if (count === 0) {
      console.log('Database empty, seeding with patient data...');
      const dataPath = '/data/patient-vitals-hierarchical.json';
      if (!fs.existsSync(dataPath)) {
        console.log('No data file found at', dataPath);
        return;
      }
      const raw = fs.readFileSync(dataPath, 'utf8');
      const patients = JSON.parse(raw);
      const result = await Patient.insertMany(patients);
      console.log(`Seeded ${result.length} patients successfully`);
    } else {
      console.log(`Database already contains ${count} patients`);
    }
  } catch (err) {
    console.error('Seeding error:', err.message);
  }
}

// Ensure MongoDB connection
let dbConnected = false;
mongoose.connect(MONGODB_URI)
  .then(async () => {
    dbConnected = true;
    console.log('MongoDB connected');
    await seedDatabase();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
    if (require.main === module) {
      // Only exit if running as main server, not in tests
      process.exit(1);
    }
  });

function signToken(username, role) {
  return jwt.sign({ sub: username, role }, JWT_SECRET, { expiresIn: '1h' });
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', mongodb: dbConnected });
});

// Simple login: accepts { username, password }
app.post('/auth/login', (req, res) => {
  const { username } = req.body || {};
  if (!username) return res.status(400).json({ error: 'username required' });

  // Assign role based on username pattern
  const role = username === 'admin' ? 'admin' : username.startsWith('doc') ? 'physician' : 'nurse';
  const token = signToken(username, role);
  res.json({ accessToken: token, tokenType: 'Bearer', expiresIn: 3600, role });
});

// Refresh token: accepts { token }
app.post('/auth/refresh', (req, res) => {
  const { token } = req.body || {};
  if (!token) return res.status(400).json({ error: 'token required' });
  try {
    const payload = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
    const newToken = signToken(payload.sub, payload.role || 'nurse');
    return res.json({ accessToken: newToken, tokenType: 'Bearer', expiresIn: 3600 });
  } catch (err) {
    return res.status(401).json({ error: 'invalid token' });
  }
});

// Protected middleware
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'missing authorization' });
  const parts = auth.split(' ');
  if (parts.length !== 2) return res.status(401).json({ error: 'malformed authorization' });
  const token = parts[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'invalid token' });
  }
}

// GET /api/patients - list patients with optional search
app.get('/api/patients', authMiddleware, async (req, res) => {
  try {
    const q = (req.query.q || '').toLowerCase();
    let query = {};
    
    if (q) {
      query = {
        $or: [
          { patientid: isNaN(q) ? undefined : parseInt(q) },
          { firstname: { $regex: q, $options: 'i' } },
          { lastname: { $regex: q, $options: 'i' } }
        ]
      };
      // Remove undefined from $or
      query.$or = query.$or.filter(cond => Object.values(cond)[0] !== undefined);
    }
    
    const patients = await Patient.find(query).select('patientid firstname lastname demographics');
    
    // Transform to include MRN and DOB extracted from demographics
    const transformed = patients.map(patient => {
      const dob = patient.demographics?.dateOfBirth || null;
      const mrn = patient.demographics?.mrn || patient.patientid;
      return {
        id: patient._id,
        patientid: patient.patientid,
        firstname: patient.firstname,
        lastname: patient.lastname,
        mrn: mrn,
        dateOfBirth: dob
      };
    });
    
    res.json(transformed);
  } catch (err) {
    console.error('Search patients error:', err);
    res.status(500).json({ error: 'failed to fetch patients', detail: err.message });
  }
});

// GET /api/patients/:id - get patient by id
app.get('/api/patients/:id', authMiddleware, async (req, res) => {
  try {
    const patient = await Patient.findOne({ patientid: parseInt(req.params.id) });
    if (!patient) return res.status(404).json({ error: 'not found' });
    
    // Ensure MRN is in demographics
    if (patient.demographics && !patient.demographics.mrn) {
      patient.demographics.mrn = `MRN-${patient.patientid}`;
    }
    
    res.json(patient);
  } catch (err) {
    console.error('Get patient by id error:', err);
    res.status(500).json({ error: 'failed to fetch patient', detail: err.message });
  }
});

// Helper function to parse date
function parseDate(d) {
  const dt = Date.parse(d);
  return isNaN(dt) ? null : new Date(dt);
}

// GET /api/patients/:id/vitals - get patient vitals with optional filters
app.get('/api/patients/:id/vitals', authMiddleware, async (req, res) => {
  try {
    const patient = await Patient.findOne({ patientid: parseInt(req.params.id) });
    if (!patient) return res.status(404).json({ error: 'not found' });
    
    let vitals = (patient.vitals || []).filter(v => !v.deletedAt);
    
    const from = req.query.from ? parseDate(req.query.from) : null;
    const to = req.query.to ? parseDate(req.query.to) : null;
    const type = req.query.type ? req.query.type.toLowerCase() : null;
    
    if (type) {
      vitals = vitals.filter(v => 
        (v.vital_description || '').toLowerCase().includes(type) || 
        (v.observationcode || '').toLowerCase().includes(type)
      );
    }
    
    if (from) {
      vitals = vitals.filter(v => {
        const d = parseDate(v.dateofobservation);
        return d && d >= from;
      });
    }
    
    if (to) {
      vitals = vitals.filter(v => {
        const d = parseDate(v.dateofobservation);
        return d && d <= to;
      });
    }
    
    res.json(vitals);
  } catch (err) {
    res.status(500).json({ error: 'failed to fetch vitals', detail: err.message });
  }
});

// GET /api/patients/:id/labs
app.get('/api/patients/:id/labs', authMiddleware, async (req, res) => {
  try {
    const patient = await Patient.findOne({ patientid: parseInt(req.params.id) });
    if (!patient) return res.status(404).json({ error: 'not found' });
    const labs = (patient.labs || []).filter(l => !l.deletedAt).map(lab => ({
      testName: lab.test_name,
      testCode: lab.test_code,
      value: lab.result,
      unit: lab.unit,
      referenceRange: lab.reference_range,
      resultDate: lab.date,
      labName: lab.lab_name
    }));
    res.json(labs);
  } catch (err) {
    res.status(500).json({ error: 'failed to fetch labs', detail: err.message });
  }
});

// GET /api/patients/:id/medications
app.get('/api/patients/:id/medications', authMiddleware, async (req, res) => {
  try {
    const patient = await Patient.findOne({ patientid: parseInt(req.params.id) });
    if (!patient) return res.status(404).json({ error: 'not found' });
    const meds = (patient.medications || []).filter(m => !m.deletedAt);
    res.json(meds);
  } catch (err) {
    res.status(500).json({ error: 'failed to fetch medications', detail: err.message });
  }
});

// GET /api/patients/:id/meds - alias for medications
app.get('/api/patients/:id/meds', authMiddleware, async (req, res) => {
  try {
    const patient = await Patient.findOne({ patientid: parseInt(req.params.id) });
    if (!patient) return res.status(404).json({ error: 'not found' });
    const meds = (patient.medications || []).filter(m => !m.deletedAt);
    res.json(meds);
  } catch (err) {
    res.status(500).json({ error: 'failed to fetch medications', detail: err.message });
  }
});

// GET /api/patients/:id/visits - get patient visits (all types)
app.get('/api/patients/:id/visits', authMiddleware, async (req, res) => {
  try {
    const patient = await Patient.findOne({ patientid: parseInt(req.params.id) });
    if (!patient) return res.status(404).json({ error: 'not found' });
    const visits = (patient.visits || []).filter(v => !v.deletedAt).map(visit => ({
      id: visit._id?.toString(),
      visitDate: visit.date,
      visitType: visit.visitType,
      reason: visit.reason,
      notes: visit.notes,
      provider: visit.provider_name,
      department: visit.facility_name,
      discharge_status: visit.discharge_status
    }));
    res.json(visits);
  } catch (err) {
    res.status(500).json({ error: 'failed to fetch visits', detail: err.message });
  }
});

// POST /api/patients/:id/vitals - create new vital record (retires old reading with same vital_description)
app.post('/api/patients/:id/vitals', authMiddleware, async (req, res) => {
  try {
    const patient = await Patient.findOne({ patientid: parseInt(req.params.id) });
    if (!patient) return res.status(404).json({ error: 'patient not found' });
    
    const newVital = req.body;
    if (!newVital.dateofobservation || !newVital.vital_description) {
      return res.status(400).json({ error: 'dateofobservation and vital_description are required' });
    }
    
    // Retire previous vital with the same vital_description
    patient.vitals.forEach(vital => {
      if (vital.vital_description === newVital.vital_description && !vital.deletedAt) {
        vital.deletedAt = new Date();
      }
    });
    
    patient.vitals.push(newVital);
    patient.markModified('vitals');
    await patient.save();
    res.status(201).json(newVital);
  } catch (err) {
    res.status(500).json({ error: 'failed to create vital', detail: err.message });
  }
});

// POST /api/patients/:id/labs - create new lab record
app.post('/api/patients/:id/labs', authMiddleware, async (req, res) => {
  try {
    const patient = await Patient.findOne({ patientid: parseInt(req.params.id) });
    if (!patient) return res.status(404).json({ error: 'patient not found' });
    
    const newLab = req.body;
    if (!newLab.date || !newLab.test_name) {
      return res.status(400).json({ error: 'date and test_name are required' });
    }
    
    patient.labs.push(newLab);
    await patient.save();
    res.status(201).json(newLab);
  } catch (err) {
    res.status(500).json({ error: 'failed to create lab', detail: err.message });
  }
});

// POST /api/patients/:id/medications - create new medication
app.post('/api/patients/:id/medications', authMiddleware, async (req, res) => {
  try {
    const patient = await Patient.findOne({ patientid: parseInt(req.params.id) });
    if (!patient) return res.status(404).json({ error: 'patient not found' });
    
    const newMed = req.body;
    if (!newMed.name) {
      return res.status(400).json({ error: 'name is required' });
    }
    
    patient.medications.push(newMed);
    await patient.save();
    res.status(201).json(newMed);
  } catch (err) {
    res.status(500).json({ error: 'failed to create medication', detail: err.message });
  }
});

// POST /api/patients/:id/visits - create new visit record
app.post('/api/patients/:id/visits', authMiddleware, async (req, res) => {
  try {
    const patient = await Patient.findOne({ patientid: parseInt(req.params.id) });
    if (!patient) return res.status(404).json({ error: 'patient not found' });
    
    const newVisit = req.body;
    if (!newVisit.date || !newVisit.visitType) {
      return res.status(400).json({ error: 'date and visitType are required' });
    }
    
    if (!['hospital', 'clinic', 'office'].includes(newVisit.visitType)) {
      return res.status(400).json({ error: 'visitType must be one of: hospital, clinic, office' });
    }
    
    patient.visits.push(newVisit);
    patient.markModified('visits');
    await patient.save();
    res.status(201).json(newVisit);
  } catch (err) {
    res.status(500).json({ error: 'failed to create visit', detail: err.message });
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Patient Records API listening on http://localhost:${PORT}`);
    console.log(`Swagger UI available at http://localhost:${PORT}/api-docs`);
  });
}

module.exports = app;

