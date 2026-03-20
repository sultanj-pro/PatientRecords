'use strict';

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

// ─── Main export ──────────────────────────────────────────────────────────────

function analyze({ labs: rawLabs, vitals: rawVitals, patient, medications: rawMeds }) {
  const labs       = extractLabs(rawLabs);
  const vitals     = extractVitals(rawVitals);
  const medications = extractMeds(rawMeds);

  const findings = [
    ...checkCriticalValues(labs),
    ...checkMissingBaselineLabs(labs, medications),
    ...checkStaleLabs(labs),
    ...checkDeteriorationTrend(labs),
    ...checkVitalTriggeredLabs(vitals, labs),
  ];

  return findings;
}

module.exports = { analyze };
