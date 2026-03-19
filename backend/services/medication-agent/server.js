'use strict';

const express    = require('express');
const bodyParser = require('body-parser');
const cors       = require('cors');

const { analyze } = require('./analyzer');

const app  = express();
const PORT = process.env.PORT || 5009;

app.use(cors());
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
app.post('/analyze', (req, res) => {
  try {
    const { medications, labs, patient } = req.body;

    if (!medications) {
      return res.status(400).json({ error: 'medications field is required' });
    }

    const findings = analyze({ medications, labs: labs || [], patient: patient || {} });
    res.json({ findings });
  } catch (err) {
    console.error('[medication-agent] Analyze error:', err.message);
    res.status(500).json({ error: 'Analysis failed', detail: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Medication Agent listening on port ${PORT}`);
});
