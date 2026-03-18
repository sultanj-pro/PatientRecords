const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const PORT = process.env.PORT || 5004;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:admin@localhost:27017/patientrecords?authSource=admin';

const patientSchema = new mongoose.Schema({
  patientid: { type: Number, unique: true, required: true },
  labs: [{
    date: String, test_name: String, test_code: String, result: String,
    unit: String, reference_range: String, lab_name: String, deletedAt: { type: Date, default: null }
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
  res.json({ status: 'ok', service: 'labs-service', port: PORT });
});

// GET /api/patients/:id/labs
app.get('/api/patients/:id/labs', authMiddleware, async (req, res) => {
  try {
    const patient = await Patient.findOne({ patientid: parseInt(req.params.id) });
    if (!patient) return res.status(404).json({ error: 'not found' });
    res.json((patient.labs || []).filter(l => !l.deletedAt).map(l => ({
      testName: l.test_name, testCode: l.test_code, value: l.result, unit: l.unit,
      referenceRange: l.reference_range, resultDate: l.date, labName: l.lab_name
    })));
  } catch (err) {
    res.status(500).json({ error: 'failed to fetch labs', detail: err.message });
  }
});

// POST /api/patients/:id/labs
app.post('/api/patients/:id/labs', authMiddleware, async (req, res) => {
  try {
    const patient = await Patient.findOne({ patientid: parseInt(req.params.id) });
    if (!patient) return res.status(404).json({ error: 'patient not found' });
    if (!req.body.date || !req.body.test_name)
      return res.status(400).json({ error: 'date and test_name are required' });
    patient.labs.push(req.body);
    await patient.save();
    res.status(201).json(req.body);
  } catch (err) {
    res.status(500).json({ error: 'failed to create lab', detail: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Labs Service listening on port ${PORT}`);
});
