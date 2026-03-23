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
const OLLAMA_TIMEOUT_MS  = parseInt(process.env.OLLAMA_TIMEOUT_MS || '120000', 10);

app.use(cors());
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

function buildPrompt({ patient, findings, notes, vitals, medications, labs }) {
  const patientLine = patient
    ? `Patient: ${patient.firstName || ''} ${patient.lastName || ''}, Age: ${patient.age || 'unknown'}, DOB: ${patient.dateOfBirth || 'unknown'}, Gender: ${patient.gender || 'unknown'}`
    : 'Patient details unavailable.';

  const findingsSection = findings && findings.length > 0
    ? findings.map(f =>
        `  - [${(f.severity || 'unknown').toUpperCase()}] ${f.title}: ${f.description}` +
        (f.recommendation ? ` Recommendation: ${f.recommendation}` : '')
      ).join('\n')
    : '  None identified.';

  const notesSection = notes && notes.length > 0
    ? notes.slice(0, 6).map(n =>
        `  [${n.type?.toUpperCase() || 'NOTE'}] by ${n.providerName || n.providerId} (${n.providerRole || 'provider'}): ${n.content}`
      ).join('\n\n')
    : '  No recent clinical notes available.';

  const vitalsSection = vitals && vitals.length > 0
    ? (() => {
        const latest = vitals[0];
        return `BP: ${latest.systolic || '?'}/${latest.diastolic || '?'} mmHg, HR: ${latest.heartRate || '?'} bpm, Temp: ${latest.temperature || '?'}°C, SpO₂: ${latest.oxygenSaturation || '?'}%, Weight: ${latest.weight || '?'} kg`;
      })()
    : 'Not available.';

  const medsSection = medications && medications.length > 0
    ? medications.slice(0, 8).map(m => `${m.name} ${m.dose || ''} ${m.frequency || ''}`.trim()).join(', ')
    : 'None recorded.';

  const labsSection = labs && labs.length > 0
    ? labs.slice(0, 6).map(l => `${l.testName}: ${l.value} ${l.unit || ''}${l.flag ? ` (${l.flag})` : ''}`).join(', ')
    : 'None recorded.';

  return `You are a clinical decision support AI embedded in an electronic health record system. Generate a concise, professional narrative summary for a physician reviewing this patient.

${patientLine}

LATEST VITALS:
${vitalsSection}

CURRENT MEDICATIONS:
${medsSection}

RECENT LAB RESULTS:
${labsSection}

AGENT FINDINGS (automated clinical rule analysis):
${findingsSection}

RECENT CLINICAL NOTES (from providers):
${notesSection}

TASK:
Write a structured clinical summary in 3 sections:
1. CLINICAL OVERVIEW — 2-3 sentences summarising the patient's current clinical picture.
2. KEY CONCERNS — bullet list of the most important issues requiring attention, incorporating the agent findings and notes.
3. SUGGESTED NEXT STEPS — concise action points for the care team.

Keep the summary under 300 words. Use clinical language appropriate for a physician audience. Do not invent information not present in the data above. If data is limited, note it briefly.`;
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
    { model: OLLAMA_MODEL, prompt, stream: false },
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

app.listen(PORT, () => {
  console.log(`LLM Agent listening on port ${PORT} (model: ${OLLAMA_MODEL})`);
});
