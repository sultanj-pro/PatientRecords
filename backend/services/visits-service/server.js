const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { publishEvent } = require('./shared/eventPublisher');

const app = express();
app.use(cors());
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(JSON.stringify({ time: new Date().toISOString(), method: req.method, path: req.path, status: res.statusCode, ms: Date.now() - start }));
  });
  next();
});

app.use(bodyParser.json());

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const PORT = process.env.PORT || 5006;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:admin@localhost:27017/patientrecords?authSource=admin';

const patientSchema = new mongoose.Schema({
  patientid: { type: Number, unique: true, required: true },
  visits: [{
    date: String, visitType: { type: String, enum: ['hospital', 'clinic', 'office'] },
    reason: String, notes: String, provider_name: String, facility_name: String,
    discharge_status: String, deletedAt: { type: Date, default: null }
  }]
}, { strict: false, timestamps: true });

const Patient = mongoose.model('Patient', patientSchema);

mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => { console.error('MongoDB connection error:', err.message); process.exit(1); });

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'missing authorization' });
  const parts = auth.split(' ');
  if (parts.length !== 2) return res.status(401).json({ error: 'malformed authorization' });
  try {
    req.user = jwt.verify(parts[1], JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'invalid token' });
  }
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'visits-service', port: PORT });
});

// GET /api/patients/:id/visits
app.get('/api/patients/:id/visits', authMiddleware, async (req, res) => {
  try {
    const patient = await Patient.findOne({ patientid: parseInt(req.params.id) });
    if (!patient) return res.status(404).json({ error: 'not found' });
    res.json((patient.visits || []).filter(v => !v.deletedAt).map(v => ({
      id: v._id?.toString(), visitDate: v.date, visitType: v.visitType, reason: v.reason,
      notes: v.notes, provider: v.provider_name, department: v.facility_name, discharge_status: v.discharge_status
    })));
  } catch (err) {
    res.status(500).json({ error: 'failed to fetch visits', detail: err.message });
  }
});

// POST /api/patients/:id/visits
app.post('/api/patients/:id/visits', authMiddleware, async (req, res) => {
  try {
    const patient = await Patient.findOne({ patientid: parseInt(req.params.id) });
    if (!patient) return res.status(404).json({ error: 'patient not found' });
    if (!req.body.date || !req.body.visitType)
      return res.status(400).json({ error: 'date and visitType are required' });
    if (!['hospital', 'clinic', 'office'].includes(req.body.visitType))
      return res.status(400).json({ error: 'visitType must be hospital, clinic, or office' });
    patient.visits.push(req.body);
    patient.markModified('visits');
    await patient.save();
    publishEvent('visit-completed', { patientId: req.params.id, visitType: req.body.visitType });
    res.status(201).json(req.body);
  } catch (err) {
    res.status(500).json({ error: 'failed to create visit', detail: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Visits Service listening on port ${PORT}`);
});

