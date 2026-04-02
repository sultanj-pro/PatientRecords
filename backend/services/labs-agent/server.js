'use strict';

const express    = require('express');
const bodyParser = require('body-parser');
const cors       = require('cors');
const { analyze } = require('./analyzer');

const app         = express();
const PORT        = process.env.PORT         || 5010;
const OLLAMA_URL  = process.env.OLLAMA_URL   || '';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3';

app.use(cors());
app.use(bodyParser.json({ limit: '2mb' }));

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
