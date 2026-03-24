'use strict';

const { analyze } = require('./analyzer');

const makeLab = (testName, value, unit = '', daysAgo = 10, overrides = {}) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return { testName, value: String(value), unit, resultDate: d.toISOString(), ...overrides };
};

const makeVital = (vital_description, value, overrides = {}) => ({
  vital_description, value: String(value), ...overrides,
});

const makeMed = (name) => ({ name, medicationName: name });

describe('labs-agent analyzer', () => {
  describe('critical values', () => {
    it('flags critically low glucose', () => {
      const findings = analyze({
        labs: [makeLab('Glucose', 40, 'mg/dL')],
        vitals: [], medications: [], patient: {},
      });
      const f = findings.find(f => f.type === 'critical-value');
      expect(f).toBeDefined();
      expect(f.severity).toBe('critical');
    });

    it('flags critically high potassium', () => {
      const findings = analyze({
        labs: [makeLab('Potassium', 7.0, 'mEq/L')],
        vitals: [], medications: [], patient: {},
      });
      expect(findings.find(f => f.type === 'critical-value')).toBeDefined();
    });

    it('does not flag normal potassium', () => {
      const findings = analyze({
        labs: [makeLab('Potassium', 4.0, 'mEq/L')],
        vitals: [], medications: [], patient: {},
      });
      expect(findings.find(f => f.type === 'critical-value')).toBeUndefined();
    });
  });

  describe('missing baseline labs', () => {
    it('flags missing A1C for a patient on metformin', () => {
      const findings = analyze({
        labs: [],
        vitals: [],
        medications: [makeMed('metformin')],
        patient: {},
      });
      const f = findings.find(f => f.type === 'missing-baseline-lab' && f.labName.toLowerCase().includes('a1c'));
      expect(f).toBeDefined();
    });

    it('does not flag A1C when recent result exists', () => {
      const findings = analyze({
        labs: [makeLab('Hemoglobin A1C', 6.8, '%', 30)],
        vitals: [],
        medications: [makeMed('metformin')],
        patient: {},
      });
      const f = findings.find(f => f.type === 'missing-baseline-lab' && f.labName.toLowerCase().includes('a1c'));
      expect(f).toBeUndefined();
    });
  });

  describe('stale labs', () => {
    it('flags an A1C older than 90 days', () => {
      const findings = analyze({
        labs: [makeLab('Hemoglobin A1C', 7.2, '%', 120)],
        vitals: [],
        medications: [makeMed('metformin')],
        patient: {},
      });
      const f = findings.find(f => f.type === 'stale-lab');
      expect(f).toBeDefined();
    });
  });

  describe('deterioration trend', () => {
    it('flags rising creatinine trend', () => {
      const old = makeLab('Creatinine', 1.0, 'mg/dL', 60);
      const recent = makeLab('Creatinine', 1.8, 'mg/dL', 5);
      const findings = analyze({ labs: [recent, old], vitals: [], medications: [], patient: {} });
      const f = findings.find(f => f.type === 'deterioration-trend');
      expect(f).toBeDefined();
      expect(f.severity).toBe('high');
    });
  });

  describe('vital-triggered labs', () => {
    it('flags missing CMP when systolic BP >= 160', () => {
      const findings = analyze({
        labs: [],
        vitals: [makeVital('systolic', 165)],
        medications: [],
        patient: {},
      });
      const f = findings.find(f => f.type === 'vital-triggered-lab');
      expect(f).toBeDefined();
    });
  });

  describe('empty inputs', () => {
    it('returns empty findings for empty inputs', () => {
      const findings = analyze({ labs: [], vitals: [], medications: [], patient: {} });
      expect(findings).toEqual([]);
    });

    it('handles null gracefully', () => {
      expect(() => analyze({ labs: null, vitals: null, medications: null, patient: null })).not.toThrow();
    });
  });
});
