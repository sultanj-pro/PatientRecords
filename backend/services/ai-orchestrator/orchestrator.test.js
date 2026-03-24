'use strict';

const { createRecommendation, getRecommendations, setStatus } = require('./approvalStore');

// Mock mongoose to avoid needing a live DB in unit tests
jest.mock('mongoose', () => {
  const mockDoc = {
    _id: 'mock-id-123',
    patientId: '20001',
    context: {},
    findings: [],
    status: 'pending',
    requiresApproval: true,
    llmSummary: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    save: jest.fn().mockResolvedValue(true),
    toObject: jest.fn().mockReturnValue({
      _id: 'mock-id-123', patientId: '20001', status: 'pending', findings: [],
    }),
  };

  class MockModel {
    constructor(data) { Object.assign(this, data, { save: mockDoc.save, toObject: mockDoc.toObject }); }
    static findById = jest.fn().mockResolvedValue(mockDoc);
    static findOne = jest.fn().mockResolvedValue(mockDoc);
    static find = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([mockDoc.toObject()]),
      }),
    });
  }

  return {
    connect: jest.fn().mockResolvedValue(true),
    Schema: class {
      constructor() { this.pre = jest.fn(); }
      static Types = { Mixed: Object };
    },
    model: jest.fn().mockReturnValue(MockModel),
  };
});

describe('ai-orchestrator approvalStore', () => {
  const patientId = '20001';
  const context = { patient: { firstName: 'Sarah' }, vitals: [], labs: [], medications: [], visits: [] };
  const findings = [{ type: 'drug-interaction', severity: 'high', title: 'Test Finding' }];

  describe('createRecommendation', () => {
    it('creates a recommendation record with pending status', async () => {
      const rec = await createRecommendation(patientId, context, findings, null);
      expect(rec).toBeDefined();
    });
  });

  describe('getRecommendations', () => {
    it('returns recommendations for a patient', async () => {
      const recs = await getRecommendations(patientId);
      expect(Array.isArray(recs)).toBe(true);
    });
  });

  describe('setStatus', () => {
    it('approves a pending recommendation', async () => {
      const rec = await setStatus('mock-id-123', 'approved');
      expect(rec).toBeDefined();
    });

    it('throws when trying to approve an already-approved recommendation', async () => {
      const mongoose = require('mongoose');
      const Model = mongoose.model();
      // Mock findById to return a doc that is already approved (immutable state)
      Model.findById.mockResolvedValueOnce({
        _id: 'mock-id-123',
        patientId: '20001',
        status: 'approved',
        findings: [],
        save: jest.fn(),
      });
      // Status transitions are enforced — re-approving should be rejected
      await expect(setStatus('mock-id-123', 'approved')).rejects.toMatchObject({ code: 'IMMUTABLE_STATUS' });
    });
  });
});
