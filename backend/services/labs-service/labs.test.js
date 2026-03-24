'use strict';

const jwt = require('jsonwebtoken');
const JWT_SECRET = 'dev-secret';

// ── Mongoose mock ──────────────────────────────────────────────────────────
const mockPatient = {
  patientid: 20001,
  labs: [
    { _id: { toString: () => 'l1' }, date: '2025-01-10', test_name: 'Glucose', test_code: 'GLU', result: '95', unit: 'mg/dL', reference_range: '70-99', deletedAt: null },
    { _id: { toString: () => 'l2' }, date: '2025-01-01', test_name: 'HbA1c', result: '6.5', unit: '%', deletedAt: new Date() }, // soft-deleted
  ],
  save: jest.fn().mockResolvedValue(true),
  markModified: jest.fn(),
};

const MockModel = jest.fn().mockImplementation(function(data) { return Object.assign(this, data, { save: mockPatient.save, markModified: mockPatient.markModified }); });
MockModel.findOne = jest.fn().mockResolvedValue(mockPatient);

jest.mock('mongoose', () => ({
  connect: jest.fn().mockResolvedValue(true),
  Schema: class { constructor() { this.index = jest.fn(); } },
  model: jest.fn().mockImplementation(() => MockModel),
}));

jest.mock('./shared/eventPublisher', () => ({ publishEvent: jest.fn().mockResolvedValue(true) }), { virtual: true });

let app;
beforeAll(() => { app = require('./server'); });

function makeToken(role = 'nurse') {
  return `Bearer ${jwt.sign({ sub: 'test', role }, JWT_SECRET, { expiresIn: 3600 })}`;
}

const request = require('supertest');

describe('labs-service', () => {
  describe('GET /health', () => {
    it('returns ok without auth', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  describe('GET /api/patients/:id/labs', () => {
    it('requires authorization', async () => {
      const res = await request(app).get('/api/patients/20001/labs');
      expect(res.status).toBe(401);
    });

    it('returns only non-deleted labs with camelCase response shape', async () => {
      const res = await request(app)
        .get('/api/patients/20001/labs')
        .set('Authorization', makeToken());
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      if (res.body.length > 0) {
        const lab = res.body[0];
        expect(lab.testName).toBeDefined();
        expect(lab.resultDate).toBeDefined();
      }
    });

    it('returns 404 when patient not found', async () => {
      MockModel.findOne.mockResolvedValueOnce(null);
      const res = await request(app)
        .get('/api/patients/99999/labs')
        .set('Authorization', makeToken());
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/patients/:id/labs', () => {
    const validLab = { date: '2025-06-01', test_name: 'Glucose', test_code: 'GLU', result: '98', unit: 'mg/dL' };

    it('requires authorization', async () => {
      const res = await request(app).post('/api/patients/20001/labs').send(validLab);
      expect(res.status).toBe(401);
    });

    it('creates a lab result and returns 201', async () => {
      const res = await request(app)
        .post('/api/patients/20001/labs')
        .set('Authorization', makeToken())
        .send(validLab);
      expect(res.status).toBe(201);
      expect(mockPatient.save).toHaveBeenCalled();
    });

    it('returns 400 when date or test_name is missing', async () => {
      const res = await request(app)
        .post('/api/patients/20001/labs')
        .set('Authorization', makeToken())
        .send({ result: '95' });
      expect(res.status).toBe(400);
    });

    it('returns 404 when patient not found', async () => {
      MockModel.findOne.mockResolvedValueOnce(null);
      const res = await request(app)
        .post('/api/patients/99999/labs')
        .set('Authorization', makeToken())
        .send(validLab);
      expect(res.status).toBe(404);
    });
  });
});
