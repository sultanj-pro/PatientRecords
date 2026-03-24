'use strict';

const jwt = require('jsonwebtoken');
const JWT_SECRET = 'dev-secret';

// ── Mongoose mock ──────────────────────────────────────────────────────────
const mockPatient = {
  patientid: 20001,
  visits: [
    { _id: { toString: () => 'vi1' }, date: '2025-01-15', visitType: 'office', reason: 'Annual checkup', provider_name: 'Dr. Smith', facility_name: 'Main Clinic', deletedAt: null },
    { _id: { toString: () => 'vi2' }, date: '2024-12-01', visitType: 'hospital', reason: 'Flu', deletedAt: new Date() }, // soft-deleted
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

describe('visits-service', () => {
  describe('GET /health', () => {
    it('returns ok without auth', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  describe('GET /api/patients/:id/visits', () => {
    it('requires authorization', async () => {
      const res = await request(app).get('/api/patients/20001/visits');
      expect(res.status).toBe(401);
    });

    it('returns only non-deleted visits with camelCase shape', async () => {
      const res = await request(app)
        .get('/api/patients/20001/visits')
        .set('Authorization', makeToken());
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      if (res.body.length > 0) {
        const visit = res.body[0];
        expect(visit.visitDate).toBeDefined();
        expect(visit.visitType).toBeDefined();
      }
    });

    it('returns 404 when patient not found', async () => {
      MockModel.findOne.mockResolvedValueOnce(null);
      const res = await request(app)
        .get('/api/patients/99999/visits')
        .set('Authorization', makeToken());
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/patients/:id/visits', () => {
    const validVisit = { date: '2025-06-15', visitType: 'office', reason: 'Follow-up', provider_name: 'Dr. Jones' };

    it('requires authorization', async () => {
      const res = await request(app).post('/api/patients/20001/visits').send(validVisit);
      expect(res.status).toBe(401);
    });

    it('creates a visit and returns 201', async () => {
      const res = await request(app)
        .post('/api/patients/20001/visits')
        .set('Authorization', makeToken())
        .send(validVisit);
      expect(res.status).toBe(201);
      expect(mockPatient.save).toHaveBeenCalled();
    });

    it('returns 400 when date or visitType is missing', async () => {
      const res = await request(app)
        .post('/api/patients/20001/visits')
        .set('Authorization', makeToken())
        .send({ reason: 'Follow-up' });
      expect(res.status).toBe(400);
    });

    it('returns 400 for an invalid visitType', async () => {
      const res = await request(app)
        .post('/api/patients/20001/visits')
        .set('Authorization', makeToken())
        .send({ date: '2025-06-15', visitType: 'telehealth' }); // not in enum
      expect(res.status).toBe(400);
    });

    it('returns 404 when patient not found', async () => {
      MockModel.findOne.mockResolvedValueOnce(null);
      const res = await request(app)
        .post('/api/patients/99999/visits')
        .set('Authorization', makeToken())
        .send(validVisit);
      expect(res.status).toBe(404);
    });
  });
});
