'use strict';

const express    = require('express');
const bodyParser = require('body-parser');
const cors       = require('cors');
const jwt        = require('jsonwebtoken');
const mongoose   = require('mongoose');
const axios      = require('axios');

const { buildContext }       = require('./contextBuilder');
const { createRecommendation, getRecommendations, setStatus, deleteAllRecommendations, getById, updateSummary } = require('./approvalStore');

const app        = express();
const PORT       = process.env.PORT       || 5008;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
if (JWT_SECRET === 'dev-secret') {
  if (process.env.NODE_ENV === 'production') {
    console.error('[SECURITY] JWT_SECRET is using the default value in production! Set the JWT_SECRET environment variable. Exiting.');
    process.exit(1);
  } else {
    console.warn('[SECURITY] WARNING: JWT_SECRET is set to the default dev value. Set the JWT_SECRET environment variable before deploying to production.');
  }
}
const MONGODB_URI = process.env.MONGODB_URI ||
  'mongodb://admin:admin@localhost:27017/patientrecords?authSource=admin';
const MEDICATION_AGENT_URL = process.env.MEDICATION_AGENT_URL || 'http://localhost:5009';
const LABS_AGENT_URL       = process.env.LABS_AGENT_URL       || 'http://localhost:5010';
const COMMS_AGENT_URL      = process.env.COMMS_AGENT_URL      || 'http://localhost:5011';
const LLM_AGENT_URL        = process.env.LLM_AGENT_URL        || 'http://localhost:5013';
const INTERNAL_API_KEY     = process.env.INTERNAL_API_KEY     || '';

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

// MongoDB connection (only when not using knex/PostgreSQL)
const DB_ADAPTER = (process.env.DB_ADAPTER || 'mongo').toLowerCase();
if (DB_ADAPTER !== 'knex') {
  mongoose.connect(MONGODB_URI)
    .then(() => console.log('[ai-orchestrator] MongoDB connected'))
    .catch(err => { console.error('[ai-orchestrator] MongoDB connection error:', err.message); process.exit(1); });
} else {
  console.log('[ai-orchestrator] Using PostgreSQL (DB_ADAPTER=knex)');
}

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
    const headers = {};
    if (INTERNAL_API_KEY) headers['x-internal-api-key'] = INTERNAL_API_KEY;
    const { data } = await axios.post(`${url}/analyze`, payload, { headers, timeout: 120000 });
    return Array.isArray(data.findings) ? data.findings : [];
  } catch (err) {
    const status = err.response ? err.response.status : null;
    console.error(`[ai-orchestrator] Agent call to ${url} failed (${status || err.message})`);
    return [];
  }
}

async function callLlmAgent(patientId, context, findings, authHeader) {
  try {
    const { data } = await axios.post(
      `${LLM_AGENT_URL}/summarize`,
      {
        patientId,
        patient:     context.patient,
        findings,
        vitals:      context.vitals,
        medications: context.medications,
        labs:        context.labs,
      },
      { headers: { Authorization: authHeader }, timeout: 310000 }
    );
    return data.summary || null;
  } catch (err) {
    console.warn('[ai-orchestrator] LLM agent call failed (non-critical):', err.message);
    return null;
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
  const t0 = Date.now();

  try {
    const context = await buildContext(patientId, req.authHeader);

    // Fan out to domain agents in parallel (fail-soft per agent)
    const [medicationFindings, labsFindings, commsFindings] = await Promise.all([
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
      callAgent(COMMS_AGENT_URL, {
        visits:      context.visits,
        medications: context.medications,
        patient:     context.patient,
      }),
    ]);

    const findings = [
      ...medicationFindings,
      ...labsFindings,
      ...commsFindings,
    ];

    // Save recommendation immediately — LLM summary streamed separately
    const latencyMs = Date.now() - t0;
    console.log(JSON.stringify({ event: 'recommendation-generated', latencyMs, findingsCount: findings.length }));

    const recommendation = await createRecommendation(patientId, context, findings, null);
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

/**
 * POST /api/ai/recommend-stream/:patientId
 * Combined SSE stream covering the full analysis pipeline:
 *   {type:"phase", message:"..."}  — progress during agent phase
 *   {type:"rec",   rec:{...}}      — recommendation created (agents done)
 *   {type:"token", t:"..."}        — LLM narrative token
 *   data: [DONE]                   — everything finished
 */
app.post('/api/ai/recommend-stream/:patientId', authMiddleware, async (req, res) => {
  const { patientId } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (obj) => { if (!res.writableEnded) res.write(`data: ${JSON.stringify(obj)}\n\n`); };

  try {
    send({ type: 'phase', message: 'Fetching patient data…' });
    const context = await buildContext(patientId, req.authHeader);

    send({ type: 'phase', message: 'Running medication, labs and care-coordination analysis…' });
    const [medicationFindings, labsFindings, commsFindings] = await Promise.all([
      callAgent(MEDICATION_AGENT_URL, { medications: context.medications, labs: context.labs, patient: context.patient }),
      callAgent(LABS_AGENT_URL,       { labs: context.labs, vitals: context.vitals, patient: context.patient, medications: context.medications }),
      callAgent(COMMS_AGENT_URL,      { visits: context.visits, medications: context.medications, patient: context.patient }),
    ]);
    const findings = [...medicationFindings, ...labsFindings, ...commsFindings];

    send({ type: 'phase', message: `Found ${findings.length} finding(s) — saving recommendation…` });
    const recommendation = await createRecommendation(patientId, context, findings, null);
    send({ type: 'rec', rec: recommendation });

    send({ type: 'phase', message: 'Generating clinical summary…' });
    const llmPayload = {
      patientId,
      patient:     context.patient,
      findings,
      vitals:      context.vitals,
      medications: context.medications,
      labs:        context.labs,
    };

    const llmRes = await axios.post(
      `${LLM_AGENT_URL}/stream`,
      llmPayload,
      { headers: { Authorization: req.authHeader }, responseType: 'stream', timeout: 310000 }
    );

    let fullSummary = '';
    let llmBuf = '';
    const recId = String(recommendation._id);

    await new Promise((resolve) => {
      llmRes.data.on('data', (chunk) => {
        if (res.writableEnded) return llmRes.data.destroy();
        llmBuf += chunk.toString();
        const lines = llmBuf.split('\n');
        llmBuf = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const ssePayload = line.slice(6).trim();
          if (ssePayload === '[DONE]') {
            updateSummary(recId, fullSummary).catch(() => {});
            res.write('data: [DONE]\n\n');
            res.end();
            return resolve();
          }
          try {
            const parsed = JSON.parse(ssePayload);
            if (parsed.t) {
              fullSummary += parsed.t;
              send({ type: 'token', t: parsed.t });
            }
          } catch {}
        }
      });
      llmRes.data.on('end', resolve);
      llmRes.data.on('error', (err) => {
        console.error('[ai-orchestrator] recommend-stream LLM error:', err.message);
        send({ type: 'error', message: 'LLM summary failed — findings still saved.' });
        if (!res.writableEnded) { res.write('data: [DONE]\n\n'); res.end(); }
        resolve();
      });
      req.on('close', () => llmRes.data.destroy());
    });

  } catch (err) {
    console.error('[ai-orchestrator] recommend-stream error:', err.message);
    send({ type: 'error', message: err.message });
    if (!res.writableEnded) { res.write('data: [DONE]\n\n'); res.end(); }
  }
});

/**
 * POST /api/ai/recommendations/:id/stream-summary
 * SSE stream: pipes LLM tokens from llm-agent to the client.
 * Saves the complete summary to the DB once streaming finishes.
 */
app.post('/api/ai/recommendations/:id/stream-summary', authMiddleware, async (req, res) => {
  try {
    const rec = await getById(req.params.id);
    if (!rec) return res.status(404).json({ error: 'Recommendation not found' });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const context = rec.context || {};
    const payload = {
      patientId:   rec.patientId,
      patient:     context.patient,
      findings:    rec.findings || [],
      vitals:      context.vitals,
      medications: context.medications,
      labs:        context.labs,
    };

    const llmRes = await axios.post(
      `${LLM_AGENT_URL}/stream`,
      payload,
      { headers: { Authorization: req.authHeader }, responseType: 'stream', timeout: 310000 }
    );

    let fullSummary = '';
    let buf = '';

    llmRes.data.on('data', (chunk) => {
      buf += chunk.toString();
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6).trim();
        if (payload === '[DONE]') {
          updateSummary(req.params.id, fullSummary).catch(() => {});
          res.write('data: [DONE]\n\n');
          return res.end();
        }
        try {
          const parsed = JSON.parse(payload);
          if (parsed.t) fullSummary += parsed.t;
        } catch {}
        res.write(`${line}\n\n`);
      }
    });

    llmRes.data.on('error', (err) => {
      console.error('[ai-orchestrator] stream-summary error:', err.message);
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    });

    req.on('close', () => llmRes.data.destroy());

  } catch (err) {
    console.error('[ai-orchestrator] stream-summary failed:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Stream failed', detail: err.message });
    } else {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }
  }
});

/**
 * DELETE /api/ai/recommendations/:patientId/all
 * Permanently removes all analysis history for a patient.
 * Restricted to admin and clinician roles.
 */
app.delete('/api/ai/recommendations/:patientId/all', authMiddleware, async (req, res) => {
  const allowedRoles = ['admin', 'clinician', 'physician'];
  if (!allowedRoles.includes(req.user?.role)) {
    return res.status(403).json({ error: 'Insufficient permissions to reset analysis history.' });
  }
  try {
    const result = await deleteAllRecommendations(req.params.patientId);
    res.json({ message: `Deleted ${result.deleted} recommendation(s).`, deleted: result.deleted });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset analysis history', detail: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`AI Orchestrator listening on port ${PORT}`);
});
