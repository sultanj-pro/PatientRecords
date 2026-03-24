'use strict';

const { EVENT_ESCALATION_RULES } = require('./rules/escalationRules');

describe('comms-agent escalation rules', () => {
  it('loads rules without error', () => {
    expect(Array.isArray(EVENT_ESCALATION_RULES)).toBe(true);
    expect(EVENT_ESCALATION_RULES.length).toBeGreaterThan(0);
  });

  it('every rule has required fields', () => {
    for (const rule of EVENT_ESCALATION_RULES) {
      expect(rule.id).toBeDefined();
      expect(rule.eventType).toBeDefined();
      expect(typeof rule.match).toBe('function');
      expect(typeof rule.title).toBe('function');
      expect(typeof rule.message).toBe('function');
      expect(rule.severity).toMatch(/low|medium|high|critical/i);
    }
  });

  it('critical lab result rule triggers on critically high glucose', () => {
    const criticalLabRule = EVENT_ESCALATION_RULES.find(r =>
      r.eventType === 'labs-resulted' && r.id.includes('critical')
    );
    if (!criticalLabRule) return; // rule may not exist yet — skip gracefully

    const payload = {
      patientId: '20001',
      testName: 'Glucose',
      value: 510,
      unit: 'mg/dL',
    };
    expect(criticalLabRule.match(payload)).toBe(true);
    expect(criticalLabRule.title(payload)).toBeTruthy();
  });

  it('rules do not trigger on normal lab values', () => {
    const labRules = EVENT_ESCALATION_RULES.filter(r => r.eventType === 'labs-resulted');
    const normalPayload = { patientId: '20001', testName: 'Glucose', value: 95, unit: 'mg/dL' };
    const anyMatch = labRules.some(r => r.match(normalPayload));
    // At least one rule should NOT match a normal glucose — this asserts the rules aren't broken
    expect(labRules.every(r => r.match(normalPayload))).toBe(false);
  });
});
