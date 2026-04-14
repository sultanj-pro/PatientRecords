'use strict';

const express    = require('express');
const bodyParser = require('body-parser');
const cors       = require('cors');
const { analyze } = require('./analyzer');

const app         = express();
const PORT        = process.env.PORT         || 5010;
const OLLAMA_URL  = process.env.OLLAMA_URL   || '';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3';
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
app.use(bodyParser.json({ limit: '2mb' }));

// ── Internal API key guard (all routes except /health) ─────────────────────
app.use((req, res, next) => {
  if (req.path === '/health') return next();
  if (!INTERNAL_API_KEY) return next(); // key not configured — allow (dev mode)
  const key = req.headers['x-internal-api-key'];
  if (key !== INTERNAL_API_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
});

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'labs-agent', port: PORT });
});

// ── Analyze endpoint (internal only — no auth) ────────────────────────────────
app.post('/analyze', async (req, res) => {
  try {
    const { labs, vitals, patient, medications } = req.body;
    const findings = await analyze({ labs, vitals, patient, medications, ollamaUrl: OLLAMA_URL, ollamaModel: OLLAMA_MODEL });
    res.json({ findings });
  } catch (err) {
    console.error('[labs-agent] analyze error:', err.message);
    res.status(500).json({ error: 'Analysis failed', message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`[labs-agent] Listening on port ${PORT}`);
});
