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

  for (const allergy of allergies) {
    const substance = (allergy.substance || '').toLowerCase();

    for (const [allergyKey, config] of Object.entries(ALLERGY_CONTRAINDICATIONS)) {
      if (!substance.includes(allergyKey)) continue;

      const conflicting = medNames.filter(n =>
        config.drugs.some(d => n.includes(d))
      );

      if (conflicting.length > 0) {
        findings.push({
          type: 'allergy-contraindication',
          severity: config.severity,
          title: `Allergy Contraindication: ${allergy.substance} allergy vs. ${conflicting.join(', ')}`,
          description: `Patient has documented ${allergy.substance} allergy (reaction: ${allergy.reaction || 'unknown'}). Currently prescribed: ${conflicting.join(', ')}.`,
          drugs: conflicting,
          allergen: allergy.substance,
          recommendation: config.recommendation,
        });
      }
    }
  }

  return findings;
}

module.exports = { checkContraindications };
