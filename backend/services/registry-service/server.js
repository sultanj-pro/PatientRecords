const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const PORT = process.env.PORT || 5100;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:admin@localhost:27017/patientrecords?authSource=admin';

const registrySchema = new mongoose.Schema({
  modules: [{
    id: String,
    name: String,
    description: String,
    icon: String,
    path: String,
    enabled: Boolean,
    framework: { type: String, enum: ['angular', 'react'] },
    roles: [String],
    order: Number,
    version: String,
    remoteEntry: String,
    remoteName: String,
    exposedModule: String
  }],
  version: { type: String, default: '1.0.0' },
  description: { type: String, default: 'PatientRecords Module Registry' }
}, { timestamps: true });

const Registry = mongoose.model('Registry', registrySchema);

async function seedRegistry() {
  const count = await Registry.countDocuments();
  if (count === 0) {
    const filePath = path.join(__dirname, 'registry.json');
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      await Registry.create({ modules: data.modules, version: data.version, description: data.description });
      console.log(`Registry seeded with ${data.modules.length} modules`);
    } else {
      console.log('No registry.json found, registry will be empty');
    }
  } else {
    console.log(`Registry already has ${count} entries`);
  }
}

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('MongoDB connected');
    await seedRegistry();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });

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
    const registry = await Registry.findOne({}).lean();
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
    const registry = await Registry.findOne({});
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
    const registry = await Registry.findOne({});
    if (!registry) return res.status(404).json({ error: 'Registry not found' });
    if (registry.modules.find(m => m.id === module.id)) return res.status(409).json({ error: 'Module already exists' });
    registry.modules.push(module);
    await registry.save();
    res.json({ success: true, module });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add module' });
  }
});

// PUT /api/admin/registry/modules/:id
app.put('/api/admin/registry/modules/:id', adminMiddleware, async (req, res) => {
  try {
    const registry = await Registry.findOne({});
    if (!registry) return res.status(404).json({ error: 'Registry not found' });
    const module = registry.modules.find(m => m.id === req.params.id);
    if (!module) return res.status(404).json({ error: 'Module not found' });
    Object.assign(module, req.body);
    await registry.save();
    res.json({ success: true, module });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update module' });
  }
});

// DELETE /api/admin/registry/modules/:id
app.delete('/api/admin/registry/modules/:id', adminMiddleware, async (req, res) => {
  try {
    const registry = await Registry.findOne({});
    if (!registry) return res.status(404).json({ error: 'Registry not found' });
    const index = registry.modules.findIndex(m => m.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Module not found' });
    registry.modules.splice(index, 1);
    await registry.save();
    res.json({ success: true, message: `Module ${req.params.id} deleted` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete module' });
  }
});

// PATCH /api/admin/registry/modules/:id/toggle
app.patch('/api/admin/registry/modules/:id/toggle', adminMiddleware, async (req, res) => {
  try {
    const registry = await Registry.findOne({});
    if (!registry) return res.status(404).json({ error: 'Registry not found' });
    const module = registry.modules.find(m => m.id === req.params.id);
    if (!module) return res.status(404).json({ error: 'Module not found' });
    module.enabled = req.body.enabled !== undefined ? req.body.enabled : !module.enabled;
    await registry.save();
    res.json({ success: true, module: { id: module.id, name: module.name, enabled: module.enabled } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle module' });
  }
});

app.listen(PORT, () => {
  console.log(`Registry Service listening on port ${PORT}`);
});
