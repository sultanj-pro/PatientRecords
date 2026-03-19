'use strict';

const { checkInteractions }     = require('./rules/interactions');
const { checkContraindications } = require('./rules/contraindications');

// ── Pharmacological class groups for duplicate-therapy detection ────────────

const DRUG_CLASSES = [
  { class: 'ACE Inhibitor',         drugs: ['lisinopril', 'enalapril', 'ramipril', 'captopril', 'benazepril', 'perindopril', 'quinapril', 'fosinopril', 'trandolapril'] },
  { class: 'ARB',                   drugs: ['losartan', 'valsartan', 'irbesartan', 'candesartan', 'olmesartan', 'telmisartan', 'azilsartan'] },
  { class: 'Beta Blocker',          drugs: ['metoprolol', 'atenolol', 'propranolol', 'carvedilol', 'bisoprolol', 'labetalol', 'nadolol', 'timolol', 'nebivolol'] },
  { class: 'Statin',                drugs: ['atorvastatin', 'simvastatin', 'rosuvastatin', 'pravastatin', 'lovastatin', 'fluvastatin', 'pitavastatin'] },
  { class: 'SSRI',                  drugs: ['fluoxetine', 'sertraline', 'escitalopram', 'citalopram', 'paroxetine', 'fluvoxamine'] },
  { class: 'SNRI',                  drugs: ['venlafaxine', 'duloxetine', 'desvenlafaxine', 'levomilnacipran'] },
  { class: 'NSAID',                 drugs: ['ibuprofen', 'naproxen', 'celecoxib', 'diclofenac', 'indomethacin', 'meloxicam', 'ketorolac', 'piroxicam', 'etodolac'] },
  { class: 'Benzodiazepine',        drugs: ['diazepam', 'lorazepam', 'alprazolam', 'clonazepam', 'temazepam', 'triazolam', 'midazolam', 'oxazepam'] },
  { class: 'Opioid',                drugs: ['oxycodone', 'hydrocodone', 'morphine', 'codeine', 'tramadol', 'fentanyl', 'hydromorphone', 'tapentadol', 'buprenorphine'] },
  { class: 'Sulfonylurea',          drugs: ['glipizide', 'glyburide', 'glimepiride', 'glibenclamide', 'tolbutamide'] },
  { class: 'Calcium Channel Blocker', drugs: ['amlodipine', 'nifedipine', 'diltiazem', 'verapamil', 'felodipine', 'nicardipine', 'clevidipine', 'nisoldipine'] },
  { class: 'Anticoagulant',         drugs: ['warfarin', 'apixaban', 'rivaroxaban', 'dabigatran', 'edoxaban', 'heparin', 'enoxaparin'] },
  { class: 'Antiplatelet',          drugs: ['aspirin', 'clopidogrel', 'ticagrelor', 'prasugrel', 'dipyridamole'] },
  { class: 'Thiazide Diuretic',     drugs: ['hydrochlorothiazide', 'chlorthalidone', 'metolazone', 'indapamide'] },
  { class: 'Loop Diuretic',         drugs: ['furosemide', 'bumetanide', 'torsemide', 'ethacrynic acid'] },
  { class: 'Proton Pump Inhibitor', drugs: ['omeprazole', 'pantoprazole', 'esomeprazole', 'lansoprazole', 'rabeprazole', 'dexlansoprazole'] },
];

// ── Renally-cleared drugs that require dose adjustment ──────────────────────
// creatinine threshold (mg/dL) above which to flag, keyed by drug name substring
const RENAL_RISK_DRUGS = [
  { drug: 'metformin',    threshold: 1.4, note: 'Metformin is contraindicated when eGFR < 30 mL/min and should be used with caution with elevated creatinine due to risk of lactic acidosis' },
  { drug: 'gabapentin',   threshold: 1.5, note: 'Gabapentin requires significant dose reduction in renal impairment (renally excreted unchanged)' },
  { drug: 'pregabalin',   threshold: 1.5, note: 'Pregabalin dose must be adjusted based on creatinine clearance' },
  { drug: 'digoxin',      threshold: 1.5, note: 'Digoxin clearance is directly proportional to GFR; dose reduction required to avoid toxicity' },
  { drug: 'methotrexate', threshold: 1.2, note: 'Methotrexate is renally excreted; elevated creatinine increases toxicity risk — dose reduction or discontinuation needed' },
  { drug: 'allopurinol',  threshold: 1.5, note: 'Allopurinol and its active metabolite oxypurinol accumulate in renal impairment; reduce dose' },
  { drug: 'lithium',      threshold: 1.5, note: 'Lithium is renally cleared; elevated creatinine risks lithium toxicity — check lithium levels' },
  { drug: 'lisinopril',   threshold: 2.0, note: 'ACE inhibitors can worsen renal function in severe impairment; monitor creatinine and potassium closely' },
  { drug: 'enalapril',    threshold: 2.0, note: 'ACE inhibitor — monitor closely in moderate-severe renal impairment' },
  { drug: 'ciprofloxacin', threshold: 2.0, note: 'Ciprofloxacin dose reduction required in moderate renal impairment' },
  { drug: 'vancomycin',   threshold: 1.5, note: 'Vancomycin is renally excreted; dose and interval must be adjusted based on renal function' },
  { drug: 'colchicine',   threshold: 2.0, note: 'Colchicine dose reduction required in moderate renal impairment; avoid in severe impairment' },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function getActiveMedNames(medications) {
  const meds = Array.isArray(medications) ? medications
    : (medications && Array.isArray(medications.value)) ? medications.value : [];
  return meds
    .filter(m => !m.deletedAt)
    .map(m => (m.name || '').toLowerCase());
}

function getActiveMeds(medications) {
  const meds = Array.isArray(medications) ? medications
    : (medications && Array.isArray(medications.value)) ? medications.value : [];
  return meds.filter(m => !m.deletedAt);
}

function extractLabs(labs) {
  if (Array.isArray(labs)) return labs;
  if (labs && Array.isArray(labs.value)) return labs.value;
  return [];
}

function getMostRecentCreatinine(labs) {
  const creatinineLabs = labs
    .filter(l => {
      const name = (l.testName || l.test_name || '').toLowerCase();
      return name.includes('creatinine');
    })
    .sort((a, b) => {
      const dA = new Date(a.resultDate || a.date || 0);
      const dB = new Date(b.resultDate || b.date || 0);
      return dB - dA; // newest first
    });

  if (creatinineLabs.length === 0) return null;
  const val = parseFloat(creatinineLabs[0].value || creatinineLabs[0].result);
  return isNaN(val) ? null : val;
}

// ── Rules ───────────────────────────────────────────────────────────────────

function runRenalCheck(medNames, labs, patient) {
  const creatinine = getMostRecentCreatinine(extractLabs(labs));
  if (creatinine === null) return [];

  // Sex-based thresholds for elevated creatinine flag
  const gender = ((patient && patient.demographics && patient.demographics.gender) || '').toLowerCase();
  const normalUpperLimit = (gender === 'female' || gender === 'f') ? 1.1 : 1.3;
  if (creatinine <= normalUpperLimit) return [];

  const findings = [];
  for (const { drug, threshold, note } of RENAL_RISK_DRUGS) {
    if (creatinine >= threshold) {
      const matched = medNames.find(n => n.includes(drug));
      if (matched) {
        findings.push({
          type: 'renal-dose-adjustment',
          severity: creatinine >= threshold * 1.5 ? 'high' : 'moderate',
          title: `Renal Dose Adjustment: ${matched} (Creatinine ${creatinine} mg/dL)`,
          description: note,
          drugs: [matched],
          creatinine,
          recommendation: `Current creatinine: ${creatinine} mg/dL. Review dosing or consider alternative. Consult nephrology if eGFR < 30 mL/min.`,
        });
      }
    }
  }
  return findings;
}

function runDuplicateTherapyCheck(medNames) {
  const findings = [];

  for (const { class: className, drugs: classMembers } of DRUG_CLASSES) {
    const matches = medNames.filter(n => classMembers.some(d => n.includes(d)));
    if (matches.length >= 2) {
      findings.push({
        type: 'duplicate-therapy',
        severity: 'moderate',
        title: `Duplicate Therapy: Multiple ${className}s prescribed`,
        description: `Two or more drugs from the same pharmacological class (${className}) are active concurrently: ${matches.join(', ')}.`,
        drugs: matches,
        recommendation: `Review whether concurrent use is intentional. If switching agents, ensure proper transition protocol. Duplicate therapy may indicate a prescribing error.`,
      });
    }
  }

  return findings;
}

// ── Main analyzer ────────────────────────────────────────────────────────────

/**
 * Run all medication safety rules and return an array of findings.
 *
 * @param {object} payload  { medications, labs, patient }
 *   medications: array or {value: array} from medications-service
 *   labs:        array or {value: array} from labs-service
 *   patient:     full patient object (includes allergies, demographics)
 * @returns {object[]} findings
 */
function analyze(payload) {
  const { medications, labs, patient } = payload;

  const medNames  = getActiveMedNames(medications);
  const allergies = (patient && Array.isArray(patient.allergies)) ? patient.allergies : [];

  const findings = [
    ...checkInteractions(medNames),
    ...checkContraindications(medNames, allergies),
    ...runRenalCheck(medNames, labs, patient),
    ...runDuplicateTherapyCheck(medNames),
  ];

  return findings;
}

module.exports = { analyze };
