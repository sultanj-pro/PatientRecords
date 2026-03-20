'use strict';

const express    = require('express');
const bodyParser = require('body-parser');
const cors       = require('cors');
const jwt        = require('jsonwebtoken');
const mongoose   = require('mongoose');

const app = express();
app.use(cors());
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(JSON.stringify({
      time: new Date().toISOString(), method: req.method,
      path: req.path, status: res.statusCode, ms: Date.now() - start
    }));
  });
  next();
});
app.use(bodyParser.json());

const JWT_SECRET  = process.env.JWT_SECRET  || 'dev-secret';
const PORT        = process.env.PORT        || 5012;
const MONGODB_URI = process.env.MONGODB_URI ||
  'mongodb://admin:admin@localhost:27017/patientrecords?authSource=admin';

// ── Schema ────────────────────────────────────────────────────────────────────

const noteSchema = new mongoose.Schema({
  patientId:    { type: Number, required: true, index: true },
  type:         {
    type: String,
    enum: ['observation', 'diagnostic', 'prognosis', 'plan', 'general'],
    default: 'general'
  },
  content:      { type: String, required: true },
  providerId:   { type: String, required: true },
  providerName: { type: String, required: true },
  providerRole: { type: String, default: '' },
  deletedAt:    { type: Date, default: null },
}, { timestamps: true });

const Note = mongoose.model('ClinicalNote', noteSchema, 'clinical_notes');

mongoose.connect(MONGODB_URI)
  .then(() => console.log('[clinical-notes] MongoDB connected'))
  .catch(err => { console.error('[clinical-notes] MongoDB error:', err.message); process.exit(1); });

// ── Auth ─────────────────────────────────────────────────────────────────────

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'missing authorization' });
  const [scheme, token] = auth.split(' ');
  if (scheme !== 'Bearer' || !token) return res.status(401).json({ error: 'malformed authorization' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'invalid token' });
  }
}

function mapNote(n) {
  return {
    id:           n._id.toString(),
    patientId:    n.patientId,
    type:         n.type,
    content:      n.content,
    providerId:   n.providerId,
    providerName: n.providerName,
    providerRole: n.providerRole,
    createdAt:    n.createdAt,
    updatedAt:    n.updatedAt,
  };
}

// ── Routes ────────────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'clinical-notes-service', port: PORT });
});

// GET /api/patients/:patientId/notes
app.get('/api/patients/:patientId/notes', authMiddleware, async (req, res) => {
  try {
    const patientId = parseInt(req.params.patientId, 10);
    if (isNaN(patientId)) return res.status(400).json({ error: 'invalid patientId' });

    const { type, limit = 50 } = req.query;
    const filter = { patientId, deletedAt: null };
    if (type) filter.type = type;

    const notes = await Note.find(filter)
      .sort({ createdAt: -1 })
      .limit(Math.min(parseInt(limit, 10) || 50, 200));

    res.json({ notes: notes.map(mapNote), count: notes.length });
  } catch (err) {
    res.status(500).json({ error: 'failed to fetch notes', detail: err.message });
  }
});

// POST /api/patients/:patientId/notes
app.post('/api/patients/:patientId/notes', authMiddleware, async (req, res) => {
  try {
    const patientId = parseInt(req.params.patientId, 10);
    if (isNaN(patientId)) return res.status(400).json({ error: 'invalid patientId' });

    const { type, content } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ error: 'content is required' });

    const note = await Note.create({
      patientId,
      type:         type || 'general',
      content:      content.trim(),
      providerId:   req.user.id || req.user.sub || req.user.username || 'unknown',
      providerName: req.user.name || req.user.username || 'Provider',
      providerRole: req.user.role || '',
    });

    res.status(201).json(mapNote(note));
  } catch (err) {
    res.status(500).json({ error: 'failed to create note', detail: err.message });
  }
});

// PUT /api/notes/:id
app.put('/api/notes/:id', authMiddleware, async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, deletedAt: null });
    if (!note) return res.status(404).json({ error: 'note not found' });

    const requesterId = req.user.id || req.user.sub || req.user.username;
    if (note.providerId !== requesterId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'you can only edit your own notes' });
    }

    if (req.body.content !== undefined) {
      if (!req.body.content.trim()) return res.status(400).json({ error: 'content cannot be empty' });
      note.content = req.body.content.trim();
    }
    if (req.body.type !== undefined) note.type = req.body.type;

    await note.save();
    res.json(mapNote(note));
  } catch (err) {
    res.status(500).json({ error: 'failed to update note', detail: err.message });
  }
});

// DELETE /api/notes/:id  (soft delete)
app.delete('/api/notes/:id', authMiddleware, async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, deletedAt: null });
    if (!note) return res.status(404).json({ error: 'note not found' });

    const requesterId = req.user.id || req.user.sub || req.user.username;
    if (note.providerId !== requesterId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'you can only delete your own notes' });
    }

    note.deletedAt = new Date();
    await note.save();
    res.json({ success: true, message: 'note deleted' });
  } catch (err) {
    res.status(500).json({ error: 'failed to delete note', detail: err.message });
  }
});

app.listen(PORT, () => console.log(`[clinical-notes] Listening on port ${PORT}`));
