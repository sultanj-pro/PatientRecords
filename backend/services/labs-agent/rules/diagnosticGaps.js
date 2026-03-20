'use strict';

/**
 * Condition → required baseline labs mapping.
 * Keys are lowercased substrings of medication indication or visit reason.
 * Conditions can also be inferred from the medications list (e.g. Metformin → diabetes).
 *
 * Each entry: { condition, labs: [{ name, testNameSubstring, maxAgeDays }] }
 */
const CONDITION_LAB_MAP = [
  {
    condition: 'Type 2 Diabetes',
    inferredFrom: ['metformin', 'glipizide', 'glyburide', 'glimepiride', 'insulin', 'sitagliptin', 'empagliflozin', 'liraglutide'],
    labs: [
      { name: 'Hemoglobin A1C',      testNameSubstring: 'a1c',         maxAgeDays: 90  },
      { name: 'Fasting Glucose',     testNameSubstring: 'glucose',     maxAgeDays: 90  },
      { name: 'Creatinine',          testNameSubstring: 'creatinine',  maxAgeDays: 180 },
      { name: 'Urine Albumin/Creatinine', testNameSubstring: 'albumin', maxAgeDays: 365 },
      { name: 'Lipid Panel',         testNameSubstring: 'cholesterol', maxAgeDays: 365 },
    ],
  },
  {
    condition: 'Hypertension',
    inferredFrom: ['lisinopril', 'losartan', 'amlodipine', 'metoprolol', 'atenolol', 'hydrochlorothiazide', 'valsartan', 'carvedilol'],
    labs: [
      { name: 'Basic Metabolic Panel', testNameSubstring: 'potassium',   maxAgeDays: 180 },
      { name: 'Creatinine',            testNameSubstring: 'creatinine',  maxAgeDays: 180 },
      { name: 'Lipid Panel',           testNameSubstring: 'cholesterol', maxAgeDays: 365 },
    ],
  },
  {
    condition: 'Hyperlipidemia',
    inferredFrom: ['atorvastatin', 'simvastatin', 'rosuvastatin', 'pravastatin', 'lovastatin', 'fenofibrate', 'gemfibrozil'],
    labs: [
      { name: 'Lipid Panel',    testNameSubstring: 'cholesterol', maxAgeDays: 365 },
      { name: 'Liver Function', testNameSubstring: 'alt',         maxAgeDays: 365 },
      { name: 'CK (Creatine Kinase)', testNameSubstring: 'creatine kinase', maxAgeDays: 365 },
    ],
  },
  {
    condition: 'Hypothyroidism',
    inferredFrom: ['levothyroxine', 'synthroid', 'liothyronine'],
    labs: [
      { name: 'TSH', testNameSubstring: 'tsh', maxAgeDays: 180 },
      { name: 'Free T4', testNameSubstring: 't4',  maxAgeDays: 365 },
    ],
  },
  {
    condition: 'Heart Failure',
    inferredFrom: ['furosemide', 'bumetanide', 'spironolactone', 'digoxin', 'sacubitril'],
    labs: [
      { name: 'BNP or NT-proBNP',    testNameSubstring: 'bnp',         maxAgeDays: 90  },
      { name: 'Basic Metabolic Panel', testNameSubstring: 'potassium',  maxAgeDays: 90  },
      { name: 'Creatinine',           testNameSubstring: 'creatinine',  maxAgeDays: 90  },
    ],
  },
  {
    condition: 'Atrial Fibrillation',
    inferredFrom: ['warfarin', 'apixaban', 'rivaroxaban', 'dabigatran', 'amiodarone'],
    labs: [
      { name: 'INR / PT',   testNameSubstring: 'inr',       maxAgeDays: 30  },
      { name: 'TSH',        testNameSubstring: 'tsh',        maxAgeDays: 365 },
      { name: 'Creatinine', testNameSubstring: 'creatinine', maxAgeDays: 180 },
    ],
  },
  {
    condition: 'Chronic Kidney Disease',
    inferredFrom: ['creatinine', 'nephrology'],
    labs: [
      { name: 'Creatinine / eGFR',   testNameSubstring: 'creatinine',  maxAgeDays: 90  },
      { name: 'Potassium',           testNameSubstring: 'potassium',   maxAgeDays: 90  },
      { name: 'Hemoglobin',          testNameSubstring: 'hemoglobin',  maxAgeDays: 180 },
      { name: 'Phosphorus',          testNameSubstring: 'phosphorus',  maxAgeDays: 180 },
    ],
  },
  {
    condition: 'COPD / Asthma',
    inferredFrom: ['albuterol', 'tiotropium', 'fluticasone', 'salmeterol', 'montelukast', 'budesonide', 'ipratropium'],
    labs: [
      { name: 'CBC',         testNameSubstring: 'blood count', maxAgeDays: 365 },
      { name: 'Potassium',   testNameSubstring: 'potassium',   maxAgeDays: 180 },
    ],
  },
  {
    condition: 'Rheumatoid Arthritis / Autoimmune',
    inferredFrom: ['methotrexate', 'hydroxychloroquine', 'leflunomide', 'adalimumab', 'etanercept', 'rituximab'],
    labs: [
      { name: 'CBC',          testNameSubstring: 'blood count',    maxAgeDays: 90  },
      { name: 'Liver Function', testNameSubstring: 'alt',          maxAgeDays: 90  },
      { name: 'Creatinine',   testNameSubstring: 'creatinine',     maxAgeDays: 90  },
      { name: 'CRP / ESR',    testNameSubstring: 'crp',            maxAgeDays: 180 },
    ],
  },
];

const STALE_LAB_THRESHOLDS = [
  { testNameSubstring: 'a1c',          maxAgeDays: 90,  name: 'Hemoglobin A1C'       },
  { testNameSubstring: 'glucose',      maxAgeDays: 90,  name: 'Fasting Glucose'       },
  { testNameSubstring: 'creatinine',   maxAgeDays: 180, name: 'Creatinine'            },
  { testNameSubstring: 'cholesterol',  maxAgeDays: 365, name: 'Lipid Panel'           },
  { testNameSubstring: 'tsh',          maxAgeDays: 180, name: 'TSH'                   },
  { testNameSubstring: 'inr',          maxAgeDays: 30,  name: 'INR'                   },
  { testNameSubstring: 'potassium',    maxAgeDays: 90,  name: 'Basic Metabolic Panel' },
  { testNameSubstring: 'alt',          maxAgeDays: 365, name: 'Liver Function Tests'  },
  { testNameSubstring: 'blood count',  maxAgeDays: 365, name: 'Complete Blood Count'  },
  { testNameSubstring: 'hemoglobin',   maxAgeDays: 365, name: 'CBC / Hemoglobin'      },
];

module.exports = { CONDITION_LAB_MAP, STALE_LAB_THRESHOLDS };
