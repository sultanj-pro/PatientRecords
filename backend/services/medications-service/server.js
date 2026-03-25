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
const PORT = process.env.PORT || 5005;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:admin@localhost:27017/patientrecords?authSource=admin';

const getRepository = require('../../shared/repositories/repositoryFactory');

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
  res.json({ status: 'ok', service: 'medications-service', port: PORT });
});

// GET /api/patients/:id/medications
app.get('/api/patients/:id/medications', authMiddleware, async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    const repo = getRepository('medications');
    const meds = await repo.getMedications(patientId);
    if (meds === null) return res.status(404).json({ error: 'not found' });
    res.json(meds.filter(m => !m.deletedAt));
  } catch (err) {
    res.status(500).json({ error: 'failed to fetch medications', detail: err.message });
  }
});

// GET /api/patients/:id/meds (alias)
app.get('/api/patients/:id/meds', authMiddleware, async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    const repo = getRepository('medications');
    const meds = await repo.getMedications(patientId);
    if (meds === null) return res.status(404).json({ error: 'not found' });
    res.json(meds.filter(m => !m.deletedAt));
  } catch (err) {
    res.status(500).json({ error: 'failed to fetch medications', detail: err.message });
  }
});

// POST /api/patients/:id/medications
app.post('/api/patients/:id/medications', authMiddleware, async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    if (!req.body.name) return res.status(400).json({ error: 'name is required' });
    const repo = getRepository('medications');
    const patient = await repo.addMedication(patientId, req.body);
    if (!patient) return res.status(404).json({ error: 'patient not found' });
    publishEvent('medication-changed', { patientId: req.params.id, action: 'added', medicationName: req.body.name });
    res.status(201).json(req.body);
  } catch (err) {
    res.status(500).json({ error: 'failed to create medication', detail: err.message });
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Medications Service listening on port ${PORT}`);
  });
}

module.exports = app;

