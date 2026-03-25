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
const PORT = process.env.PORT || 5003;
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

function parseDate(d) {
  const dt = Date.parse(d);
  return isNaN(dt) ? null : new Date(dt);
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'vitals-service', port: PORT });
});

// GET /api/patients/:id/vitals
app.get('/api/patients/:id/vitals', authMiddleware, async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    const repo = getRepository('vitals');
    let vitals = await repo.getVitals(patientId);
    if (vitals === null) return res.status(404).json({ error: 'not found' });
    vitals = vitals.filter(v => !v.deletedAt);
    const from = req.query.from ? parseDate(req.query.from) : null;
    const to = req.query.to ? parseDate(req.query.to) : null;
    const type = req.query.type ? req.query.type.toLowerCase() : null;
    if (type) vitals = vitals.filter(v => (v.vital_description || '').toLowerCase().includes(type) || (v.observationcode || '').toLowerCase().includes(type));
    if (from) vitals = vitals.filter(v => { const d = parseDate(v.dateofobservation); return d && d >= from; });
    if (to) vitals = vitals.filter(v => { const d = parseDate(v.dateofobservation); return d && d <= to; });
    res.json(vitals);
  } catch (err) {
    res.status(500).json({ error: 'failed to fetch vitals', detail: err.message });
  }
});

// POST /api/patients/:id/vitals
app.post('/api/patients/:id/vitals', authMiddleware, async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    const newVital = req.body;
    if (!newVital.dateofobservation || !newVital.vital_description)
      return res.status(400).json({ error: 'dateofobservation and vital_description are required' });
    const repo = getRepository('vitals');
    const patient = await repo.addVital(patientId, newVital);
    if (!patient) return res.status(404).json({ error: 'patient not found' });
    publishEvent('vitals-recorded', { patientId: req.params.id, vitalType: newVital.vital_description });
    res.status(201).json(newVital);
  } catch (err) {
    res.status(500).json({ error: 'failed to create vital', detail: err.message });
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Vitals Service listening on port ${PORT}`);
  });
}

module.exports = app;

