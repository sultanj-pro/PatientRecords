'use strict';

const {
  VISIT_CADENCE_RULES,
  POLYPHARMACY_MED_COUNT,
  POLYPHARMACY_REVIEW_DAYS,
  FREQUENT_ER_VISITS_COUNT,
  FREQUENT_ER_VISITS_DAYS,
} = require('./rules/visitCadence');
const { getPendingNotifications } = require('./notificationStore');

// ─── Data helpers ─────────────────────────────────────────────────────────────

function extractVisits(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.value)) return raw.value;
  return [];
}

function extractMeds(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.value)) return raw.value;
  return [];
}

function visitDate(v) {
  return new Date(v.visitDate || v.date || v.visitedAt || 0);
}

function ageDays(date) {
  if (!date || isNaN(date)) return Infinity;
  return (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
}

function mostRecentVisitDate(visits) {
  if (!visits.length) return null;
  return visits.reduce((latest, v) => {
    const d = visitDate(v);
    return d > latest ? d : latest;
  }, new Date(0));
}

// ─── Rule 1: Visit cadence ────────────────────────────────────────────────────

function checkVisitCadence(visits, medications) {
  const findings = [];
  const medNames = medications.map(m =>
    (m.medicationName || m.medication_name || m.name || '').toLowerCase()
  );
  const lastVisit = mostRecentVisitDate(visits);
  const daysSinceLast = lastVisit ? ageDays(lastVisit) : Infinity;

  for (const rule of VISIT_CADENCE_RULES) {
    const conditionActive = rule.inferredFrom.some(sub =>
      medNames.some(mn => mn.includes(sub.toLowerCase()))
    );
    if (!conditionActive) continue;
    if (daysSinceLast <= rule.recommendedVisitDays) continue;

    const label = lastVisit && lastVisit.getTime() > 0
      ? `${Math.round(daysSinceLast)} days ago`
      : 'never recorded';

    findings.push({
      type:        'visit-overdue',
      severity:    rule.severity,
      title:       `Overdue Follow-Up: ${rule.condition} (last visit ${label})`,
      description: `Patient on ${rule.condition} medication has not been seen in over ${rule.recommendedVisitDays} days. ` +
                   `Last visit: ${label}.`,
      condition:   rule.condition,
      daysSinceLast: Math.round(daysSinceLast),
      recommendation: rule.recommendation,
    });
  }
  return findings;
}

// ─── Rule 2: Polypharmacy medication review ───────────────────────────────────

function checkMedicationReviewNeeded(medications, visits) {
  const findings = [];
  const activeMeds = medications.filter(m => {
    const status = (m.status || m.medStatus || '').toLowerCase();
    return !status || status === 'active' || status === '';
  });
  if (activeMeds.length < POLYPHARMACY_MED_COUNT) return findings;

  const lastVisit = mostRecentVisitDate(visits);
  const daysSinceLast = lastVisit ? ageDays(lastVisit) : Infinity;

  if (daysSinceLast > POLYPHARMACY_REVIEW_DAYS) {
    findings.push({
      type:        'medication-review',
      severity:    'medium',
      title:       `Medication Review Overdue (${activeMeds.length} active medications)`,
      description: `Patient is on ${activeMeds.length} medications. A comprehensive medication review ` +
                   `is recommended every ${POLYPHARMACY_REVIEW_DAYS} days for polypharmacy patients. ` +
                   `Last visit was ${Math.round(daysSinceLast)} days ago.`,
      medCount:    activeMeds.length,
      daysSinceLast: Math.round(daysSinceLast),
      recommendation: 'Schedule a comprehensive medication reconciliation visit to review interactions, adherence, and deprescribing opportunities.',
    });
  }
  return findings;
}

// ─── Rule 3: Frequent ER / hospital visits ────────────────────────────────────

function checkFrequentERVisits(visits) {
  const findings = [];
  const cutoff = new Date(Date.now() - FREQUENT_ER_VISITS_DAYS * 24 * 60 * 60 * 1000);

  const recentER = visits.filter(v => {
    const type = (v.visitType || '').toLowerCase();
    const d    = visitDate(v);
    return (type === 'hospital' || type === 'er' || type === 'emergency') && d >= cutoff;
  });

  if (recentER.length >= FREQUENT_ER_VISITS_COUNT) {
    findings.push({
      type:        'care-gap',
      severity:    'high',
      title:       `Care Coordination Gap: ${recentER.length} hospital/ER visits in last ${FREQUENT_ER_VISITS_DAYS} days`,
      description: `Patient has had ${recentER.length} hospital or ER visits in the last ${FREQUENT_ER_VISITS_DAYS} days. ` +
                   'This pattern may indicate inadequate outpatient management or care coordination.',
      visitCount:  recentER.length,
      windowDays:  FREQUENT_ER_VISITS_DAYS,
      recommendation: 'Initiate care coordination review. Consider case management referral, social work assessment, and outpatient intensification.',
    });
  }
  return findings;
}

// ─── Rule 4: Pending escalation notifications ─────────────────────────────────

async function fetchEscalationFindings(patientId) {
  if (!patientId) return [];
  try {
    const pending = await getPendingNotifications(String(patientId));
    return pending.map(n => ({
      type:           'event-escalation',
      severity:       n.severity,
      title:          n.title,
      description:    n.message,
      notificationId: n._id,
      ruleId:         n.ruleId,
      recommendation: 'Acknowledge this notification in the patient record after clinical review.',
    }));
  } catch {
    return []; // fail-soft — DB may not be ready during startup
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

async function analyze({ visits: rawVisits, medications: rawMeds, patient }) {
  const visits      = extractVisits(rawVisits);
  const medications = extractMeds(rawMeds);
  const patientId   = patient?.id || patient?._id || patient?.patientId;

  const [escalationFindings] = await Promise.all([
    fetchEscalationFindings(patientId),
  ]);

  const findings = [
    ...escalationFindings,
    ...checkVisitCadence(visits, medications),
    ...checkMedicationReviewNeeded(medications, visits),
    ...checkFrequentERVisits(visits),
  ];

  return findings;
}

module.exports = { analyze };
