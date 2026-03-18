const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const PORT = process.env.PORT || 5007;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:admin@localhost:27017/patientrecords?authSource=admin';

const patientSchema = new mongoose.Schema({
  patientid: { type: Number, unique: true, required: true },
  careTeam: [{
    name: { type: String, required: true },
    role: { type: String, required: true },
    specialty: String, phone: String, email: String, organization: String,
    startDate: Date, endDate: { type: Date, default: null },
    isPrimary: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null }
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
    const patient = await Patient.findOne({ patientid: parseInt(req.params.id) });
    if (!patient) return res.status(404).json({ error: 'not found' });
    res.json((patient.careTeam || []).filter(m => !m.deletedAt).map(mapMember));
  } catch (err) {
    res.status(500).json({ error: 'failed to fetch care team', detail: err.message });
  }
});

// POST /api/patients/:id/care-team
app.post('/api/patients/:id/care-team', authMiddleware, async (req, res) => {
  try {
    const patient = await Patient.findOne({ patientid: parseInt(req.params.id) });
    if (!patient) return res.status(404).json({ error: 'patient not found' });
    if (!req.body.name || !req.body.role)
      return res.status(400).json({ error: 'name and role are required' });
    if (req.body.isPrimary) patient.careTeam.forEach(m => { if (!m.deletedAt) m.isPrimary = false; });
    patient.careTeam.push(req.body);
    patient.markModified('careTeam');
    await patient.save();
    res.status(201).json(mapMember(patient.careTeam[patient.careTeam.length - 1]));
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
    ['name', 'role', 'specialty', 'phone', 'email', 'organization', 'startDate', 'endDate'].forEach(f => {
      if (req.body[f] !== undefined) member[f] = req.body[f];
    });
    if (req.body.isPrimary === true) {
      patient.careTeam.forEach(m => { if (m._id?.toString() !== req.params.memberId && !m.deletedAt) m.isPrimary = false; });
      member.isPrimary = true;
    } else if (req.body.isPrimary === false) {
      member.isPrimary = false;
    }
    patient.markModified('careTeam');
    await patient.save();
    res.json(mapMember(member));
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
  console.log(`Care Team Service listening on port ${PORT}`);
});
