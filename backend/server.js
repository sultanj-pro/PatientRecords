const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const swaggerUi = require('swagger-ui-express');
const openapiSpec = require('./openapi.json');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const PORT = process.env.PORT || 3001;

const path = require('path');
const fs = require('fs');
const SPARK_SERVICE_URL = process.env.SPARK_SERVICE_URL || process.env.SPARK_URL || 'http://spark-service:8998';

function signToken(username, role) {
  return jwt.sign({ sub: username, role }, JWT_SECRET, { expiresIn: '1h' });
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Simple login: accepts { username, password }
app.post('/auth/login', (req, res) => {
  const { username } = req.body || {};
  if (!username) return res.status(400).json({ error: 'username required' });

  // Very small stub: assign role based on username pattern
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

// Protected example endpoint (checks Authorization: Bearer <token>)
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

app.get('/api/patients', authMiddleware, (req, res) => {
  // Read mock data from workspace data folder (relative to repo root)
  try {
    const dataPath = path.resolve(__dirname, '..', '..', 'data', 'patient-vitals-hierarchical.json');
    const raw = fs.readFileSync(dataPath, 'utf8');
    const patients = JSON.parse(raw);
    // support simple ?q= search by name or id
    const q = (req.query.q || '').toLowerCase();
    const filtered = q
      ? patients.filter(p => String(p.patientid).toLowerCase().includes(q) || ((p.firstname||'') + ' ' + (p.lastname||'')).toLowerCase().includes(q))
      : patients;
    // return lightweight list
    const list = filtered.map(p => ({ patientid: p.patientid, firstname: p.firstname, lastname: p.lastname }));
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'failed to read patient data', detail: err.message });
  }
});

app.get('/api/patients/:id', authMiddleware, (req, res) => {
  try {
    const dataPath = path.resolve(__dirname, '..', '..', 'data', 'patient-vitals-hierarchical.json');
    const raw = fs.readFileSync(dataPath, 'utf8');
    const patients = JSON.parse(raw);
    const p = patients.find(x => String(x.patientid) === String(req.params.id));
    if (!p) return res.status(404).json({ error: 'not found' });
    res.json(p);
  } catch (err) {
    res.status(500).json({ error: 'failed to read patient data', detail: err.message });
  }
});

// Proxy endpoint to show provider options from spark-service
app.get('/api/provider-options', authMiddleware, async (req, res) => {
  try {
    const resp = await fetch(`${SPARK_SERVICE_URL}/provider-options`);
    const json = await resp.json();
    res.json(json);
  } catch (err) {
    res.status(502).json({ error: 'failed to reach spark-service', detail: err.message });
  }
});

// Helper: get patient by id (string-safe)
function getPatientById(patients, id) {
  return patients.find(x => String(x.patientid) === String(id));
}

// Parse date helper
function parseDate(d) {
  const dt = Date.parse(d);
  return isNaN(dt) ? null : new Date(dt);
}

// Generic collection endpoint factory
function sendCollection(req, res, collectionName) {
  try {
    const dataPath = path.resolve(__dirname, '..', '..', 'data', 'patient-vitals-hierarchical.json');
    const raw = fs.readFileSync(dataPath, 'utf8');
    const patients = JSON.parse(raw);
    const patient = getPatientById(patients, req.params.id);
    if (!patient) return res.status(404).json({ error: 'not found' });
    const items = patient[collectionName] || [];
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'failed to read patient data', detail: err.message });
  }
}

// GET vitals with optional filters: from, to, type
app.get('/api/patients/:id/vitals', authMiddleware, (req, res) => {
  try {
    const dataPath = path.resolve(__dirname, '..', '..', 'data', 'patient-vitals-hierarchical.json');
    const raw = fs.readFileSync(dataPath, 'utf8');
    const patients = JSON.parse(raw);
    const patient = getPatientById(patients, req.params.id);
    if (!patient) return res.status(404).json({ error: 'not found' });
    let vitals = patient.vitals || [];
    const from = req.query.from ? parseDate(req.query.from) : null;
    const to = req.query.to ? parseDate(req.query.to) : null;
    const type = req.query.type ? req.query.type.toLowerCase() : null;
    if (type) {
      vitals = vitals.filter(v => (v.vital_description || '').toLowerCase().includes(type) || (v.observationcode || '').toLowerCase().includes(type));
    }
    if (from) {
      vitals = vitals.filter(v => { const d = parseDate(v.dateofobservation); return d && d >= from; });
    }
    if (to) {
      vitals = vitals.filter(v => { const d = parseDate(v.dateofobservation); return d && d <= to; });
    }
    res.json(vitals);
  } catch (err) {
    res.status(500).json({ error: 'failed to read patient data', detail: err.message });
  }
});

// Labs
app.get('/api/patients/:id/labs', authMiddleware, (req, res) => sendCollection(req, res, 'labs'));

// Physician visits
app.get('/api/patients/:id/physician-visits', authMiddleware, (req, res) => sendCollection(req, res, 'physician_visits'));

// Hospital visits
app.get('/api/patients/:id/hospital-visits', authMiddleware, (req, res) => sendCollection(req, res, 'hospital_visits'));

// Medications
app.get('/api/patients/:id/medications', authMiddleware, (req, res) => sendCollection(req, res, 'medications'));

// Convenience aliases for older clients
app.get('/api/patients/:id/meds', authMiddleware, (req, res) => sendCollection(req, res, 'medications'));

// Combine physician and hospital visits under a common "visits" path
app.get('/api/patients/:id/visits', authMiddleware, (req, res) => {
  try {
    const dataPath = path.resolve(__dirname, '..', '..', 'data', 'patient-vitals-hierarchical.json');
    const raw = fs.readFileSync(dataPath, 'utf8');
    const patients = JSON.parse(raw);
    const patient = getPatientById(patients, req.params.id);
    if (!patient) return res.status(404).json({ error: 'not found' });
    const phys = patient.physician_visits || [];
    const hosp = patient.hospital_visits || [];
    const combined = phys.concat(hosp);
    res.json(combined);
  } catch (err) {
    res.status(500).json({ error: 'failed to read patient data', detail: err.message });
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`backend stub listening on ${PORT}`);
  });
}

module.exports = app;
