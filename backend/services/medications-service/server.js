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

if ((process.env.DB_ADAPTER || 'mongo').toLowerCase() !== 'knex') {
  mongoose.connect(MONGODB_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => { console.error('MongoDB connection error:', err.message); process.exit(1); });
}

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

// GET /api/patients/:id/medications/history — discontinued (soft-deleted) medications
app.get('/api/patients/:id/medications/history', authMiddleware, async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    const repo = getRepository('medications');
    const meds = await repo.getDiscontinuedMedications(patientId);
    res.json(meds || []);
  } catch (err) {
    res.status(500).json({ error: 'failed to fetch medication history', detail: err.message });
  }
});

// POST /api/patients/:id/medications/:medId/reactivate — restore a discontinued medication
app.post('/api/patients/:id/medications/:medId/reactivate', authMiddleware, async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    const { medId } = req.params;
    const repo = getRepository('medications');
    const reactivated = await repo.reactivateMedication(patientId, medId);
    if (!reactivated) return res.status(404).json({ error: 'discontinued medication not found' });

    publishEvent('medication-changed', {
      patientId: req.params.id,
      action: 'reactivated',
      medicationId: medId,
      medicationName: reactivated.name || 'unknown',
      performedBy: req.user?.username || req.user?.sub || 'unknown',
    });
    res.json(reactivated);
  } catch (err) {
    res.status(500).json({ error: 'failed to reactivate medication', detail: err.message });
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
    publishEvent('medication-changed', { patientId: req.params.id, action: 'added', medicationName: req.body.name, performedBy: req.user?.username || req.user?.sub || 'unknown' });
    res.status(201).json(req.body);
  } catch (err) {
    res.status(500).json({ error: 'failed to create medication', detail: err.message });
  }
});

// PUT /api/patients/:id/medications/:medId
app.put('/api/patients/:id/medications/:medId', authMiddleware, async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    const { medId } = req.params;
    if (!req.body.name) return res.status(400).json({ error: 'name is required' });
    const repo = getRepository('medications');

    // Capture before-state for audit trail
    const allMeds = await repo.getMedications(patientId);
    const before = allMeds ? allMeds.find(m => String(m._id) === String(medId)) : null;

    const updated = await repo.updateMedication(patientId, medId, req.body);
    if (!updated) return res.status(404).json({ error: 'medication not found' });

    publishEvent('medication-changed', {
      patientId: req.params.id,
      action: 'updated',
      medicationId: medId,
      medicationName: req.body.name,
      performedBy: req.user?.username || req.user?.sub || 'unknown',
      before: before ? { name: before.name, dose: before.dose, frequency: before.frequency } : null,
      after:  { name: req.body.name, dose: req.body.dose, frequency: req.body.frequency },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'failed to update medication', detail: err.message });
  }
});

// DELETE /api/patients/:id/medications/:medId  (soft delete — sets deletedAt, never removes)
app.delete('/api/patients/:id/medications/:medId', authMiddleware, async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    const { medId } = req.params;
    const repo = getRepository('medications');

    // Capture the record name before soft-deleting for audit trail
    const allMeds = await repo.getMedications(patientId);
    const target = allMeds ? allMeds.find(m => String(m._id) === String(medId)) : null;

    const deleted = await repo.deleteMedication(patientId, medId);
    if (!deleted) return res.status(404).json({ error: 'medication not found' });

    publishEvent('medication-changed', {
      patientId: req.params.id,
      action: 'discontinued',
      medicationId: medId,
      medicationName: target?.name || 'unknown',
      performedBy: req.user?.username || req.user?.sub || 'unknown',
    });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'failed to discontinue medication', detail: err.message });
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Medications Service listening on port ${PORT}`);
  });
}

module.exports = app;

