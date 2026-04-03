'use strict';

const axios = require('axios');

const { CONDITION_LAB_MAP, STALE_LAB_THRESHOLDS } = require('./rules/diagnosticGaps');
const { checkCriticalValue } = require('./rules/criticalValues');

// ─── Data extraction helpers ──────────────────────────────────────────────────

/**
 * Normalise the lab list regardless of response envelope shape.
 * Handles: { value: [...], Count: n }  OR  plain array.
 */
function extractLabs(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.value)) return raw.value;
  return [];
}

/**
 * Normalise the vitals list.
 */
function extractVitals(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.value)) return raw.value;
  return [];
}

/**
 * Normalise the medications list.
 */
function extractMeds(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.value)) return raw.value;
  return [];
}

// ─── Lab helpers ─────────────────────────────────────────────────────────────

/** Return all labs matching a substring (case-insensitive). */
function findLabsByName(labs, substring) {
  const sub = substring.toLowerCase();
  return labs.filter(l => {
    const name = (l.testName || l.test_name || '').toLowerCase();
    return name.includes(sub);
  });
}

/** Return the single most-recent lab entry for a name substring, or null. */
function getMostRecent(labs, substring) {
  const matches = findLabsByName(labs, substring);
  if (!matches.length) return null;
  return matches.sort((a, b) => {
    const da = new Date(a.resultDate || a.date || 0);
    const db = new Date(b.resultDate || b.date || 0);
    return db - da;
  })[0];
}

/** Age in days of a lab entry. */
function ageDays(lab) {
  const d = new Date(lab.resultDate || lab.date || 0);
  if (!d || isNaN(d)) return Infinity;
  return (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
}

// ─── Rule 1: Critical values ──────────────────────────────────────────────────

function checkCriticalValues(labs) {
  const findings = [];
  for (const lab of labs) {
    const f = checkCriticalValue(lab);
    if (f) findings.push(f);
  }
  return findings;
}

// ─── Rule 2: Missing baseline labs (condition-inferred) ──────────────────────

function checkMissingBaselineLabs(labs, medications) {
  const findings = [];
  const reportedLabs = new Set(); // deduplicate same lab across multiple conditions
  const medNames = medications.map(m =>
    (m.medicationName || m.medication_name || m.name || '').toLowerCase()
  );

  for (const config of CONDITION_LAB_MAP) {
    const condition = config.condition;
    // Is this condition likely active for this patient?
    const conditionActive = config.inferredFrom.some(sub =>
      medNames.some(mn => mn.includes(sub.toLowerCase()))
    );
    if (!conditionActive) continue;

    for (const labSpec of config.labs) {
      const recent = getMostRecent(labs, labSpec.testNameSubstring);
      if (!recent || ageDays(recent) > labSpec.maxAgeDays) {
        if (reportedLabs.has(labSpec.name)) continue; // already reported for another condition
        reportedLabs.add(labSpec.name);
        findings.push({
          type:        'missing-baseline-lab',
          severity:    'medium',
          title:       `Missing Lab: ${labSpec.name} (${condition})`,
          description: recent
            ? `${labSpec.name} last collected ${Math.round(ageDays(recent))} days ago — exceeds the ${labSpec.maxAgeDays}-day window for patients with ${condition}.`
            : `No ${labSpec.name} result on record. Required for monitoring ${condition}.`,
          condition,
          labName:     labSpec.name,
          recommendation: `Order ${labSpec.name} to monitor ${condition} management.`,
        });
      }
    }
  }
  return findings;
}

// ─── Rule 3: Stale labs ───────────────────────────────────────────────────────

function checkStaleLabs(labs) {
  const findings = [];
  const seen = new Set();

  for (const lab of labs) {
    const testName = (lab.testName || lab.test_name || '').toLowerCase();
    for (const threshold of STALE_LAB_THRESHOLDS) {
      if (!testName.includes(threshold.testNameSubstring)) continue;
      if (seen.has(threshold.testNameSubstring)) continue;
      seen.add(threshold.testNameSubstring);

      const recent = getMostRecent(labs, threshold.testNameSubstring);
      if (recent && ageDays(recent) > threshold.maxAgeDays) {
        findings.push({
          type:        'stale-lab',
          severity:    'low',
          title:       `Stale Lab: ${recent.testName || recent.test_name} (${Math.round(ageDays(recent))} days old)`,
          description: `${recent.testName || recent.test_name} was last collected ${Math.round(ageDays(recent))} days ago, which exceeds the recommended ${threshold.maxAgeDays}-day interval.`,
          labName:     recent.testName || recent.test_name,
          ageDays:     Math.round(ageDays(recent)),
          recommendation: `Repeat ${recent.testName || recent.test_name} per monitoring guidelines.`,
        });
      }
    }
  }
  return findings;
}

// ─── Rule 4: Deterioration trend ─────────────────────────────────────────────

/**
 * Flag labs where the most-recent value is significantly worse than
 * the prior value (i.e. trending in the wrong clinical direction).
 */
const TREND_RULES = [
  {
    testNameSubstring: 'creatinine',
    direction: 'up',          // rising = bad
    thresholdPct: 25,
    severity: 'high',
    recommendation: 'Rising creatinine trend. Evaluate for acute kidney injury — review nephrotoxins, fluid status, urine output.',
  },
  {
    testNameSubstring: 'a1c',
    direction: 'up',
    thresholdPct: 10,
    severity: 'medium',
    recommendation: 'Worsening glycemic control trend. Review diabetes medication adherence and titration.',
  },
  {
    testNameSubstring: 'inr',
    direction: 'up',
    thresholdAbsolute: 1.5,
    severity: 'high',
    recommendation: 'INR rising significantly. Assess for bleeding risk. Review anticoagulant dose and interactions.',
  },
  {
    testNameSubstring: 'hemoglobin',
    direction: 'down',       // falling = bad
    thresholdPct: 15,
    severity: 'high',
    recommendation: 'Declining hemoglobin trend. Evaluate for occult bleeding or worsening anemia.',
  },
  {
    testNameSubstring: 'potassium',
    direction: 'up',
    thresholdAbsolute: 1.0,
    severity: 'medium',
    recommendation: 'Rising potassium trend. Review potassium-sparing medications and renal function.',
  },
];

function checkDeteriorationTrend(labs) {
  const findings = [];
  for (const rule of TREND_RULES) {
    const matches = findLabsByName(labs, rule.testNameSubstring).sort((a, b) => {
      return new Date(b.resultDate || b.date || 0) - new Date(a.resultDate || a.date || 0);
    });
    if (matches.length < 2) continue;

    const [latest, prior] = [matches[0], matches[1]];
    const latestVal = parseFloat(latest.value || latest.result);
    const priorVal  = parseFloat(prior.value  || prior.result);
    if (isNaN(latestVal) || isNaN(priorVal) || priorVal === 0) continue;

    const delta    = latestVal - priorVal;
    const pctChange = Math.abs(delta / priorVal) * 100;
    const worsening  = rule.direction === 'up' ? delta > 0 : delta < 0;
    if (!worsening) continue;

    const overThreshold = rule.thresholdPct
      ? pctChange >= rule.thresholdPct
      : Math.abs(delta) >= rule.thresholdAbsolute;

    if (overThreshold) {
      const testDisplay = latest.testName || latest.test_name;
      findings.push({
        type:        'deterioration-trend',
        severity:    rule.severity,
        title:       `Worsening Trend: ${testDisplay} (${priorVal} → ${latestVal} ${latest.unit || ''})`,
        description: `${testDisplay} changed from ${priorVal} to ${latestVal} ${latest.unit || ''} — a ${Math.round(pctChange)}% ${rule.direction === 'up' ? 'increase' : 'decrease'}.`,
        labName:     testDisplay,
        priorValue:  priorVal,
        latestValue: latestVal,
        recommendation: rule.recommendation,
      });
    }
  }
  return findings;
}

// ─── Rule 5: Vital-triggered missing labs ────────────────────────────────────

const VITAL_TRIGGERED_LAB_RULES = [
  {
    // Sustained hypertension → check BMP (electrolytes, creatinine)
    vitalSubstring:   'systolic',
    valueThreshold:   160,
    direction:        'above',
    requiredLab:      'metabolic panel',
    requiredLabSub:   'metabolic',
    maxLabAgeDays:    90,
    severity:         'medium',
    recommendation:   'Systolic BP ≥ 160 mmHg recorded. Order CMP/BMP to assess renal function and electrolytes.',
  },
  {
    // Bradycardia → check thyroid & digoxin level
    vitalSubstring:   'heart rate',
    valueThreshold:   50,
    direction:        'below',
    requiredLab:      'TSH',
    requiredLabSub:   'tsh',
    maxLabAgeDays:    180,
    severity:         'medium',
    recommendation:   'Heart rate ≤ 50 bpm recorded. Check TSH for hypothyroidism and digoxin level if applicable.',
  },
  {
    // Fever → check CBC for infection
    vitalSubstring:   'temperature',
    valueThreshold:   101.5,
    direction:        'above',
    requiredLab:      'CBC',
    requiredLabSub:   'cbc',
    maxLabAgeDays:    7,
    severity:         'medium',
    recommendation:   'Temperature > 101.5°F recorded. Order CBC to evaluate for infectious process.',
  },
  {
    // High RR → check BNP for heart failure exacerbation
    vitalSubstring:   'respiratory rate',
    valueThreshold:   20,
    direction:        'above',
    requiredLab:      'BNP',
    requiredLabSub:   'bnp',
    maxLabAgeDays:    30,
    severity:         'high',
    recommendation:   'Elevated respiratory rate detected. Consider BNP/NT-proBNP to rule out heart failure exacerbation.',
  },
];

function checkVitalTriggeredLabs(vitals, labs) {
  const findings = [];
  for (const rule of VITAL_TRIGGERED_LAB_RULES) {
    const vitalSub = rule.vitalSubstring.toLowerCase();
    const relevantVitals = vitals.filter(v =>
      (v.vital_description || '').toLowerCase().includes(vitalSub)
    );
    if (!relevantVitals.length) continue;

    const triggered = relevantVitals.some(v => {
      const val = parseFloat(v.value);
      if (isNaN(val)) return false;
      return rule.direction === 'above' ? val >= rule.valueThreshold : val <= rule.valueThreshold;
    });
    if (!triggered) continue;

    const recentLab = getMostRecent(labs, rule.requiredLabSub);
    if (!recentLab || ageDays(recentLab) > rule.maxLabAgeDays) {
      findings.push({
        type:        'vital-triggered-lab',
        severity:    rule.severity,
        title:       `Vital Sign Alert: ${rule.requiredLab} needed`,
        description: recentLab
          ? `${rule.requiredLab} last drawn ${Math.round(ageDays(recentLab))} days ago, but recent vital signs indicate retesting is warranted.`
          : `No recent ${rule.requiredLab} on record. Vital sign finding suggests lab workup is indicated.`,
        vitalTrigger: rule.vitalSubstring,
        labName:      rule.requiredLab,
        recommendation: rule.recommendation,
      });
    }
  }
  return findings;
}

// ─── LLM structured lab analysis (Ollama, fail-soft) ─────────────────────────

/**
 * 8.8.5 — Strip control characters and enforce length limit to prevent
 * prompt injection via user-controlled strings (lab names, values, etc.).
 */
function sanitizeForPrompt(str, maxLen = 200) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .slice(0, maxLen)
    .trim();
}

const LABS_AGENT_SYSTEM_PROMPT = `You are a clinical laboratory specialist AI embedded in an EHR system.
You will be given a patient's recent lab results, vitals, and the findings already flagged by the automated rule engine.
Your task is to identify ADDITIONAL clinical concerns NOT already flagged, then provide a brief synthesis.

Return ONLY a valid JSON object with this exact shape:
{
  "findings": [
    {
      "type": "llm-lab-finding",
      "severity": "critical" | "high" | "moderate" | "low" | "info",
      "title": "<short title under 80 chars>",
      "description": "<clinical explanation 1-2 sentences>",
      "recommendation": "<action for the care team>"
    }
  ],
  "interpretation": "<2-3 sentence narrative synthesis of the overall lab picture for the physician>"
}

Rules:
- "findings" may be empty array [] if nothing additional to flag
- Do NOT repeat findings already flagged by the rule engine
- Do NOT invent findings — only flag genuinely clinically significant concerns
- Maximum 3 additional findings
- No markdown, no explanation text — JSON object ONLY`;

function isValidLabFinding(f) {
  return f &&
    typeof f.type === 'string' &&
    ['critical', 'high', 'moderate', 'low', 'info'].includes(f.severity) &&
    typeof f.title === 'string' && f.title.length > 0 &&
    typeof f.description === 'string' && f.description.length > 0 &&
    typeof f.recommendation === 'string' && f.recommendation.length > 0;
}

function parseLlmLabResponse(raw) {
  try {
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const start = cleaned.indexOf('{');
    const end   = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1) return { findings: [], interpretation: null };
    const obj = JSON.parse(cleaned.slice(start, end + 1));
    return {
      findings:       (Array.isArray(obj.findings) ? obj.findings : []).filter(isValidLabFinding).slice(0, 3),
      interpretation: typeof obj.interpretation === 'string' ? obj.interpretation.trim() : null,
    };
  } catch {
    return { findings: [], interpretation: null };
  }
}

async function callLlmLabAnalysis(ruleFindings, labs, vitals, patient, ollamaUrl, ollamaModel) {
  if (!ollamaUrl || labs.length === 0) return { findings: [], interpretation: null };

  try {
    await axios.get(`${ollamaUrl}/api/tags`, { timeout: 3000 });
  } catch {
    console.warn('[labs-agent] Ollama unavailable — skipping LLM analysis');
    return { findings: [], interpretation: null };
  }

  const labList = labs.slice(0, 10)
    .map(l => sanitizeForPrompt(`${l.testName || l.test_name}: ${l.value || l.result} ${l.unit || ''}${l.referenceRange || l.reference_range ? ` (ref: ${l.referenceRange || l.reference_range})` : ''}${l.flag ? ` [${l.flag}]` : ''}`))
    .join('\n');

  const vitalList = vitals.slice(0, 5)
    .map(v => sanitizeForPrompt(`${v.vital_description}: ${v.value} ${v.unit || ''}`))
    .join(', ') || 'None';

  const patientDesc = `Age: ${sanitizeForPrompt(String(patient?.age || patient?.demographics?.age || 'unknown'), 20)}, Gender: ${sanitizeForPrompt(String(patient?.demographics?.gender || 'unknown'), 20)}`;

  const alreadyFlagged = ruleFindings.length > 0
    ? ruleFindings.map(f => f.title).join('; ')
    : 'None';

  const userPrompt = `Patient: ${patientDesc}

Lab Results:
${labList}

Recent Vitals: ${vitalList}

Already flagged by rule engine (do NOT repeat): ${alreadyFlagged}

Analyze the lab results and provide additional findings and interpretation:`;

  try {
    console.log(`[labs-agent] Calling Ollama (${ollamaModel || 'llama3.2:1b'}) for LLM lab analysis…`);
    const { data } = await axios.post(
      `${ollamaUrl}/api/generate`,
      {
        model:  ollamaModel || 'llama3.2:1b',
        system: LABS_AGENT_SYSTEM_PROMPT,
        prompt: userPrompt,
        stream: false,
      },
      { timeout: 90000 }
    );

    const raw    = (data?.response || '').trim();
    const result = parseLlmLabResponse(raw);
    console.log(`[labs-agent] LLM returned ${result.findings.length} finding(s) + interpretation`);
    return result;
  } catch (err) {
    console.warn('[labs-agent] LLM analysis failed (non-critical):', err.message);
    return { findings: [], interpretation: null };
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

async function analyze({ labs: rawLabs, vitals: rawVitals, patient, medications: rawMeds, ollamaUrl, ollamaModel }) {
  const labs        = extractLabs(rawLabs);
  const vitals      = extractVitals(rawVitals);
  const medications = extractMeds(rawMeds);

  const ruleFindings = [
    ...checkCriticalValues(labs),
    ...checkMissingBaselineLabs(labs, medications),
    ...checkStaleLabs(labs),
    ...checkDeteriorationTrend(labs),
    ...checkVitalTriggeredLabs(vitals, labs),
  ];

  // LLM structured analysis — additional findings + narrative interpretation
  const llmResult = await callLlmLabAnalysis(ruleFindings, labs, vitals, patient, ollamaUrl, ollamaModel);

  const allFindings = [...ruleFindings, ...llmResult.findings];

  // Append the narrative interpretation as an info finding if present
  if (llmResult.interpretation) {
    allFindings.push({
      type:           'llm-interpretation',
      severity:       'info',
      title:          'AI Lab Interpretation',
      description:    llmResult.interpretation,
      recommendation: 'AI-generated clinical interpretation — for informational purposes only.',
    });
  }

  return allFindings;
}

module.exports = { analyze };
