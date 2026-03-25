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
const PORT = process.env.PORT || 5007;
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

function mapMember(m) {
  return { id: m._id?.toString(), name: m.name, role: m.role, specialty: m.specialty,
    phone: m.phone, email: m.email, organization: m.organization,
    startDate: m.startDate, endDate: m.endDate, isPrimary: m.isPrimary };
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'care-team-service', port: PORT });
});

// GET /api/patients/:id/care-team
app.get('/api/patients/:id/care-team', authMiddleware, async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    const repo = getRepository('careTeam');
    const members = await repo.getCareTeam(patientId);
    if (members === null) return res.status(404).json({ error: 'not found' });
    res.json(members.map(mapMember));
  } catch (err) {
    res.status(500).json({ error: 'failed to fetch care team', detail: err.message });
  }
});

// POST /api/patients/:id/care-team
app.post('/api/patients/:id/care-team', authMiddleware, async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    if (!req.body.name || !req.body.role)
      return res.status(400).json({ error: 'name and role are required' });
    const repo = getRepository('careTeam');
    const patient = await repo.addMember(patientId, req.body);
    if (!patient) return res.status(404).json({ error: 'patient not found' });
    publishEvent('care-team-updated', { patientId: req.params.id, action: 'added' });
    res.status(201).json(mapMember(patient.careTeam[patient.careTeam.length - 1]));
  } catch (err) {
    res.status(500).json({ error: 'failed to create care team member', detail: err.message });
  }
});

// PUT /api/patients/:id/care-team/:memberId
app.put('/api/patients/:id/care-team/:memberId', authMiddleware, async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    const { memberId } = req.params;
    const updates = {};
    ['name', 'role', 'specialty', 'phone', 'email', 'organization', 'startDate', 'endDate'].forEach(f => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });
    if (req.body.isPrimary !== undefined) updates.isPrimary = req.body.isPrimary;
    const repo = getRepository('careTeam');
    const member = await repo.updateMember(patientId, memberId, updates);
    if (member === null) return res.status(404).json({ error: 'care team member not found' });
    publishEvent('care-team-updated', { patientId: req.params.id, action: 'updated', memberId });
    res.json(mapMember(member));
  } catch (err) {
    res.status(500).json({ error: 'failed to update care team member', detail: err.message });
  }
});

// DELETE /api/patients/:id/care-team/:memberId
app.delete('/api/patients/:id/care-team/:memberId', authMiddleware, async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    const { memberId } = req.params;
    const repo = getRepository('careTeam');
    const deleted = await repo.removeMember(patientId, memberId);
    if (!deleted) return res.status(404).json({ error: 'care team member not found' });
    res.json({ success: true, message: 'care team member removed' });
  } catch (err) {
    res.status(500).json({ error: 'failed to delete care team member', detail: err.message });
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Care Team Service listening on port ${PORT}`);
  });
}

module.exports = app;

