'use strict';

/**
 * Allergy substance → drugs/drug-classes to avoid.
 * Keys are lowercased allergy substance names (or substrings of them).
 * Values list lowercased drug name substrings that are contraindicated.
 */
const ALLERGY_CONTRAINDICATIONS = {
  'penicillin': {
    drugs: ['amoxicillin', 'ampicillin', 'penicillin', 'piperacillin', 'oxacillin', 'dicloxacillin', 'nafcillin'],
    severity: 'critical',
    recommendation: 'Patient has penicillin allergy. Avoid all penicillin-class antibiotics. Use cephalosporin with caution (cross-reactivity ~1-2%) or use azithromycin/doxycycline as alternatives.',
  },
  'cephalosporin': {
    drugs: ['cefazolin', 'cephalexin', 'ceftriaxone', 'cefdinir', 'cefuroxime', 'cefepime', 'ceftazidime'],
    severity: 'critical',
    recommendation: 'Patient has cephalosporin allergy. Avoid all cephalosporins. Use azithromycin, doxycycline, or consult infectious disease.',
  },
  'sulfa': {
    drugs: ['sulfamethoxazole', 'trimethoprim', 'sulfasalazine', 'dapsone', 'furosemide', 'thiazide', 'hydrochlorothiazide'],
    severity: 'high',
    recommendation: 'Patient has sulfonamide allergy. Avoid sulfonamide antibiotics. Use caution with loop diuretics and thiazides (structural similarity).',
  },
  'sulfamethoxazole': {
    drugs: ['sulfamethoxazole', 'trimethoprim'],
    severity: 'critical',
    recommendation: 'Patient has sulfa allergy — avoid trimethoprim-sulfamethoxazole.',
  },
  'aspirin': {
    drugs: ['aspirin', 'ibuprofen', 'naproxen', 'celecoxib', 'diclofenac', 'indomethacin', 'meloxicam', 'ketorolac', 'piroxicam'],
    severity: 'high',
    recommendation: 'Patient has aspirin/NSAID hypersensitivity. Avoid all NSAIDs. Use acetaminophen for pain relief.',
  },
  'nsaid': {
    drugs: ['ibuprofen', 'naproxen', 'celecoxib', 'diclofenac', 'indomethacin', 'meloxicam', 'ketorolac', 'aspirin'],
    severity: 'high',
    recommendation: 'Patient has NSAID allergy. Avoid all NSAIDs. Use acetaminophen as alternative.',
  },
  'ibuprofen': {
    drugs: ['ibuprofen', 'naproxen', 'celecoxib', 'diclofenac', 'aspirin'],
    severity: 'high',
    recommendation: 'Patient has ibuprofen allergy. Avoid all NSAIDs.',
  },
  'codeine': {
    drugs: ['codeine', 'tramadol'],
    severity: 'high',
    recommendation: 'Patient has codeine allergy. Avoid codeine and tramadol (cross-reactivity possible). Use oxycodone or hydromorphone as alternatives.',
  },
  'morphine': {
    drugs: ['morphine', 'codeine', 'hydromorphone', 'oxycodone', 'hydrocodone'],
    severity: 'high',
    recommendation: 'Patient has morphine allergy. Use fentanyl (different structure) cautiously and only if clinical need outweighs risk.',
  },
  'latex': {
    drugs: [],
    severity: 'moderate',
    recommendation: 'Latex allergy noted — ensure latex-free equipment during procedures. No direct drug contraindications.',
  },
  'contrast': {
    drugs: [],
    severity: 'moderate',
    recommendation: 'Contrast dye allergy noted — premedicate with corticosteroids and antihistamines before any contrast procedures.',
  },
  'metformin': {
    drugs: ['metformin'],
    severity: 'high',
    recommendation: 'Patient has documented metformin intolerance/allergy. Use alternative antidiabetic agent.',
  },
  'lisinopril': {
    drugs: ['lisinopril', 'enalapril', 'ramipril', 'captopril', 'benazepril', 'perindopril', 'quinapril', 'fosinopril', 'trandolapril'],
    severity: 'critical',
    recommendation: 'Patient has ACE inhibitor allergy. Avoid all ACE inhibitors. Consider ARB (e.g., losartan) as alternative if clinically appropriate.',
  },
  'ace inhibitor': {
    drugs: ['lisinopril', 'enalapril', 'ramipril', 'captopril', 'benazepril', 'perindopril', 'quinapril', 'fosinopril', 'trandolapril'],
    severity: 'critical',
    recommendation: 'Patient has ACE inhibitor allergy. Avoid all ACE inhibitors. Consider ARB as alternative.',
  },
  'enalapril': {
    drugs: ['lisinopril', 'enalapril', 'ramipril', 'captopril', 'benazepril', 'perindopril', 'quinapril', 'fosinopril', 'trandolapril'],
    severity: 'critical',
    recommendation: 'Patient has ACE inhibitor allergy. Avoid all ACE inhibitors.',
  },
  'warfarin': {
    drugs: ['warfarin'],
    severity: 'critical',
    recommendation: 'Patient has documented warfarin allergy/intolerance. Use alternative anticoagulant (e.g., DOAC).',
  },
  'metoprolol': {
    drugs: ['metoprolol', 'atenolol', 'propranolol', 'carvedilol', 'bisoprolol', 'labetalol', 'nebivolol'],
    severity: 'high',
    recommendation: 'Patient has beta blocker allergy. Avoid all beta blockers. Use alternative antihypertensive.',
  },
  'atorvastatin': {
    drugs: ['atorvastatin', 'simvastatin', 'rosuvastatin', 'pravastatin', 'lovastatin', 'fluvastatin', 'pitavastatin'],
    severity: 'high',
    recommendation: 'Patient has statin allergy/intolerance. Avoid statin therapy or use alternative lipid-lowering agent.',
  },
  'statin': {
    drugs: ['atorvastatin', 'simvastatin', 'rosuvastatin', 'pravastatin', 'lovastatin', 'fluvastatin', 'pitavastatin'],
    severity: 'high',
    recommendation: 'Patient has statin allergy/intolerance. Avoid statin therapy.',
  },
};

/**
 * Check active medications against documented patient allergies.
 * @param {string[]}  medNames   Lowercase active medication names
 * @param {object[]}  allergies  Patient allergy array [{substance, type, severity, reaction}]
 * @returns {Array} findings
 */
function checkContraindications(medNames, allergies) {
  if (!Array.isArray(allergies) || allergies.length === 0) return [];

  const findings = [];
  // Track (allergen, drug) pairs already reported to avoid duplicate findings
  const seen = new Set();

  for (const allergy of allergies) {
    const substance = (allergy.substance || '').toLowerCase();

    // ── Direct match: patient is allergic to a drug they are actively taking ──
    const directMatches = medNames.filter(n => n.includes(substance) || substance.includes(n));
    for (const drug of directMatches) {
      const key = `${substance}|${drug}`;
      if (!seen.has(key)) {
        seen.add(key);
        findings.push({
          type: 'allergy-contraindication',
          severity: 'critical',
          title: `Allergy Contraindication: ${allergy.substance} allergy — patient is taking ${drug}`,
          description: `Patient has documented allergy to ${allergy.substance} (reaction: ${allergy.reaction || 'unknown'}) and is currently prescribed ${drug}.`,
          drugs: [drug],
          allergen: allergy.substance,
          recommendation: `Discontinue ${drug} immediately. Patient has a documented allergy to this medication. Consult prescribing clinician for a safe alternative.`,
        });
      }
    }

    // ── Table-based class/cross-reactivity check ──────────────────────────────
    for (const [allergyKey, config] of Object.entries(ALLERGY_CONTRAINDICATIONS)) {
      if (!substance.includes(allergyKey)) continue;

      const conflicting = medNames.filter(n =>
        config.drugs.some(d => n.includes(d))
      );

      for (const drug of conflicting) {
        const key = `${substance}|${drug}`;
        if (!seen.has(key)) {
          seen.add(key);
          findings.push({
            type: 'allergy-contraindication',
            severity: config.severity,
            title: `Allergy Contraindication: ${allergy.substance} allergy vs. ${drug}`,
            description: `Patient has documented ${allergy.substance} allergy (reaction: ${allergy.reaction || 'unknown'}). Currently prescribed: ${drug}.`,
            drugs: [drug],
            allergen: allergy.substance,
            recommendation: config.recommendation,
          });
        }
      }
    }
  }

  return findings;
}

module.exports = { checkContraindications };
