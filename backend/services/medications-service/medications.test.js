'use strict';

const jwt = require('jsonwebtoken');
const JWT_SECRET = 'dev-secret';

// ── Mongoose mock ──────────────────────────────────────────────────────────
const mockPatient = {
  patientid: 20001,
  medications: [
    { _id: { toString: () => 'm1' }, name: 'lisinopril', dose: '10mg', frequency: 'daily', startDate: '2025-01-01', deletedAt: null },
    { _id: { toString: () => 'm2' }, name: 'metformin', deletedAt: new Date() }, // soft-deleted
  ],
  save: jest.fn().mockResolvedValue(true),
  markModified: jest.fn(),
};

const MockModel = jest.fn().mockImplementation(function(data) { return Object.assign(this, data, { save: mockPatient.save }); });
MockModel.findOne = jest.fn().mockResolvedValue(mockPatient);

jest.mock('mongoose', () => ({
  connect: jest.fn().mockResolvedValue(true),
  Schema: class { constructor() { this.index = jest.fn(); } },
  model: jest.fn().mockImplementation(() => MockModel),
}));

jest.mock('./shared/eventPublisher', () => ({ publishEvent: jest.fn().mockResolvedValue(true) }));

let app;
beforeAll(() => { app = require('./server'); });

function makeToken(role = 'nurse') {
  return `Bearer ${jwt.sign({ sub: 'test', role }, JWT_SECRET, { expiresIn: 3600 })}`;
}

const request = require('supertest');

describe('medications-service', () => {
  describe('GET /health', () => {
    it('returns ok without auth', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  describe('GET /api/patients/:id/medications', () => {
    it('requires authorization', async () => {
      const res = await request(app).get('/api/patients/20001/medications');
      expect(res.status).toBe(401);
    });

    it('returns only non-deleted medications', async () => {
      const res = await request(app)
        .get('/api/patients/20001/medications')
        .set('Authorization', makeToken());
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.every(m => !m.deletedAt)).toBe(true);
    });

    it('returns 404 when patient not found', async () => {
      MockModel.findOne.mockResolvedValueOnce(null);
      const res = await request(app)
        .get('/api/patients/99999/medications')
        .set('Authorization', makeToken());
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/patients/:id/meds (alias)', () => {
    it('returns same data as /medications', async () => {
      const res = await request(app)
        .get('/api/patients/20001/meds')
        .set('Authorization', makeToken());
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /api/patients/:id/medications', () => {
    const validMed = { name: 'atorvastatin', dose: '20mg', frequency: 'nightly', startDate: '2025-06-01' };

    it('requires authorization', async () => {
      const res = await request(app).post('/api/patients/20001/medications').send(validMed);
      expect(res.status).toBe(401);
    });

    it('creates a medication and returns 201', async () => {
      const res = await request(app)
        .post('/api/patients/20001/medications')
        .set('Authorization', makeToken())
        .send(validMed);
      expect(res.status).toBe(201);
      expect(mockPatient.save).toHaveBeenCalled();
    });

    it('returns 400 when name is missing', async () => {
      const res = await request(app)
        .post('/api/patients/20001/medications')
        .set('Authorization', makeToken())
        .send({ dose: '10mg' });
      expect(res.status).toBe(400);
    });

    it('returns 404 when patient not found', async () => {
      MockModel.findOne.mockResolvedValueOnce(null);
      const res = await request(app)
        .post('/api/patients/99999/medications')
        .set('Authorization', makeToken())
        .send(validMed);
      expect(res.status).toBe(404);
    });
  });
});
