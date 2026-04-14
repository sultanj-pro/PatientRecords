const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { publishEvent } = require('./shared/eventPublisher');

const app = express();
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost').split(',').map(s => s.trim());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const allowed = ALLOWED_ORIGINS.some(o => origin === o || origin.startsWith(o + ':'));
    if (allowed) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true
}));
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(JSON.stringify({ time: new Date().toISOString(), method: req.method, path: req.path, status: res.statusCode, ms: Date.now() - start }));
  });
  next();
});

app.use(bodyParser.json());

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
if (JWT_SECRET === 'dev-secret') {
  if (process.env.NODE_ENV === 'production') {
    console.error('[SECURITY] JWT_SECRET is using the default value in production! Set the JWT_SECRET environment variable. Exiting.');
    process.exit(1);
  } else {
    console.warn('[SECURITY] WARNING: JWT_SECRET is set to the default dev value. Set the JWT_SECRET environment variable before deploying to production.');
  }
}
const PORT = process.env.PORT || 5004;
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
  res.json({ status: 'ok', service: 'labs-service', port: PORT });
});

// GET /api/patients/:id/labs
app.get('/api/patients/:id/labs', authMiddleware, async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    const repo = getRepository('labs');
    const labs = await repo.getLabs(patientId);
    if (labs === null) return res.status(404).json({ error: 'not found' });
    res.json(labs.filter(l => !l.deletedAt).map(l => ({
      _id: l._id, testName: l.test_name, testCode: l.test_code, value: l.result, unit: l.unit,
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
    if (!req.body.date || !req.body.test_name)
      return res.status(400).json({ error: 'date and test_name are required' });
    const repo = getRepository('labs');
    const patient = await repo.addLab(patientId, req.body);
    if (!patient) return res.status(404).json({ error: 'patient not found' });
    publishEvent('labs-resulted', { patientId: req.params.id, testName: req.body.test_name, testCode: req.body.test_code, value: req.body.result, unit: req.body.unit });
    res.status(201).json(req.body);
  } catch (err) {
    res.status(500).json({ error: 'failed to create lab', detail: err.message });
  }
});

// PUT /api/patients/:id/labs/:labId
app.put('/api/patients/:id/labs/:labId', authMiddleware, async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    const { labId } = req.params;
    const repo = getRepository('labs');
    const updated = await repo.updateLab(patientId, labId, req.body);
    if (!updated) return res.status(404).json({ error: 'lab not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'failed to update lab', detail: err.message });
  }
});

// DELETE /api/patients/:id/labs/:labId
app.delete('/api/patients/:id/labs/:labId', authMiddleware, async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    const { labId } = req.params;
    const repo = getRepository('labs');
    const deleted = await repo.deleteLab(patientId, labId);
    if (!deleted) return res.status(404).json({ error: 'lab not found' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'failed to delete lab', detail: err.message });
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Labs Service listening on port ${PORT}`);
  });
}

module.exports = app;

