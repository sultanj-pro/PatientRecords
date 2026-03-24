'use strict';

const { analyze } = require('./analyzer');

// Helpers to build test fixtures
const makePatient = (overrides = {}) => ({ patientId: '20001', ...overrides });

const makeMed = (name, overrides = {}) => ({
  name,
  medicationName: name,
  startDate: '2025-01-01',
  ...overrides,
});

const makeLab = (testName, value, unit = '', overrides = {}) => ({
  testName,
  value: String(value),
  unit,
  resultDate: new Date().toISOString(),
  ...overrides,
});

describe('medication-agent analyzer', () => {
  describe('drug-drug interactions', () => {
    it('flags warfarin + aspirin interaction', () => {
      const findings = analyze({
        medications: [makeMed('warfarin'), makeMed('aspirin')],
        labs: [],
        patient: makePatient(),
      });
      const interaction = findings.find(f => f.type === 'drug-interaction');
      expect(interaction).toBeDefined();
      expect(interaction.severity).toMatch(/high|critical/i);
    });

    it('returns no interaction for unrelated medications', () => {
      const findings = analyze({
        medications: [makeMed('lisinopril'), makeMed('atorvastatin')],
        labs: [],
        patient: makePatient(),
      });
      const interactions = findings.filter(f => f.type === 'drug-interaction');
      expect(interactions.length).toBe(0);
    });
  });

  describe('renal dose adjustment', () => {
    it('flags metformin when creatinine is elevated', () => {
      const findings = analyze({
        medications: [makeMed('metformin')],
        labs: [makeLab('Creatinine', 2.1, 'mg/dL')],
        patient: makePatient(),
      });
      const flag = findings.find(f => f.type === 'renal-dose-adjustment');
      expect(flag).toBeDefined();
    });

    it('does not flag metformin when creatinine is normal', () => {
      const findings = analyze({
        medications: [makeMed('metformin')],
        labs: [makeLab('Creatinine', 0.9, 'mg/dL')],
        patient: makePatient(),
      });
      const flag = findings.find(f => f.type === 'renal-dose-adjustment');
      expect(flag).toBeUndefined();
    });
  });

  describe('duplicate therapy', () => {
    it('flags two statins prescribed together', () => {
      const findings = analyze({
        medications: [makeMed('atorvastatin'), makeMed('simvastatin')],
        labs: [],
        patient: makePatient(),
      });
      const dup = findings.find(f => f.type === 'duplicate-therapy');
      expect(dup).toBeDefined();
    });
  });

  describe('allergy contraindication', () => {
    it('flags penicillin when patient has penicillin allergy', () => {
      const findings = analyze({
        medications: [makeMed('amoxicillin')],
        labs: [],
        patient: makePatient({ allergies: [{ substance: 'penicillin', severity: 'severe' }] }),
      });
      const flag = findings.find(f => f.type === 'allergy-contraindication');
      expect(flag).toBeDefined();
    });
  });

  describe('empty inputs', () => {
    it('returns empty findings when no medications', () => {
      const findings = analyze({ medications: [], labs: [], patient: makePatient() });
      expect(findings).toEqual([]);
    });

    it('handles null/undefined gracefully', () => {
      expect(() => analyze({ medications: null, labs: null, patient: null })).not.toThrow();
    });
  });
});
