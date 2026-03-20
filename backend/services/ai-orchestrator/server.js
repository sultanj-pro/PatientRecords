'use strict';

const express    = require('express');
const bodyParser = require('body-parser');
const cors       = require('cors');
const jwt        = require('jsonwebtoken');
const mongoose   = require('mongoose');
const axios      = require('axios');

const { buildContext }       = require('./contextBuilder');
const { createRecommendation, getRecommendations, setStatus } = require('./approvalStore');

const app        = express();
const PORT       = process.env.PORT       || 5008;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const MONGODB_URI = process.env.MONGODB_URI ||
  'mongodb://admin:admin@localhost:27017/patientrecords?authSource=admin';
const MEDICATION_AGENT_URL = process.env.MEDICATION_AGENT_URL || 'http://localhost:5009';
const LABS_AGENT_URL       = process.env.LABS_AGENT_URL       || 'http://localhost:5010';

app.use(cors());
app.use(bodyParser.json());

// Structured request logging
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

// MongoDB connection
mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => { console.error('MongoDB connection error:', err.message); process.exit(1); });

// Auth middleware — enforces valid JWT on all /api/* routes
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'missing authorization' });
  const parts = auth.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return res.status(401).json({ error: 'malformed authorization' });
  }
  try {
    req.user = jwt.verify(parts[1], JWT_SECRET);
    // Forward the raw header so contextBuilder can pass it to upstream services
    req.authHeader = auth;
    next();
  } catch {
    return res.status(401).json({ error: 'invalid token' });
  }
}

/**
 * Call a domain agent's /analyze endpoint. Returns empty findings on failure
 * so that one agent being offline doesn't break the whole recommendation.
 */
async function callAgent(url, payload) {
  try {
    const { data } = await axios.post(`${url}/analyze`, payload, { timeout: 8000 });
    return Array.isArray(data.findings) ? data.findings : [];
  } catch (err) {
    const status = err.response ? err.response.status : null;
    console.error(`[ai-orchestrator] Agent call to ${url} failed (${status || err.message})`);
    return [];
  }
}

// ── Health ──────────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'ai-orchestrator', port: PORT });
});

// ── Recommend ───────────────────────────────────────────────────────────────

/**
 * POST /api/ai/recommend/:patientId
 * Build full patient context, store a pending recommendation record, return it.
 * Domain-agent findings (medications, labs, comms) will be wired in 8.3–8.5.
 */
app.post('/api/ai/recommend/:patientId', authMiddleware, async (req, res) => {
  const { patientId } = req.params;

  try {
    const context = await buildContext(patientId, req.authHeader);

    // Fan out to domain agents in parallel (fail-soft per agent)
    const [medicationFindings, labsFindings] = await Promise.all([
      callAgent(MEDICATION_AGENT_URL, {
        medications: context.medications,
        labs:        context.labs,
        patient:     context.patient,
      }),
      callAgent(LABS_AGENT_URL, {
        labs:        context.labs,
        vitals:      context.vitals,
        patient:     context.patient,
        medications: context.medications,
      }),
    ]);

    const findings = [
      ...medicationFindings,
      ...labsFindings,
      // comms-agent findings will be added in 8.5
    ];

    const recommendation = await createRecommendation(patientId, context, findings);
    res.status(201).json(recommendation);
  } catch (err) {
    console.error('[ai-orchestrator] recommend error:', err.message);
    res.status(500).json({ error: 'Failed to generate recommendation', detail: err.message });
  }
});

// ── List recommendations ─────────────────────────────────────────────────────

/**
 * GET /api/ai/recommendations/:patientId
 * Return all recommendations for a patient, newest first.
 */
app.get('/api/ai/recommendations/:patientId', authMiddleware, async (req, res) => {
  try {
    const recs = await getRecommendations(req.params.patientId);
    res.json(recs);
  } catch (err) {
    console.error('[ai-orchestrator] list error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve recommendations', detail: err.message });
  }
});

// ── Approve / Dismiss ────────────────────────────────────────────────────────

/**
 * POST /api/ai/recommendations/:id/approve
 * Irreversibly marks a pending recommendation as approved.
 */
app.post('/api/ai/recommendations/:id/approve', authMiddleware, async (req, res) => {
  try {
    const rec = await setStatus(req.params.id, 'approved');
    if (!rec) return res.status(404).json({ error: 'Recommendation not found' });
    res.json(rec);
  } catch (err) {
    if (err.code === 'IMMUTABLE_STATUS') {
      return res.status(409).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to approve recommendation', detail: err.message });
  }
});

/**
 * POST /api/ai/recommendations/:id/dismiss
 * Irreversibly marks a pending recommendation as dismissed.
 */
app.post('/api/ai/recommendations/:id/dismiss', authMiddleware, async (req, res) => {
  try {
    const rec = await setStatus(req.params.id, 'dismissed');
    if (!rec) return res.status(404).json({ error: 'Recommendation not found' });
    res.json(rec);
  } catch (err) {
    if (err.code === 'IMMUTABLE_STATUS') {
      return res.status(409).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to dismiss recommendation', detail: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`AI Orchestrator listening on port ${PORT}`);
});
