'use strict';

/**
 * Visit cadence guidelines — how often a patient on these medications
 * should be seen by their care team.
 *
 * Each rule: { condition, inferredFrom, recommendedVisitDays, severity }
 */
const VISIT_CADENCE_RULES = [
  {
    condition:           'Heart Failure',
    inferredFrom:        ['furosemide', 'bumetanide', 'spironolactone', 'digoxin', 'sacubitril'],
    recommendedVisitDays: 30,
    severity:            'high',
    recommendation:      'Patients with heart failure should be seen at least every 30 days to monitor fluid status, weight, and medication response.',
  },
  {
    condition:           'Type 2 Diabetes',
    inferredFrom:        ['metformin', 'glipizide', 'glyburide', 'glimepiride', 'insulin', 'sitagliptin', 'empagliflozin', 'liraglutide'],
    recommendedVisitDays: 90,
    severity:            'medium',
    recommendation:      'Patients with diabetes should be seen every 90 days for glycemic monitoring and complication screening.',
  },
  {
    condition:           'Atrial Fibrillation (anticoagulated)',
    inferredFrom:        ['warfarin', 'apixaban', 'rivaroxaban', 'dabigatran'],
    recommendedVisitDays: 30,
    severity:            'high',
    recommendation:      'Anticoagulated A-Fib patients require monthly INR/clinical review to assess bleeding and thrombotic risk.',
  },
  {
    condition:           'Chronic Kidney Disease',
    inferredFrom:        ['sevelamer', 'calcitriol', 'darbepoetin', 'epoetin'],
    recommendedVisitDays: 60,
    severity:            'high',
    recommendation:      'CKD patients should be assessed every 60 days for renal progression, electrolyte management, and anemia.',
  },
  {
    condition:           'Hypertension',
    inferredFrom:        ['lisinopril', 'losartan', 'amlodipine', 'metoprolol', 'atenolol', 'hydrochlorothiazide', 'valsartan', 'carvedilol'],
    recommendedVisitDays: 180,
    severity:            'low',
    recommendation:      'Hypertensive patients should be seen every 6 months when BP is controlled. More frequent review if uncontrolled.',
  },
  {
    condition:           'Hyperlipidemia (statin therapy)',
    inferredFrom:        ['atorvastatin', 'simvastatin', 'rosuvastatin', 'pravastatin', 'lovastatin'],
    recommendedVisitDays: 365,
    severity:            'low',
    recommendation:      'Annual review recommended for statin therapy compliance and lipid panel assessment.',
  },
];

/**
 * Polypharmacy threshold for medication review recommendation.
 * If a patient is on >= this many active medications with no visit in X days, flag it.
 */
const POLYPHARMACY_MED_COUNT    = 5;
const POLYPHARMACY_REVIEW_DAYS  = 180;

/**
 * ER visit pattern: X or more ER/hospital visits within Y days suggests
 * a care coordination gap.
 */
const FREQUENT_ER_VISITS_COUNT = 2;
const FREQUENT_ER_VISITS_DAYS  = 90;

module.exports = {
  VISIT_CADENCE_RULES,
  POLYPHARMACY_MED_COUNT,
  POLYPHARMACY_REVIEW_DAYS,
  FREQUENT_ER_VISITS_COUNT,
  FREQUENT_ER_VISITS_DAYS,
};
