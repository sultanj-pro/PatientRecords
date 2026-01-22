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
const SPARK_SERVICE_URL = process.env.SPARK_SERVICE_URL || process.env.SPARK_URL || 'http://spark-service:8998';

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
      route: String,
      deletedAt: { type: Date, default: null }
    }
  ],
  physician_visits: [
    {
      date: String,
      clinic: String,
      reason: String,
      notes: String,
      provider_name: String,
      facility_name: String,
      deletedAt: { type: Date, default: null }
    }
  ],
  hospital_visits: [
    {
      date: String,
      facility: String,
      reason: String,
      notes: String,
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
    
    const patients = await Patient.find(query).select('patientid firstname lastname');
    res.json(patients);
  } catch (err) {
    res.status(500).json({ error: 'failed to fetch patients', detail: err.message });
  }
});

// GET /api/patients/:id - get patient by id
app.get('/api/patients/:id', authMiddleware, async (req, res) => {
  try {
    const patient = await Patient.findOne({ patientid: parseInt(req.params.id) });
    if (!patient) return res.status(404).json({ error: 'not found' });
    res.json(patient);
  } catch (err) {
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
    const labs = (patient.labs || []).filter(l => !l.deletedAt);
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

// GET /api/patients/:id/physician-visits
app.get('/api/patients/:id/physician-visits', authMiddleware, async (req, res) => {
  try {
    const patient = await Patient.findOne({ patientid: parseInt(req.params.id) });
    if (!patient) return res.status(404).json({ error: 'not found' });
    const visits = (patient.physician_visits || []).filter(v => !v.deletedAt);
    res.json(visits);
  } catch (err) {
    res.status(500).json({ error: 'failed to fetch physician visits', detail: err.message });
  }
});

// GET /api/patients/:id/hospital-visits
app.get('/api/patients/:id/hospital-visits', authMiddleware, async (req, res) => {
  try {
    const patient = await Patient.findOne({ patientid: parseInt(req.params.id) });
    if (!patient) return res.status(404).json({ error: 'not found' });
    const visits = (patient.hospital_visits || []).filter(v => !v.deletedAt);
    res.json(visits);
  } catch (err) {
    res.status(500).json({ error: 'failed to fetch hospital visits', detail: err.message });
  }
});

// GET /api/patients/:id/visits - combine physician and hospital visits
app.get('/api/patients/:id/visits', authMiddleware, async (req, res) => {
  try {
    const patient = await Patient.findOne({ patientid: parseInt(req.params.id) });
    if (!patient) return res.status(404).json({ error: 'not found' });
    const phys = (patient.physician_visits || []).filter(v => !v.deletedAt);
    const hosp = (patient.hospital_visits || []).filter(v => !v.deletedAt);
    const combined = phys.concat(hosp);
    res.json(combined);
  } catch (err) {
    res.status(500).json({ error: 'failed to fetch visits', detail: err.message });
  }
});

// POST /api/patients/:id/vitals - create new vital record
app.post('/api/patients/:id/vitals', authMiddleware, async (req, res) => {
  try {
    const patient = await Patient.findOne({ patientid: parseInt(req.params.id) });
    if (!patient) return res.status(404).json({ error: 'patient not found' });
    
    const newVital = req.body;
    if (!newVital.dateofobservation || !newVital.vital_description) {
      return res.status(400).json({ error: 'dateofobservation and vital_description are required' });
    }
    
    patient.vitals.push(newVital);
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

// POST /api/patients/:id/physician-visits - create new physician visit
app.post('/api/patients/:id/physician-visits', authMiddleware, async (req, res) => {
  try {
    const patient = await Patient.findOne({ patientid: parseInt(req.params.id) });
    if (!patient) return res.status(404).json({ error: 'patient not found' });
    
    const newVisit = req.body;
    if (!newVisit.date || !newVisit.clinic) {
      return res.status(400).json({ error: 'date and clinic are required' });
    }
    
    patient.physician_visits.push(newVisit);
    await patient.save();
    res.status(201).json(newVisit);
  } catch (err) {
    res.status(500).json({ error: 'failed to create physician visit', detail: err.message });
  }
});

// POST /api/patients/:id/hospital-visits - create new hospital visit
app.post('/api/patients/:id/hospital-visits', authMiddleware, async (req, res) => {
  try {
    const patient = await Patient.findOne({ patientid: parseInt(req.params.id) });
    if (!patient) return res.status(404).json({ error: 'patient not found' });
    
    const newVisit = req.body;
    if (!newVisit.date || !newVisit.facility) {
      return res.status(400).json({ error: 'date and facility are required' });
    }
    
    patient.hospital_visits.push(newVisit);
    await patient.save();
    res.status(201).json(newVisit);
  } catch (err) {
    res.status(500).json({ error: 'failed to create hospital visit', detail: err.message });
  }
});

// PUT /api/patients/:id/vitals/:vitalId - update vital record
app.put('/api/patients/:id/vitals/:vitalId', authMiddleware, async (req, res) => {
  try {
    const patient = await Patient.findOne({ patientid: parseInt(req.params.id) });
    if (!patient) return res.status(404).json({ error: 'patient not found' });
    
    const vitalIndex = patient.vitals.findIndex((v, idx) => idx === parseInt(req.params.vitalId));
    if (vitalIndex === -1) return res.status(404).json({ error: 'vital record not found' });
    
    const updateData = req.body;
    if (!updateData.dateofobservation || !updateData.vital_description) {
      return res.status(400).json({ error: 'dateofobservation and vital_description are required' });
    }
    
    patient.vitals[vitalIndex] = { ...patient.vitals[vitalIndex], ...updateData };
    patient.markModified('vitals');
    await patient.save();
    res.status(200).json(patient.vitals[vitalIndex]);
  } catch (err) {
    res.status(500).json({ error: 'failed to update vital', detail: err.message });
  }
});

// PUT /api/patients/:id/labs/:labId - update lab record
app.put('/api/patients/:id/labs/:labId', authMiddleware, async (req, res) => {
  try {
    const patient = await Patient.findOne({ patientid: parseInt(req.params.id) });
    if (!patient) return res.status(404).json({ error: 'patient not found' });
    
    const labIndex = patient.labs.findIndex((l, idx) => idx === parseInt(req.params.labId));
    if (labIndex === -1) return res.status(404).json({ error: 'lab record not found' });
    
    const updateData = req.body;
    if (!updateData.date || !updateData.test_name) {
      return res.status(400).json({ error: 'date and test_name are required' });
    }
    
    patient.labs[labIndex] = { ...patient.labs[labIndex], ...updateData };
    patient.markModified('labs');
    await patient.save();
    res.status(200).json(patient.labs[labIndex]);
  } catch (err) {
    res.status(500).json({ error: 'failed to update lab', detail: err.message });
  }
});

// PUT /api/patients/:id/medications/:medId - update medication
app.put('/api/patients/:id/medications/:medId', authMiddleware, async (req, res) => {
  try {
    const patient = await Patient.findOne({ patientid: parseInt(req.params.id) });
    if (!patient) return res.status(404).json({ error: 'patient not found' });
    
    const medIndex = patient.medications.findIndex((m, idx) => idx === parseInt(req.params.medId));
    if (medIndex === -1) return res.status(404).json({ error: 'medication record not found' });
    
    const updateData = req.body;
    if (!updateData.name) {
      return res.status(400).json({ error: 'name is required' });
    }
    
    patient.medications[medIndex] = { ...patient.medications[medIndex], ...updateData };
    patient.markModified('medications');
    await patient.save();
    res.status(200).json(patient.medications[medIndex]);
  } catch (err) {
    res.status(500).json({ error: 'failed to update medication', detail: err.message });
  }
});

// PUT /api/patients/:id/physician-visits/:visitId - update physician visit
app.put('/api/patients/:id/physician-visits/:visitId', authMiddleware, async (req, res) => {
  try {
    const patient = await Patient.findOne({ patientid: parseInt(req.params.id) });
    if (!patient) return res.status(404).json({ error: 'patient not found' });
    
    const visitIndex = patient.physician_visits.findIndex((v, idx) => idx === parseInt(req.params.visitId));
    if (visitIndex === -1) return res.status(404).json({ error: 'physician visit not found' });
    
    const updateData = req.body;
    if (!updateData.date || !updateData.clinic) {
      return res.status(400).json({ error: 'date and clinic are required' });
    }
    
    patient.physician_visits[visitIndex] = { ...patient.physician_visits[visitIndex], ...updateData };
    patient.markModified('physician_visits');
    await patient.save();
    res.status(200).json(patient.physician_visits[visitIndex]);
  } catch (err) {
    res.status(500).json({ error: 'failed to update physician visit', detail: err.message });
  }
});

// PUT /api/patients/:id/hospital-visits/:visitId - update hospital visit
app.put('/api/patients/:id/hospital-visits/:visitId', authMiddleware, async (req, res) => {
  try {
    const patient = await Patient.findOne({ patientid: parseInt(req.params.id) });
    if (!patient) return res.status(404).json({ error: 'patient not found' });
    
    const visitIndex = patient.hospital_visits.findIndex((v, idx) => idx === parseInt(req.params.visitId));
    if (visitIndex === -1) return res.status(404).json({ error: 'hospital visit not found' });
    
    const updateData = req.body;
    if (!updateData.date || !updateData.facility) {
      return res.status(400).json({ error: 'date and facility are required' });
    }
    
    patient.hospital_visits[visitIndex] = { ...patient.hospital_visits[visitIndex], ...updateData };
    patient.markModified('hospital_visits');
    await patient.save();
    res.status(200).json(patient.hospital_visits[visitIndex]);
  } catch (err) {
    res.status(500).json({ error: 'failed to update hospital visit', detail: err.message });
  }
});

// Proxy endpoint to spark-service
app.get('/api/provider-options', authMiddleware, async (req, res) => {
  try {
    const resp = await fetch(`${SPARK_SERVICE_URL}/provider-options`);
    const json = await resp.json();
    res.json(json);
  } catch (err) {
    res.status(502).json({ error: 'failed to reach spark-service', detail: err.message });
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Patient Records API listening on http://localhost:${PORT}`);
    console.log(`Swagger UI available at http://localhost:${PORT}/api-docs`);
  });
}

module.exports = app;

