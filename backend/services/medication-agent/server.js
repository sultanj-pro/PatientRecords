'use strict';

const express    = require('express');
const bodyParser = require('body-parser');
const cors       = require('cors');

const { analyze } = require('./analyzer');

const app  = express();
const PORT = process.env.PORT || 5009;
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || '';

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
app.use(bodyParser.json());

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(JSON.stringify({
      time: new Date().toISOString(),
      method: req.method,
      path: req.path,
      status: res.statusCode,
      ms: Date.now() - start,
    }));
  });
  next();
});

// ── Internal API key guard (all routes except /health) ─────────────────────
app.use((req, res, next) => {
  if (req.path === '/health') return next();
  if (!INTERNAL_API_KEY) return next(); // key not configured — allow (dev mode)
  const key = req.headers['x-internal-api-key'];
  if (key !== INTERNAL_API_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
});

// ── Health ──────────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'medication-agent', port: PORT });
});

// ── Analyze ─────────────────────────────────────────────────────────────────

/**
 * POST /analyze
 * Body: { medications, labs, patient }
 * Returns: { findings: [...] }
 *
 * This is an internal-only endpoint called by the AI Orchestrator.
 * No authentication required (network-isolated service).
 */
app.post('/analyze', async (req, res) => {
  try {
    const { medications, labs, patient } = req.body;

    if (!medications) {
      return res.status(400).json({ error: 'medications field is required' });
    }

    const findings = await analyze({ medications, labs: labs || [], patient: patient || {} });
    res.json({ findings });
  } catch (err) {
    console.error('[medication-agent] Analyze error:', err.message);
    res.status(500).json({ error: 'Analysis failed', detail: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Medication Agent listening on port ${PORT}`);
});
