'use strict';

/**
 * Event-driven escalation rules.
 *
 * When the Redis stream consumer receives an event matching `eventType`,
 * it evaluates each rule against the parsed payload.
 * If `match(payload)` returns true a notification is created.
 *
 * Each rule: { eventType, id, severity, title, message(payload), match(payload) }
 */
const EVENT_ESCALATION_RULES = [
  // ── Labs resulted ─────────────────────────────────────────────────────────
  {
    id:        'labs-critical-troponin',
    eventType: 'labs-resulted',
    severity:  'critical',
    match: (p) => p.testName && p.testName.toLowerCase().includes('troponin') &&
                  parseFloat(p.value) >= 0.04,
    title:   (p) => `Critical Troponin: ${p.testName} = ${p.value} ${p.unit || ''}`,
    message: (p) => `Patient ${p.patientId}: Elevated troponin (${p.value}) detected. ` +
                    'Possible acute myocardial injury. Immediate cardiology consult required.',
  },
  {
    id:        'labs-critical-potassium-high',
    eventType: 'labs-resulted',
    severity:  'critical',
    match: (p) => p.testName && p.testName.toLowerCase().includes('potassium') &&
                  parseFloat(p.value) >= 6.5,
    title:   (p) => `Critical Hyperkalemia: Potassium ${p.value} mEq/L`,
    message: (p) => `Patient ${p.patientId}: Potassium ${p.value} mEq/L — critical hyperkalemia. ` +
                    'ECG immediately. Physician notification required.',
  },
  {
    id:        'labs-critical-potassium-low',
    eventType: 'labs-resulted',
    severity:  'critical',
    match: (p) => p.testName && p.testName.toLowerCase().includes('potassium') &&
                  parseFloat(p.value) <= 2.5,
    title:   (p) => `Critical Hypokalemia: Potassium ${p.value} mEq/L`,
    message: (p) => `Patient ${p.patientId}: Potassium ${p.value} mEq/L — critical hypokalemia. ` +
                    'IV replacement and cardiac monitoring required.',
  },
  {
    id:        'labs-critical-glucose-hypo',
    eventType: 'labs-resulted',
    severity:  'critical',
    match: (p) => p.testName && p.testName.toLowerCase().includes('glucose') &&
                  parseFloat(p.value) <= 50,
    title:   (p) => `Critical Hypoglycemia: Glucose ${p.value} mg/dL`,
    message: (p) => `Patient ${p.patientId}: Glucose ${p.value} mg/dL — critical hypoglycemia. ` +
                    'Immediate intervention required.',
  },
  {
    id:        'labs-critical-glucose-hyper',
    eventType: 'labs-resulted',
    severity:  'critical',
    match: (p) => p.testName && p.testName.toLowerCase().includes('glucose') &&
                  parseFloat(p.value) >= 500,
    title:   (p) => `Critical Hyperglycemia: Glucose ${p.value} mg/dL`,
    message: (p) => `Patient ${p.patientId}: Glucose ${p.value} mg/dL — possible DKA/HHS. ` +
                    'Urgent physician assessment required.',
  },
  {
    id:        'labs-high-inr',
    eventType: 'labs-resulted',
    severity:  'high',
    match: (p) => p.testName && p.testName.toLowerCase().includes('inr') &&
                  parseFloat(p.value) >= 5.0,
    title:   (p) => `Critically Elevated INR: ${p.value}`,
    message: (p) => `Patient ${p.patientId}: INR ${p.value} — high bleeding risk. ` +
                    'Review anticoagulant dosing and consider Vitamin K reversal.',
  },
  {
    id:        'labs-rising-creatinine',
    eventType: 'labs-resulted',
    severity:  'high',
    match: (p) => p.testName && p.testName.toLowerCase().includes('creatinine') &&
                  parseFloat(p.value) >= 4.0,
    title:   (p) => `Severely Elevated Creatinine: ${p.value} mg/dL`,
    message: (p) => `Patient ${p.patientId}: Creatinine ${p.value} mg/dL — possible AKI or ESRD. ` +
                    'Urgent nephrology notification.',
  },
  // ── Vitals recorded ───────────────────────────────────────────────────────
  {
    id:        'vitals-hypertensive-crisis',
    eventType: 'vitals-recorded',
    severity:  'critical',
    match: (p) => p.vitalType && p.vitalType.toLowerCase().includes('systolic') &&
                  parseFloat(p.value) >= 180,
    title:   (p) => `Hypertensive Crisis: Systolic BP ${p.value} mmHg`,
    message: (p) => `Patient ${p.patientId}: Systolic BP ${p.value} mmHg — hypertensive crisis threshold. ` +
                    'Immediate physician evaluation required.',
  },
  {
    id:        'vitals-severe-bradycardia',
    eventType: 'vitals-recorded',
    severity:  'high',
    match: (p) => p.vitalType && p.vitalType.toLowerCase().includes('heart rate') &&
                  parseFloat(p.value) <= 40,
    title:   (p) => `Severe Bradycardia: HR ${p.value} bpm`,
    message: (p) => `Patient ${p.patientId}: Heart rate ${p.value} bpm — symptomatic bradycardia risk. ` +
                    'ECG and physician review required.',
  },
  {
    id:        'vitals-high-fever',
    eventType: 'vitals-recorded',
    severity:  'medium',
    match: (p) => p.vitalType && p.vitalType.toLowerCase().includes('temperature') &&
                  parseFloat(p.value) >= 103.0,
    title:   (p) => `High Fever: Temp ${p.value}°F`,
    message: (p) => `Patient ${p.patientId}: Temperature ${p.value}°F — high fever. ` +
                    'Infectious workup recommended; review immunocompromised status.',
  },
];

module.exports = { EVENT_ESCALATION_RULES };
