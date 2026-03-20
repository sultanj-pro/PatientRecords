'use strict';

/**
 * Critical value thresholds — values that require immediate clinical attention
 * regardless of patient history.
 *
 * Each rule: { testNameSubstring, unit, lowCritical, highCritical, severity, recommendation }
 * null means "no threshold in that direction"
 */
const CRITICAL_VALUE_RULES = [
  {
    testNameSubstring: 'glucose',
    unit: 'mg/dL',
    lowCritical: 50,
    highCritical: 500,
    severity: 'critical',
    recommendation: 'Critical glucose level. Assess for hypoglycemia/DKA. Check ketones, obtain IV access, contact physician immediately.',
  },
  {
    testNameSubstring: 'potassium',
    unit: 'mEq/L',
    lowCritical: 2.5,
    highCritical: 6.5,
    severity: 'critical',
    recommendation: 'Critical potassium level. Risk of life-threatening cardiac arrhythmia. Obtain ECG immediately. Notify physician.',
  },
  {
    testNameSubstring: 'sodium',
    unit: 'mEq/L',
    lowCritical: 120,
    highCritical: 160,
    severity: 'critical',
    recommendation: 'Critical sodium level. Risk of cerebral edema or osmotic demyelination. Immediate physician notification required.',
  },
  {
    testNameSubstring: 'creatinine',
    unit: 'mg/dL',
    lowCritical: null,
    highCritical: 10.0,
    severity: 'critical',
    recommendation: 'Critical creatinine elevation. Possible acute kidney injury or end-stage renal disease. Urgent nephrology consult.',
  },
  {
    testNameSubstring: 'hemoglobin',
    unit: 'g/dL',
    lowCritical: 7.0,
    highCritical: null,
    // Exclude "Hemoglobin A1C" — its critical check is in the A1C rule
    excludeSubstring: 'a1c',
    severity: 'critical',
    recommendation: 'Critical low hemoglobin. Assess for active bleeding. Consider RBC transfusion. Urgent physician notification.',
  },
  {
    testNameSubstring: 'calcium',
    unit: 'mg/dL',
    lowCritical: 6.5,
    highCritical: 13.5,
    severity: 'critical',
    recommendation: 'Critical calcium level. Risk of tetany (low) or cardiac arrest/coma (high). Notify physician immediately.',
  },
  {
    testNameSubstring: 'ph',
    unit: '',
    lowCritical: 7.20,
    highCritical: 7.60,
    severity: 'critical',
    recommendation: 'Critical blood pH. Severe acidosis or alkalosis. Immediate ABG correlation and physician notification.',
  },
  {
    testNameSubstring: 'inr',
    unit: '',
    lowCritical: null,
    highCritical: 5.0,
    severity: 'high',
    recommendation: 'Critically elevated INR. High risk of serious bleeding. Hold anticoagulant; consider Vitamin K or FFP. Notify physician.',
  },
  {
    testNameSubstring: 'platelet',
    unit: 'K/uL',
    lowCritical: 20,
    highCritical: null,
    severity: 'critical',
    recommendation: 'Critical thrombocytopenia. High risk of spontaneous bleeding. Hold anticoagulants/antiplatelets. Urgent physician notification.',
  },
  {
    testNameSubstring: 'troponin',
    unit: '',
    lowCritical: null,
    highCritical: 0.04,
    severity: 'critical',
    recommendation: 'Elevated troponin. Possible acute myocardial injury or MI. 12-lead ECG immediately. Cardiology consult. Do not discharge.',
  },
  {
    testNameSubstring: 'a1c',
    unit: '%',
    lowCritical: null,
    highCritical: 10.0,
    severity: 'high',
    recommendation: 'Severely uncontrolled diabetes (A1C ≥ 10%). Reassess diabetes management plan. Endocrinology referral recommended.',
  },
];

/**
 * Check a single lab result against critical value thresholds.
 * @param {object} lab   { testName|test_name, value|result, unit }
 * @returns {object|null} finding or null
 */
function checkCriticalValue(lab) {
  const testName = (lab.testName || lab.test_name || '').toLowerCase();
  const rawValue = parseFloat(lab.value || lab.result);
  if (isNaN(rawValue)) return null;

  for (const rule of CRITICAL_VALUE_RULES) {
    if (!testName.includes(rule.testNameSubstring)) continue;
    if (rule.excludeSubstring && testName.includes(rule.excludeSubstring)) continue;

    const isLowCrit  = rule.lowCritical  !== null && rawValue <= rule.lowCritical;
    const isHighCrit = rule.highCritical !== null && rawValue >= rule.highCritical;

    if (isLowCrit || isHighCrit) {
      const direction = isLowCrit ? 'critically low' : 'critically high';
      return {
        type:        'critical-value',
        severity:    rule.severity,
        title:       `Critical Lab Value: ${lab.testName || lab.test_name} ${direction} (${rawValue} ${lab.unit || ''})`,
        description: `${lab.testName || lab.test_name} result of ${rawValue} ${lab.unit || ''} is ${direction} (threshold: ${isLowCrit ? '≤' + rule.lowCritical : '≥' + rule.highCritical} ${rule.unit}).`,
        testName:    lab.testName || lab.test_name,
        value:       rawValue,
        unit:        lab.unit || '',
        recommendation: rule.recommendation,
      };
    }
  }
  return null;
}

module.exports = { checkCriticalValue, CRITICAL_VALUE_RULES };
