'use strict';

const axios = require('axios');

const OLLAMA_URL   = process.env.OLLAMA_URL   || '';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2:1b';
const OLLAMA_TIMEOUT_MS = parseInt(process.env.OLLAMA_TIMEOUT_MS || '90000', 10);

// ── Prompt ────────────────────────────────────────────────────────────────────

const MEDICATION_AGENT_SYSTEM_PROMPT = `You are a clinical pharmacist AI embedded in an EHR system.
You will be given a patient's active medication list, recent lab results, allergies, and demographics.
Your task is to identify any ADDITIONAL clinical concerns NOT already flagged by the automated rule engine.

Focus on:
- Polypharmacy burden (5+ medications with compounding risks)
- Missing preventive medications for the patient's apparent conditions
- Medication timing or adherence concerns based on drug combinations
- Drug-nutrient interactions (e.g. warfarin and dietary vitamin K)
- Age-related concerns (e.g. Beers Criteria medications in elderly patients)
- Monitoring gaps (labs that should be ordered given the medication list)

Respond ONLY with a valid JSON array. Each element must have this exact shape:
{
  "type": "llm-medication-finding",
  "severity": "critical" | "high" | "moderate" | "low" | "info",
  "title": "<short title under 80 chars>",
  "description": "<clinical explanation 1-2 sentences>",
  "recommendation": "<action for the care team>",
  "drugs": ["<drug name>"] // optional — only include if specific to named drugs
}

Rules:
- Return [] if you have no additional concerns beyond what the rule engine covers
- Do NOT repeat findings about interactions or contraindications already flagged
- Do NOT invent findings — only flag genuinely clinically significant concerns
- Maximum 4 findings
- No markdown, no explanation text — JSON array ONLY`;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * 8.8.5 — Strip control characters and limit length to prevent prompt injection
 * via any user-controlled string (drug name, allergy name, lab value, etc.).
 */
function sanitizeForPrompt(str, maxLen = 200) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '') // strip control chars
    .replace(/\n{3,}/g, '\n\n')                         // collapse excess newlines
    .slice(0, maxLen)
    .trim();
}

function isValidFinding(f) {
  return f &&
    typeof f.type === 'string' &&
    ['critical', 'high', 'moderate', 'low', 'info'].includes(f.severity) &&
    typeof f.title === 'string' && f.title.length > 0 &&
    typeof f.description === 'string' && f.description.length > 0 &&
    typeof f.recommendation === 'string' && f.recommendation.length > 0;
}

function parseLlmFindings(raw) {
  try {
    // Strip any accidental markdown fences
    const cleaned = raw.replace(/```json|```/g, '').trim();
    // Find the JSON array boundaries in case there's surrounding text
    const start = cleaned.indexOf('[');
    const end   = cleaned.lastIndexOf(']');
    if (start === -1 || end === -1) return [];
    const arr = JSON.parse(cleaned.slice(start, end + 1));
    if (!Array.isArray(arr)) return [];
    // Validate each finding — drop malformed ones
    return arr.filter(isValidFinding).slice(0, 4);
  } catch {
    return [];
  }
}

async function checkOllama() {
  if (!OLLAMA_URL) return false;
  try {
    await axios.get(`${OLLAMA_URL}/api/tags`, { timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Call Ollama with the MEDICATION_AGENT_SYSTEM_PROMPT and return validated
 * structured findings. Returns [] on any failure (fail-soft).
 */
async function getLlmMedicationFindings({ medications, labs, patient, existingFindings }) {
  if (!OLLAMA_URL) return [];
  if (!(await checkOllama())) {
    console.warn('[medication-agent] Ollama unavailable — skipping LLM analysis');
    return [];
  }

  const medList = (Array.isArray(medications) ? medications : (medications?.value || []))
    .filter(m => !m.deletedAt)
    .map(m => sanitizeForPrompt(`${m.name || ''}${m.dose ? ' ' + m.dose : ''}${m.frequency ? ' ' + m.frequency : ''}`.trim()))
    .join(', ') || 'None';

  const labList = (Array.isArray(labs) ? labs : (labs?.value || []))
    .slice(0, 8)
    .map(l => sanitizeForPrompt(`${l.testName || l.test_name}: ${l.value || l.result} ${l.unit || ''}`.trim()))
    .join(', ') || 'None';

  const allergies = (patient?.allergies || []).map(a => sanitizeForPrompt(a.substance || a, 60)).join(', ') || 'None known';
  const age       = sanitizeForPrompt(String(patient?.age || patient?.demographics?.age || 'unknown'), 20);
  const gender    = sanitizeForPrompt(String(patient?.demographics?.gender || patient?.gender || 'unknown'), 20);

  const existingSummary = existingFindings.length > 0
    ? existingFindings.map(f => f.title).join('; ')
    : 'None';

  const userPrompt = `Patient: Age ${age}, Gender ${gender}
Allergies: ${allergies}
Active Medications (${(Array.isArray(medications) ? medications : medications?.value || []).filter(m => !m.deletedAt).length}): ${medList}
Recent Labs: ${labList}
Already flagged by rule engine (do NOT repeat): ${existingSummary}

Identify any additional medication safety concerns:`;

  try {
    console.log(`[medication-agent] Calling Ollama (${OLLAMA_MODEL}) for LLM medication analysis…`);
    const { data } = await axios.post(
      `${OLLAMA_URL}/api/generate`,
      {
        model:  OLLAMA_MODEL,
        system: MEDICATION_AGENT_SYSTEM_PROMPT,
        prompt: userPrompt,
        stream: false,
      },
      { timeout: OLLAMA_TIMEOUT_MS }
    );

    const raw      = (data?.response || '').trim();
    const findings = parseLlmFindings(raw);
    console.log(`[medication-agent] LLM returned ${findings.length} valid finding(s)`);
    return findings;
  } catch (err) {
    console.warn('[medication-agent] LLM analysis failed (non-critical):', err.message);
    return [];
  }
}

module.exports = { getLlmMedicationFindings };
