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

// Patient schema (mirrors the monolith)
const patientSchema = new mongoose.Schema({
  patientid: { type: Number, unique: true, required: true },
  firstname: String,
  lastname: String,
  demographics: {
    legalName: { first: String, middle: String, last: String },
    preferredName: String,
    dateOfBirth: Date,
    gender: String,
    sexAssignedAtBirth: String,
    ssn: String,
    mrn: String,
    bloodType: String,
    primaryPhone: String,
    secondaryPhone: String,
    email: String,
    address: { street: String, city: String, state: String, zip: String, country: String },
    emergencyContacts: [{ name: String, relationship: String, phone: String, isPrimary: Boolean }],
    preferredLanguage: String,
    race: String,
    ethnicity: String,
    maritalStatus: String,
    insurance: [{
      type: String, provider: String, policyNumber: String, groupNumber: String,
      subscriberName: String, subscriberRelationship: String, effectiveDate: Date, expirationDate: Date
    }]
  },
  vitals: [{
    dateofobservation: String, observationcode: String, observationcodesystem: String,
    organizationname: String, vital_description: String, unit: String, value: String,
    percentile: String, deletedAt: { type: Date, default: null }
  }],
  labs: [{
    date: String, test_name: String, test_code: String, result: String,
    unit: String, reference_range: String, deletedAt: { type: Date, default: null }
  }],
  medications: [{
    startDate: String, name: String, dose: String, frequency: String,
    indication: String, route: String, deletedAt: { type: Date, default: null }
  }],
  visits: [{
    date: String, visitType: { type: String, enum: ['hospital', 'clinic', 'office'] },
    reason: String, notes: String, provider_name: String, facility_name: String,
    discharge_status: String, deletedAt: { type: Date, default: null }
  }],
  allergies: [{
    type: String, substance: String, severity: String, reaction: String, dateReported: Date
  }],
  careTeam: [{
    name: { type: String, required: true },
    role: { type: String, required: true },
    specialty: String, phone: String, email: String, organization: String,
    startDate: Date, endDate: { type: Date, default: null },
    isPrimary: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null }
  }]
}, { timestamps: true });

patientSchema.index({ firstname: 1 });
patientSchema.index({ lastname: 1 });
patientSchema.index({ patientid: 1 });

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
    const q = (req.query.q || '').toLowerCase();
    let query = {};
    if (q) {
      query = { $or: [
        { patientid: isNaN(q) ? undefined : parseInt(q) },
        { firstname: { $regex: q, $options: 'i' } },
        { lastname: { $regex: q, $options: 'i' } }
      ].filter(c => Object.values(c)[0] !== undefined) };
    }
    const patients = await Patient.find(query).select('patientid firstname lastname demographics').limit(50);
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
    const patient = await Patient.findOne({ patientid: parseInt(req.params.id) });
    if (!patient) return res.status(404).json({ error: 'not found' });
    if (patient.demographics && !patient.demographics.mrn) patient.demographics.mrn = `MRN-${patient.patientid}`;
    res.json(patient);
  } catch (err) {
    res.status(500).json({ error: 'failed to fetch patient', detail: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Patient Service listening on port ${PORT}`);
});

app.get('/api/patients/:id/vitals', authMiddleware, async (req, res) => {
  try {
    const patient = await Patient.findOne({ patientid: parseInt(req.params.id) });
    if (!patient) return res.status(404).json({ error: 'not found' });
    let vitals = (patient.vitals || []).filter(v => !v.deletedAt);
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
    const patient = await Patient.findOne({ patientid: parseInt(req.params.id) });
    if (!patient) return res.status(404).json({ error: 'patient not found' });
    const newVital = req.body;
    if (!newVital.dateofobservation || !newVital.vital_description) return res.status(400).json({ error: 'dateofobservation and vital_description are required' });
    patient.vitals.forEach(v => { if (v.vital_description === newVital.vital_description && !v.deletedAt) v.deletedAt = new Date(); });
    patient.vitals.push(newVital);
    patient.markModified('vitals');
    await patient.save();
    res.status(201).json(newVital);
  } catch (err) {
    res.status(500).json({ error: 'failed to create vital', detail: err.message });
  }
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
    const newLab = req.body;
    if (!newLab.date || !newLab.test_name) return res.status(400).json({ error: 'date and test_name are required' });
    patient.labs.push(newLab);
    await patient.save();
    res.status(201).json(newLab);
  } catch (err) {
    res.status(500).json({ error: 'failed to create lab', detail: err.message });
  }
});

// GET /api/patients/:id/medications
app.get('/api/patients/:id/medications', authMiddleware, async (req, res) => {
  try {
    const patient = await Patient.findOne({ patientid: parseInt(req.params.id) });
    if (!patient) return res.status(404).json({ error: 'not found' });
    res.json((patient.medications || []).filter(m => !m.deletedAt));
  } catch (err) {
    res.status(500).json({ error: 'failed to fetch medications', detail: err.message });
  }
});

// GET /api/patients/:id/meds (alias)
app.get('/api/patients/:id/meds', authMiddleware, async (req, res) => {
  try {
    const patient = await Patient.findOne({ patientid: parseInt(req.params.id) });
    if (!patient) return res.status(404).json({ error: 'not found' });
    res.json((patient.medications || []).filter(m => !m.deletedAt));
  } catch (err) {
    res.status(500).json({ error: 'failed to fetch medications', detail: err.message });
  }
});

// POST /api/patients/:id/medications
app.post('/api/patients/:id/medications', authMiddleware, async (req, res) => {
  try {
    const patient = await Patient.findOne({ patientid: parseInt(req.params.id) });
    if (!patient) return res.status(404).json({ error: 'patient not found' });
    if (!req.body.name) return res.status(400).json({ error: 'name is required' });
    patient.medications.push(req.body);
    await patient.save();
    res.status(201).json(req.body);
  } catch (err) {
    res.status(500).json({ error: 'failed to create medication', detail: err.message });
  }
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
    if (!req.body.date || !req.body.visitType) return res.status(400).json({ error: 'date and visitType are required' });
    if (!['hospital', 'clinic', 'office'].includes(req.body.visitType)) return res.status(400).json({ error: 'visitType must be hospital, clinic, or office' });
    patient.visits.push(req.body);
    patient.markModified('visits');
    await patient.save();
    res.status(201).json(req.body);
  } catch (err) {
    res.status(500).json({ error: 'failed to create visit', detail: err.message });
  }
});

// GET /api/patients/:id/care-team
app.get('/api/patients/:id/care-team', authMiddleware, async (req, res) => {
  try {
    const patient = await Patient.findOne({ patientid: parseInt(req.params.id) });
    if (!patient) return res.status(404).json({ error: 'not found' });
    res.json((patient.careTeam || []).filter(m => !m.deletedAt).map(m => ({
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
    const patient = await Patient.findOne({ patientid: parseInt(req.params.id) });
    if (!patient) return res.status(404).json({ error: 'patient not found' });
    if (!req.body.name || !req.body.role) return res.status(400).json({ error: 'name and role are required' });
    if (req.body.isPrimary) patient.careTeam.forEach(m => { if (!m.deletedAt) m.isPrimary = false; });
    patient.careTeam.push(req.body);
    patient.markModified('careTeam');
    await patient.save();
    const saved = patient.careTeam[patient.careTeam.length - 1];
    res.status(201).json({ id: saved._id?.toString(), name: saved.name, role: saved.role, specialty: saved.specialty, phone: saved.phone, email: saved.email, organization: saved.organization, startDate: saved.startDate, endDate: saved.endDate, isPrimary: saved.isPrimary });
  } catch (err) {
    res.status(500).json({ error: 'failed to create care team member', detail: err.message });
  }
});

// PUT /api/patients/:id/care-team/:memberId
app.put('/api/patients/:id/care-team/:memberId', authMiddleware, async (req, res) => {
  try {
    const patient = await Patient.findOne({ patientid: parseInt(req.params.id) });
    if (!patient) return res.status(404).json({ error: 'patient not found' });
    const member = patient.careTeam.find(m => m._id?.toString() === req.params.memberId && !m.deletedAt);
    if (!member) return res.status(404).json({ error: 'care team member not found' });
    const fields = ['name', 'role', 'specialty', 'phone', 'email', 'organization', 'startDate', 'endDate'];
    fields.forEach(f => { if (req.body[f] !== undefined) member[f] = req.body[f]; });
    if (req.body.isPrimary === true) { patient.careTeam.forEach(m => { if (m._id?.toString() !== req.params.memberId && !m.deletedAt) m.isPrimary = false; }); member.isPrimary = true; }
    else if (req.body.isPrimary === false) member.isPrimary = false;
    patient.markModified('careTeam');
    await patient.save();
    res.json({ id: member._id?.toString(), name: member.name, role: member.role, specialty: member.specialty, phone: member.phone, email: member.email, organization: member.organization, startDate: member.startDate, endDate: member.endDate, isPrimary: member.isPrimary });
  } catch (err) {
    res.status(500).json({ error: 'failed to update care team member', detail: err.message });
  }
});

// DELETE /api/patients/:id/care-team/:memberId
app.delete('/api/patients/:id/care-team/:memberId', authMiddleware, async (req, res) => {
  try {
    const patient = await Patient.findOne({ patientid: parseInt(req.params.id) });
    if (!patient) return res.status(404).json({ error: 'patient not found' });
    const member = patient.careTeam.find(m => m._id?.toString() === req.params.memberId && !m.deletedAt);
    if (!member) return res.status(404).json({ error: 'care team member not found' });
    member.deletedAt = new Date();
    patient.markModified('careTeam');
    await patient.save();
    res.json({ success: true, message: 'care team member removed' });
  } catch (err) {
    res.status(500).json({ error: 'failed to delete care team member', detail: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Patient Service listening on port ${PORT}`);
});

