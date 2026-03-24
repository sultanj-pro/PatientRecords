'use strict';

const jwt = require('jsonwebtoken');
const JWT_SECRET = 'dev-secret';

// ── Mongoose mock ──────────────────────────────────────────────────────────
const mockMemberId = '64a1b2c3d4e5f6a7b8c9d0e1';
const mockPatient = {
  patientid: 20001,
  careTeam: [
    { _id: { toString: () => mockMemberId }, name: 'Dr. Rivera', role: 'Primary Care Physician', specialty: 'Internal Medicine', isPrimary: true, deletedAt: null },
    { _id: { toString: () => 'deleted-id' }, name: 'Old PCP', role: 'Physician', deletedAt: new Date() }, // soft-deleted
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

jest.mock('./shared/eventPublisher', () => ({ publishEvent: jest.fn().mockResolvedValue(true) }));

let app;
beforeAll(() => { app = require('./server'); });

function makeToken(role = 'nurse') {
  return `Bearer ${jwt.sign({ sub: 'test', role }, JWT_SECRET, { expiresIn: 3600 })}`;
}

const request = require('supertest');

describe('care-team-service', () => {
  describe('GET /health', () => {
    it('returns ok without auth', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  describe('GET /api/patients/:id/care-team', () => {
    it('requires authorization', async () => {
      const res = await request(app).get('/api/patients/20001/care-team');
      expect(res.status).toBe(401);
    });

    it('returns only non-deleted members with mapped shape', async () => {
      const res = await request(app)
        .get('/api/patients/20001/care-team')
        .set('Authorization', makeToken());
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      if (res.body.length > 0) {
        const member = res.body[0];
        expect(member.name).toBeDefined();
        expect(member.role).toBeDefined();
        expect(member.deletedAt).toBeUndefined(); // should not leak deletedAt
      }
    });

    it('returns 404 when patient not found', async () => {
      MockModel.findOne.mockResolvedValueOnce(null);
      const res = await request(app)
        .get('/api/patients/99999/care-team')
        .set('Authorization', makeToken());
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/patients/:id/care-team', () => {
    const validMember = { name: 'Dr. Chen', role: 'Cardiologist', specialty: 'Cardiology', isPrimary: false };

    it('requires authorization', async () => {
      const res = await request(app).post('/api/patients/20001/care-team').send(validMember);
      expect(res.status).toBe(401);
    });

    it('creates a care team member and returns 201', async () => {
      const res = await request(app)
        .post('/api/patients/20001/care-team')
        .set('Authorization', makeToken())
        .send(validMember);
      expect(res.status).toBe(201);
      expect(mockPatient.save).toHaveBeenCalled();
    });

    it('returns 400 when name or role is missing', async () => {
      const res = await request(app)
        .post('/api/patients/20001/care-team')
        .set('Authorization', makeToken())
        .send({ specialty: 'Cardiology' });
      expect(res.status).toBe(400);
    });

    it('returns 404 when patient not found', async () => {
      MockModel.findOne.mockResolvedValueOnce(null);
      const res = await request(app)
        .post('/api/patients/99999/care-team')
        .set('Authorization', makeToken())
        .send(validMember);
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/patients/:id/care-team/:memberId', () => {
    it('updates an existing care team member', async () => {
      const res = await request(app)
        .put(`/api/patients/20001/care-team/${mockMemberId}`)
        .set('Authorization', makeToken())
        .send({ specialty: 'Family Medicine' });
      expect(res.status).toBe(200);
      expect(mockPatient.save).toHaveBeenCalled();
    });

    it('returns 404 when member not found', async () => {
      const res = await request(app)
        .put('/api/patients/20001/care-team/non-existent-id')
        .set('Authorization', makeToken())
        .send({ specialty: 'Cardiology' });
      expect(res.status).toBe(404);
    });
  });
});
