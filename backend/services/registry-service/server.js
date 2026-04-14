'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

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
const PORT = process.env.PORT || 5100;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:admin@localhost:27017/patientrecords?authSource=admin';
const DB_ADAPTER = (process.env.DB_ADAPTER || 'mongo').toLowerCase();

const getRepository = require('../../shared/repositories/repositoryFactory');

// Connect to MongoDB only when using the mongo adapter
if (DB_ADAPTER !== 'knex') {
  mongoose.connect(MONGODB_URI)
    .then(async () => {
      console.log('MongoDB connected');
      const repo = getRepository('registry');
      await repo.seed();
    })
    .catch(err => {
      console.error('MongoDB connection error:', err.message);
      process.exit(1);
    });
} else {
  const repo = getRepository('registry');
  repo.seed().catch(err => {
    console.error('[registry] PostgreSQL seed error:', err.message);
    process.exit(1);
  });
}

function adminMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'no token' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.role !== 'admin') return res.status(403).json({ error: 'admin access required' });
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'invalid token' });
  }
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'registry-service', port: PORT });
});

// GET /api/registry - public
app.get('/api/registry', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    const repo = getRepository('registry');
    const registry = await repo.getRegistry();
    if (!registry) return res.status(500).json({ error: 'Registry not initialized' });
    res.json({ version: registry.version, description: registry.description, modules: registry.modules });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load registry' });
  }
});

// GET /api/admin/registry
app.get('/api/admin/registry', adminMiddleware, async (req, res) => {
  try {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    const repo = getRepository('registry');
    const registry = await repo.getRegistry();
    if (!registry) return res.status(404).json({ error: 'Registry not found' });
    res.json(registry);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch registry' });
  }
});

// POST /api/admin/registry/modules
app.post('/api/admin/registry/modules', adminMiddleware, async (req, res) => {
  try {
    const module = req.body;
    if (!module.id || !module.name) return res.status(400).json({ error: 'id and name are required' });
    const repo = getRepository('registry');
    const result = await repo.addModule(module);
    res.json({ success: true, module: result });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Failed to add module' });
  }
});

// PUT /api/admin/registry/modules/:id
app.put('/api/admin/registry/modules/:id', adminMiddleware, async (req, res) => {
  try {
    const repo = getRepository('registry');
    const module = await repo.updateModule(req.params.id, req.body);
    res.json({ success: true, module });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Failed to update module' });
  }
});

// DELETE /api/admin/registry/modules/:id
app.delete('/api/admin/registry/modules/:id', adminMiddleware, async (req, res) => {
  try {
    const repo = getRepository('registry');
    await repo.deleteModule(req.params.id);
    res.json({ success: true, message: `Module ${req.params.id} deleted` });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Failed to delete module' });
  }
});

// PATCH /api/admin/registry/modules/:id/toggle
app.patch('/api/admin/registry/modules/:id/toggle', adminMiddleware, async (req, res) => {
  try {
    const repo = getRepository('registry');
    const module = await repo.toggleModule(req.params.id, req.body.enabled);
    res.json({ success: true, module: { id: module.id, name: module.name, enabled: module.enabled } });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Failed to toggle module' });
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Registry Service listening on port ${PORT}`);
  });
}

module.exports = app;

