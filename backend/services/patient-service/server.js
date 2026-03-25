const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

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
const PORT = process.env.PORT || 5002;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:admin@localhost:27017/patientrecords?authSource=admin';

const getRepository = require('../../shared/repositories/repositoryFactory');

mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => { console.error('MongoDB connection error:', err.message); process.exit(1); });

function parseDate(d) {
  const dt = Date.parse(d);
  return isNaN(dt) ? null : new Date(dt);
}

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'missing authorization' });
  const parts = auth.split(' ');
  if (parts.length !== 2) return res.status(401).json({ error: 'malformed authorization' });
  try {
    const payload = jwt.verify(parts[1], JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'invalid token' });
  }
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'patient-service', port: PORT });
});

// GET /api/patients
app.get('/api/patients', authMiddleware, async (req, res) => {
  try {
    const repo = getRepository('patient');
    const patients = await repo.list(req.query.q || null);
    res.json(patients.map(p => ({
      id: p._id, patientid: p.patientid, firstname: p.firstname, lastname: p.lastname,
      mrn: p.demographics?.mrn || p.patientid, dateOfBirth: p.demographics?.dateOfBirth || null
    })));
  } catch (err) {
    res.status(500).json({ error: 'failed to fetch patients', detail: err.message });
  }
});

// GET /api/patients/:id
app.get('/api/patients/:id', authMiddleware, async (req, res) => {
  try {
    const repo = getRepository('patient');
    const patient = await repo.getByPatientId(parseInt(req.params.id));
    if (!patient) return res.status(404).json({ error: 'not found' });
    if (patient.demographics && !patient.demographics.mrn) patient.demographics.mrn = `MRN-${patient.patientid}`;
    res.json(patient);
  } catch (err) {
    res.status(500).json({ error: 'failed to fetch patient', detail: err.message });
  }
});

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
    if (!newVital.dateofobservation || !newVital.vital_description) return res.status(400).json({ error: 'dateofobservation and vital_description are required' });
    const repo = getRepository('vitals');
    const patient = await repo.addVital(patientId, newVital);
    if (!patient) return res.status(404).json({ error: 'patient not found' });
    res.status(201).json(newVital);
  } catch (err) {
    res.status(500).json({ error: 'failed to create vital', detail: err.message });
  }
});

// GET /api/patients/:id/labs
app.get('/api/patients/:id/labs', authMiddleware, async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    const repo = getRepository('labs');
    const labs = await repo.getLabs(patientId);
    if (labs === null) return res.status(404).json({ error: 'not found' });
    res.json(labs.filter(l => !l.deletedAt).map(l => ({
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
    const patientId = parseInt(req.params.id);
    const newLab = req.body;
    if (!newLab.date || !newLab.test_name) return res.status(400).json({ error: 'date and test_name are required' });
    const repo = getRepository('labs');
    const patient = await repo.addLab(patientId, newLab);
    if (!patient) return res.status(404).json({ error: 'patient not found' });
    res.status(201).json(newLab);
  } catch (err) {
    res.status(500).json({ error: 'failed to create lab', detail: err.message });
  }
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
    res.status(201).json(req.body);
  } catch (err) {
    res.status(500).json({ error: 'failed to create medication', detail: err.message });
  }
});

// GET /api/patients/:id/visits
app.get('/api/patients/:id/visits', authMiddleware, async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    const repo = getRepository('visits');
    const visits = await repo.getVisits(patientId);
    if (visits === null) return res.status(404).json({ error: 'not found' });
    res.json(visits.filter(v => !v.deletedAt).map(v => ({
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
    const patientId = parseInt(req.params.id);
    if (!req.body.date || !req.body.visitType) return res.status(400).json({ error: 'date and visitType are required' });
    if (!['hospital', 'clinic', 'office'].includes(req.body.visitType)) return res.status(400).json({ error: 'visitType must be hospital, clinic, or office' });
    const repo = getRepository('visits');
    const patient = await repo.addVisit(patientId, req.body);
    if (!patient) return res.status(404).json({ error: 'patient not found' });
    res.status(201).json(req.body);
  } catch (err) {
    res.status(500).json({ error: 'failed to create visit', detail: err.message });
  }
});

// GET /api/patients/:id/care-team
app.get('/api/patients/:id/care-team', authMiddleware, async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    const repo = getRepository('careTeam');
    const members = await repo.getCareTeam(patientId);
    if (members === null) return res.status(404).json({ error: 'not found' });
    res.json(members.map(m => ({
      id: m._id?.toString(), name: m.name, role: m.role, specialty: m.specialty,
      phone: m.phone, email: m.email, organization: m.organization,
      startDate: m.startDate, endDate: m.endDate, isPrimary: m.isPrimary
    })));
  } catch (err) {
    res.status(500).json({ error: 'failed to fetch care team', detail: err.message });
  }
});

// POST /api/patients/:id/care-team
app.post('/api/patients/:id/care-team', authMiddleware, async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    if (!req.body.name || !req.body.role) return res.status(400).json({ error: 'name and role are required' });
    const repo = getRepository('careTeam');
    const patient = await repo.addMember(patientId, req.body);
    if (!patient) return res.status(404).json({ error: 'patient not found' });
    const saved = patient.careTeam[patient.careTeam.length - 1];
    res.status(201).json({ id: saved._id?.toString(), name: saved.name, role: saved.role, specialty: saved.specialty, phone: saved.phone, email: saved.email, organization: saved.organization, startDate: saved.startDate, endDate: saved.endDate, isPrimary: saved.isPrimary });
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
    res.json({ id: member._id?.toString(), name: member.name, role: member.role, specialty: member.specialty, phone: member.phone, email: member.email, organization: member.organization, startDate: member.startDate, endDate: member.endDate, isPrimary: member.isPrimary });
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
    console.log(`Patient Service listening on port ${PORT}`);
  });
}

module.exports = app;

