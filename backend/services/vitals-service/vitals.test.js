'use strict';

const jwt = require('jsonwebtoken');
const JWT_SECRET = 'dev-secret';

// ── Mongoose mock ──────────────────────────────────────────────────────────
const mockPatient = {
  patientid: 20001,
  vitals: [
    { _id: { toString: () => 'v1' }, dateofobservation: '2025-01-01', vital_description: 'systolic', unit: 'mmHg', value: '120', deletedAt: null },
    { _id: { toString: () => 'v2' }, dateofobservation: '2024-12-01', vital_description: 'diastolic', unit: 'mmHg', value: '80', deletedAt: new Date() }, // soft-deleted
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

// ── Load app after mocks ───────────────────────────────────────────────────
let app;
beforeAll(() => {
  app = require('./server'); // server exports or we grab the express instance
});

function makeToken(role = 'nurse') {
  return `Bearer ${jwt.sign({ sub: 'test', role }, JWT_SECRET, { expiresIn: 3600 })}`;
}

const request = require('supertest');

describe('vitals-service', () => {
  describe('GET /health', () => {
    it('returns ok without auth', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  describe('GET /api/patients/:id/vitals', () => {
    it('requires authorization', async () => {
      const res = await request(app).get('/api/patients/20001/vitals');
      expect(res.status).toBe(401);
    });

    it('returns only non-deleted vitals', async () => {
      const res = await request(app)
        .get('/api/patients/20001/vitals')
        .set('Authorization', makeToken());
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      const allActive = res.body.every(v => !v.deletedAt);
      expect(allActive).toBe(true);
    });

    it('returns 404 when patient not found', async () => {
      MockModel.findOne.mockResolvedValueOnce(null);
      const res = await request(app)
        .get('/api/patients/99999/vitals')
        .set('Authorization', makeToken());
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/patients/:id/vitals', () => {
    const validVital = {
      dateofobservation: '2025-06-01',
      vital_description: 'systolic',
      value: '118',
      unit: 'mmHg',
    };

    it('requires authorization', async () => {
      const res = await request(app).post('/api/patients/20001/vitals').send(validVital);
      expect(res.status).toBe(401);
    });

    it('creates a vital and returns 201', async () => {
      const res = await request(app)
        .post('/api/patients/20001/vitals')
        .set('Authorization', makeToken())
        .send(validVital);
      expect(res.status).toBe(201);
      expect(mockPatient.save).toHaveBeenCalled();
    });

    it('returns 400 when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/patients/20001/vitals')
        .set('Authorization', makeToken())
        .send({ value: '120' }); // missing dateofobservation and vital_description
      expect(res.status).toBe(400);
    });

    it('returns 404 when patient not found', async () => {
      MockModel.findOne.mockResolvedValueOnce(null);
      const res = await request(app)
        .post('/api/patients/99999/vitals')
        .set('Authorization', makeToken())
        .send(validVital);
      expect(res.status).toBe(404);
    });
  });
});
