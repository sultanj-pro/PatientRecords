'use strict';

const express    = require('express');
const bodyParser = require('body-parser');
const cors       = require('cors');
const jwt        = require('jsonwebtoken');
const axios      = require('axios');

const app        = express();
const PORT       = process.env.PORT        || 5013;
const JWT_SECRET = process.env.JWT_SECRET  || 'dev-secret';
const OLLAMA_URL = process.env.OLLAMA_URL  || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3';
const CLINICAL_NOTES_URL = process.env.CLINICAL_NOTES_URL || 'http://localhost:5012';
const OLLAMA_TIMEOUT_MS  = parseInt(process.env.OLLAMA_TIMEOUT_MS || '300000', 10);

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
      time: new Date().toISOString(), method: req.method, path: req.path,
      status: res.statusCode, ms: Date.now() - start,
    }));
  });
  next();
});

// ── Auth middleware ──────────────────────────────────────────────────────────

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'missing authorization' });
  const parts = auth.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return res.status(401).json({ error: 'malformed authorization' });
  }
  try {
    req.user = jwt.verify(parts[1], JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'invalid token' });
  }
}

// ── Prompt builder ───────────────────────────────────────────────────────────

function calcAge(dob) {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth)) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

function buildPrompt({ patient, findings, notes, vitals, medications, labs }) {
  const dob     = patient?.demographics?.dateOfBirth || patient?.dateOfBirth;
  const age     = patient?.age || calcAge(dob) || 'unknown';
  const gender  = patient?.demographics?.gender || patient?.gender || 'unknown';
  const first   = patient?.demographics?.legalName?.first || patient?.firstName || '';
  const last    = patient?.demographics?.legalName?.last  || patient?.lastName  || '';
  const patientLine = patient
    ? `Patient: ${first} ${last}, Age: ${age}, DOB: ${dob || 'unknown'}, Gender: ${gender}`
    : 'Patient details unavailable.';

  const findingsSection = findings && findings.length > 0
    ? findings.map(f =>
        `  - [${(f.severity || 'unknown').toUpperCase()}] ${f.title}: ${f.description}` +
        (f.recommendation ? ` Recommendation: ${f.recommendation}` : '')
      ).join('\n')
    : '  None identified.';

  const notesSection = notes && notes.length > 0
    ? notes.slice(0, 2).map(n =>
        `  [${n.type?.toUpperCase() || 'NOTE'}] ${n.providerRole || 'provider'}: ${(n.content || '').slice(0, 200)}`
      ).join('\n')
    : '  None.';

  const vitalsSection = (() => {
    if (!vitals || vitals.length === 0) return 'Not available.';
    // Sort newest first, then pick most-recent value per description
    const sorted = [...vitals].sort((a, b) =>
      new Date(b.dateofobservation || 0) - new Date(a.dateofobservation || 0)
    );
    const seen = new Map();
    for (const v of sorted) {
      const key = (v.vital_description || v.description || '').trim().toLowerCase();
      if (key && !seen.has(key)) seen.set(key, v);
    }
    // Build a concise list, flagging obviously abnormal values
    const CRITICAL_FLAGS = {
      'temperature':                 (v, u) => u.includes('f') ? v >= 101.5 : v >= 38.6,
      'blood pressure (systolic)':   (v)    => v >= 160 || v < 90,
      'blood pressure systolic':     (v)    => v >= 160 || v < 90,
      'blood pressure (diastolic)':  (v)    => v >= 100,
      'blood pressure diastolic':    (v)    => v >= 100,
      'heart rate':                  (v)    => v >= 120 || v <= 50,
      'oxygen saturation':           (v)    => v < 95,
      'o₂ saturation':               (v)    => v < 95,
    };
    const parts = [];
    for (const [key, v] of seen.entries()) {
      const val  = parseFloat(v.value);
      const unit = (v.unit || '').toLowerCase();
      const flag = !isNaN(val) && CRITICAL_FLAGS[key] ? CRITICAL_FLAGS[key](val, unit) : false;
      parts.push(`${v.vital_description || v.description}: ${v.value} ${v.unit || ''}${flag ? ' ⚠ CRITICAL' : ''}`.trim());
    }
    return parts.join(', ') || 'Not available.';
  })();

  const medsSection = medications && medications.length > 0
    ? medications.slice(0, 8).map(m => `${m.name} ${m.dose || ''} ${m.frequency || ''}`.trim()).join(', ')
    : 'None recorded.';

  const labsSection = labs && labs.length > 0
    ? labs.slice(0, 6).map(l => `${l.testName}: ${l.value} ${l.unit || ''}${l.flag ? ` (${l.flag})` : ''}`).join(', ')
    : 'None recorded.';

  return `Summarize this patient health record data into a structured report. Only use the information provided. Do not add opinions or advice beyond what the data states.

${patientLine}
Vitals: ${vitalsSection}
Medications: ${medsSection}
Lab Results: ${labsSection}
Flagged Issues:
${findingsSection}
Recent Notes:
${notesSection}

Write a report with these 3 sections:
CLINICAL OVERVIEW: 2 sentences describing the patient's current status from the data.
KEY CONCERNS: up to 3 bullet points listing the flagged issues above.
SUGGESTED NEXT STEPS: up to 3 bullet points based on the flagged issues and lab results.

Report:`;
}

// ── Ollama availability check ────────────────────────────────────────────────

async function checkOllama() {
  try {
    await axios.get(`${OLLAMA_URL}/api/tags`, { timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

// ── Fetch clinical notes ─────────────────────────────────────────────────────

async function fetchNotes(patientId, authHeader) {
  try {
    const { data } = await axios.get(
      `${CLINICAL_NOTES_URL}/api/patients/${patientId}/notes?limit=6`,
      { headers: { Authorization: authHeader }, timeout: 5000 }
    );
    return data.notes || [];
  } catch {
    return [];
  }
}

// ── Call Ollama ──────────────────────────────────────────────────────────────

async function callOllama(prompt) {
  const { data } = await axios.post(
    `${OLLAMA_URL}/api/generate`,
    { model: OLLAMA_MODEL, prompt, stream: false, options: { num_predict: 400, temperature: 0.2 } },
    { timeout: OLLAMA_TIMEOUT_MS }
  );
  return (data.response || '').trim();
}

// ── Health ───────────────────────────────────────────────────────────────────

app.get('/health', async (req, res) => {
  const ollamaUp = await checkOllama();
  res.json({
    status: 'ok',
    service: 'llm-agent',
    port: PORT,
    ollama: ollamaUp ? 'connected' : 'unavailable',
    model: OLLAMA_MODEL,
  });
});

// ── POST /summarize ──────────────────────────────────────────────────────────
//
//  Body: { patientId, patient, findings, vitals, medications, labs }
//  Returns: { summary, model, generatedAt } or { summary: null, reason }

app.post('/summarize', authMiddleware, async (req, res) => {
  const { patientId, patient, findings = [], vitals = [], medications = [], labs = [] } = req.body;

  if (!patientId) return res.status(400).json({ error: 'patientId required' });

  // Check Ollama availability — fail-soft if unavailable
  const ollamaAvailable = await checkOllama();
  if (!ollamaAvailable) {
    console.warn('[llm-agent] Ollama unavailable — returning null summary');
    return res.json({ summary: null, reason: 'ollama_unavailable', model: OLLAMA_MODEL });
  }

  // Fetch recent clinical notes
  const notes = await fetchNotes(patientId, req.headers.authorization);

  // Build prompt and call Ollama
  const prompt = buildPrompt({ patient, findings, notes, vitals, medications, labs });

  try {
    console.log(`[llm-agent] Calling Ollama (${OLLAMA_MODEL}) for patient ${patientId}…`);
    const summary = await callOllama(prompt);
    console.log(`[llm-agent] Summary generated (${summary.length} chars)`);
    res.json({ summary, model: OLLAMA_MODEL, generatedAt: new Date().toISOString() });
  } catch (err) {
    console.error('[llm-agent] Ollama call failed:', err.message);
    res.json({ summary: null, reason: 'ollama_error', detail: err.message, model: OLLAMA_MODEL });
  }
});

// ── POST /stream ─────────────────────────────────────────────────────────────
//
//  Same body as /summarize.
//  Returns an SSE stream: data: {"t":"token"}\n\n … data: [DONE]\n\n

app.post('/stream', authMiddleware, async (req, res) => {
  const { patientId, patient, findings = [], vitals = [], medications = [], labs = [] } = req.body;
  if (!patientId) return res.status(400).json({ error: 'patientId required' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const ollamaAvailable = await checkOllama();
  if (!ollamaAvailable) {
    res.write('data: {"error":"ollama_unavailable"}\n\n');
    res.write('data: [DONE]\n\n');
    return res.end();
  }

  const notes = await fetchNotes(patientId, req.headers.authorization);
  const prompt = buildPrompt({ patient, findings, notes, vitals, medications, labs });

  try {
    console.log(`[llm-agent] Streaming Ollama (${OLLAMA_MODEL}) for patient ${patientId}…`);
    const ollamaRes = await axios.post(
      `${OLLAMA_URL}/api/generate`,
      { model: OLLAMA_MODEL, prompt, stream: true, options: { num_predict: 400, temperature: 0.2 } },
      { responseType: 'stream', timeout: OLLAMA_TIMEOUT_MS }
    );

    let buf = '';
    ollamaRes.data.on('data', (chunk) => {
      buf += chunk.toString();
      const lines = buf.split('\n');
      buf = lines.pop(); // keep incomplete last fragment
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const json = JSON.parse(line);
          if (json.response) {
            res.write(`data: ${JSON.stringify({ t: json.response })}\n\n`);
          }
          if (json.done) {
            res.write('data: [DONE]\n\n');
            res.end();
          }
        } catch { /* skip unparseable line */ }
      }
    });

    ollamaRes.data.on('error', (err) => {
      console.error('[llm-agent] Ollama stream error:', err.message);
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    });

    req.on('close', () => ollamaRes.data.destroy());

  } catch (err) {
    console.error('[llm-agent] Stream failed:', err.message);
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

app.listen(PORT, () => {
  console.log(`LLM Agent listening on port ${PORT} (model: ${OLLAMA_MODEL})`);
});
