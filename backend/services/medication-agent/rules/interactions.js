'use strict';

/**
 * Clinically significant drug-drug interaction pairs.
 * Names are lowercase substrings — a medication matches if its lowercased name
 * CONTAINS the key string (e.g. "atorvastatin" contains "statin").
 * Each pair: [drugA, drugB, severity, mechanism, recommendation]
 */
const INTERACTION_PAIRS = [
  // ── Anticoagulants ────────────────────────────────────────────────────────
  ['warfarin',       'aspirin',         'high',     'Additive antiplatelet/anticoagulant effect', 'Monitor for bleeding; consider GI protection'],
  ['warfarin',       'ibuprofen',       'high',     'NSAID inhibits platelet function and may displace warfarin from protein binding', 'Avoid combination; use acetaminophen for pain'],
  ['warfarin',       'naproxen',        'high',     'NSAID increases bleeding risk with warfarin', 'Avoid combination'],
  ['warfarin',       'amiodarone',      'critical', 'Amiodarone strongly inhibits CYP2C9, markedly increasing warfarin effect', 'Reduce warfarin dose 30-50%; increase INR monitoring'],
  ['warfarin',       'fluconazole',     'critical', 'Fluconazole inhibits CYP2C9, increasing warfarin levels', 'Reduce warfarin dose; monitor INR closely'],
  ['warfarin',       'metronidazole',   'high',     'Metronidazole inhibits CYP2C9 and CYP3A4, increasing warfarin effect', 'Monitor INR closely; consider dose reduction'],
  ['warfarin',       'rifampin',        'critical', 'Rifampin strongly induces CYP enzymes, markedly reducing warfarin effect', 'Avoid combination; significant dose increase may be needed'],
  ['warfarin',       'trimethoprim',    'high',     'Trimethoprim inhibits CYP2C9, increasing warfarin levels', 'Monitor INR; may need warfarin dose reduction'],
  ['warfarin',       'clarithromycin',  'high',     'Clarithromycin inhibits CYP3A4, increasing warfarin effect', 'Monitor INR closely'],

  // ── ACE Inhibitors / ARBs ─────────────────────────────────────────────────
  ['lisinopril',     'spironolactone',  'high',     'Both increase potassium; risk of life-threatening hyperkalemia', 'Monitor serum potassium closely; use with caution'],
  ['lisinopril',     'potassium',       'high',     'ACE inhibitor + potassium supplement increases hyperkalemia risk', 'Monitor potassium levels; consider dose reduction'],
  ['lisinopril',     'trimethoprim',    'moderate', 'Both increase potassium levels', 'Monitor potassium; watch for hyperkalemia'],
  ['losartan',       'spironolactone',  'high',     'ARB + potassium-sparing diuretic risk of hyperkalemia', 'Monitor potassium closely'],
  ['lisinopril',     'nsaid',           'moderate', 'NSAIDs reduce efficacy of ACE inhibitors and can worsen renal function', 'Monitor BP and renal function'],

  // ── Statins ───────────────────────────────────────────────────────────────
  ['simvastatin',    'amiodarone',      'high',     'Amiodarone inhibits statin metabolism, increasing rhabdomyolysis risk', 'Limit simvastatin dose to 20 mg/day or switch statin'],
  ['simvastatin',    'clarithromycin',  'critical', 'Clarithromycin inhibits CYP3A4, dramatically increasing simvastatin levels', 'Suspend simvastatin during antibiotic course'],
  ['atorvastatin',   'clarithromycin',  'high',     'Clarithromycin inhibits CYP3A4, increasing atorvastatin levels and myopathy risk', 'Consider statin suspension or dose reduction during antibiotic course'],
  ['statin',         'gemfibrozil',     'high',     'Gemfibrozil inhibits statin metabolism via OATP1B1 and UGT1A1, increasing rhabdomyolysis risk', 'Avoid combination; use fenofibrate instead if needed'],

  // ── Serotonergic Agents ───────────────────────────────────────────────────
  ['fluoxetine',     'tramadol',        'high',     'Additive serotonergic effect; risk of serotonin syndrome', 'Avoid combination; monitor for serotonin syndrome symptoms'],
  ['sertraline',     'tramadol',        'high',     'Additive serotonergic effect; risk of serotonin syndrome', 'Avoid combination'],
  ['escitalopram',   'tramadol',        'high',     'Additive serotonergic effect; risk of serotonin syndrome', 'Avoid combination'],
  ['fluoxetine',     'linezolid',       'critical', 'Linezolid is a weak MAOI; combination with SSRI risks serotonin syndrome', 'Contraindicated; allow 14-day washout'],
  ['sertraline',     'linezolid',       'critical', 'Linezolid is a weak MAOI; risk of serotonin syndrome', 'Contraindicated'],

  // ── Digoxin ───────────────────────────────────────────────────────────────
  ['digoxin',        'amiodarone',      'critical', 'Amiodarone inhibits renal digoxin clearance, doubling digoxin levels', 'Reduce digoxin dose 50%; monitor digoxin levels and ECG'],
  ['digoxin',        'clarithromycin',  'high',     'Clarithromycin inhibits P-glycoprotein, increasing digoxin absorption', 'Monitor digoxin levels closely during antibiotic therapy'],

  // ── Antiplatelet / QT Prolongation ───────────────────────────────────────
  ['clopidogrel',    'omeprazole',      'moderate', 'Omeprazole inhibits CYP2C19, reducing clopidogrel activation', 'Switch to pantoprazole for gastroprotection'],
  ['clopidogrel',    'esomeprazole',    'moderate', 'Esomeprazole inhibits CYP2C19, reducing clopidogrel activation', 'Switch to pantoprazole'],
  ['amiodarone',     'azithromycin',    'high',     'Both prolong QT interval; additive risk of torsades de pointes', 'Avoid combination; use alternative antibiotic'],
  ['amiodarone',     'ciprofloxacin',   'high',     'Both prolong QT interval; additive risk of torsades de pointes', 'Monitor ECG closely or use alternative antibiotic'],

  // ── Methotrexate ─────────────────────────────────────────────────────────
  ['methotrexate',   'aspirin',         'high',     'NSAIDs reduce renal clearance of methotrexate, increasing toxicity risk', 'Avoid NSAIDs with methotrexate; monitor for toxicity'],
  ['methotrexate',   'ibuprofen',       'high',     'NSAIDs reduce renal clearance of methotrexate, increasing toxicity risk', 'Avoid combination'],
  ['methotrexate',   'trimethoprim',    'critical', 'Additive folate antagonism; risk of severe bone marrow suppression', 'Avoid combination; monitor CBC if unavoidable'],
];

/**
 * Check a list of active medication names for known drug-drug interactions.
 * @param {string[]} medNames  Lowercase active medication names
 * @returns {Array} findings
 */
function checkInteractions(medNames) {
  const findings = [];

  for (const [drugA, drugB, severity, mechanism, recommendation] of INTERACTION_PAIRS) {
    const hasA = medNames.some(n => n.includes(drugA));
    const hasB = medNames.some(n => n.includes(drugB));

    if (hasA && hasB) {
      const matchA = medNames.find(n => n.includes(drugA));
      const matchB = medNames.find(n => n.includes(drugB));
      findings.push({
        type: 'drug-interaction',
        severity,
        title: `Drug Interaction: ${matchA} + ${matchB}`,
        description: mechanism,
        drugs: [matchA, matchB],
        recommendation,
      });
    }
  }

  return findings;
}

module.exports = { checkInteractions };
