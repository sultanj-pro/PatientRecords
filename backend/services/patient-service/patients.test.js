'use strict';

const jwt = require('jsonwebtoken');
const JWT_SECRET = 'dev-secret';

// ── Mongoose mock ──────────────────────────────────────────────────────────
const mockPatient = {
  patientid: 20001,
  firstname: 'Sarah',
  lastname: 'Thompson',
  demographics: { legalName: { first: 'Sarah', last: 'Thompson' }, dateOfBirth: '1978-05-14' },
  vitals: [],
  labs: [],
  medications: [],
  visits: [],
  careTeam: [],
};

const MockModel = jest.fn();
MockModel.findOne = jest.fn().mockResolvedValue(mockPatient);
MockModel.find = jest.fn().mockReturnValue({
  select: jest.fn().mockReturnThis(),
  sort: jest.fn().mockReturnThis(),
  limit: jest.fn().mockResolvedValue([mockPatient]),
});

jest.mock('mongoose', () => ({
  connect: jest.fn().mockResolvedValue(true),
  Schema: class { constructor() { this.index = jest.fn(); } },
  model: jest.fn().mockImplementation(() => MockModel),
}));

let app;
beforeAll(() => { app = require('./server'); });

function makeToken(role = 'nurse') {
  return `Bearer ${jwt.sign({ sub: 'test', role }, JWT_SECRET, { expiresIn: 3600 })}`;
}

const request = require('supertest');

describe('patient-service', () => {
  describe('GET /health', () => {
    it('returns ok without auth', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  describe('GET /api/patients', () => {
    it('requires authorization', async () => {
      const res = await request(app).get('/api/patients');
      expect(res.status).toBe(401);
    });

    it('returns a list of patients', async () => {
      const res = await request(app)
        .get('/api/patients')
        .set('Authorization', makeToken());
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('accepts a ?q search parameter', async () => {
      const res = await request(app)
        .get('/api/patients?q=sarah')
        .set('Authorization', makeToken());
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/patients/:id', () => {
    it('requires authorization', async () => {
      const res = await request(app).get('/api/patients/20001');
      expect(res.status).toBe(401);
    });

    it('returns a patient by numeric id', async () => {
      const res = await request(app)
        .get('/api/patients/20001')
        .set('Authorization', makeToken());
      expect(res.status).toBe(200);
      expect(res.body.patientid).toBe(20001);
    });

    it('returns 404 when patient is not found', async () => {
      MockModel.findOne.mockResolvedValueOnce(null);
      const res = await request(app)
        .get('/api/patients/99999')
        .set('Authorization', makeToken());
      expect(res.status).toBe(404);
    });

    it('returns 401 for an invalid token', async () => {
      const res = await request(app)
        .get('/api/patients/20001')
        .set('Authorization', 'Bearer bad.token.here');
      expect(res.status).toBe(401);
    });
  });
});
