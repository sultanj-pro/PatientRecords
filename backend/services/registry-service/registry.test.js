'use strict';

const jwt = require('jsonwebtoken');
const JWT_SECRET = 'dev-secret';

// ── Mongoose mock ──────────────────────────────────────────────────────────
const mockModules = [
  { id: 'patient-summary', name: 'Patient Summary', enabled: true, order: 1, roles: ['admin', 'physician', 'nurse'] },
  { id: 'ai-insights', name: 'Care Intelligence', enabled: true, order: 8, roles: ['admin', 'physician'] },
];

const mockRegistry = {
  version: '1.0.0',
  description: 'PatientRecords Module Registry',
  modules: mockModules,
  save: jest.fn().mockResolvedValue(true),
  markModified: jest.fn(),
};

const MockModel = jest.fn();
MockModel.findOne = jest.fn().mockReturnValue({ lean: () => Promise.resolve(mockRegistry) });
MockModel.countDocuments = jest.fn().mockResolvedValue(1);
MockModel.create = jest.fn().mockResolvedValue(mockRegistry);

jest.mock('mongoose', () => ({
  connect: jest.fn().mockResolvedValue(true),
  Schema: class { constructor() { this.index = jest.fn(); } },
  model: jest.fn().mockImplementation(() => MockModel),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(false), // skip file seed in tests
  readFileSync: jest.fn(),
}));

let app;
beforeAll(() => { app = require('./server'); });

function makeToken(role = 'nurse') {
  return `Bearer ${jwt.sign({ sub: 'test', role }, JWT_SECRET, { expiresIn: 3600 })}`;
}
function makeAdminToken() { return makeToken('admin'); }

const request = require('supertest');

describe('registry-service', () => {
  describe('GET /health', () => {
    it('returns ok without auth', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  describe('GET /api/registry (public)', () => {
    it('returns the module list without auth', async () => {
      // Restore lean-returning mock for public endpoint
      MockModel.findOne.mockReturnValueOnce({ lean: () => Promise.resolve(mockRegistry) });
      const res = await request(app).get('/api/registry');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.modules)).toBe(true);
      expect(res.body.version).toBeDefined();
    });

    it('responds with no-cache headers', async () => {
      MockModel.findOne.mockReturnValueOnce({ lean: () => Promise.resolve(mockRegistry) });
      const res = await request(app).get('/api/registry');
      expect(res.headers['cache-control']).toMatch(/no-cache|no-store/i);
    });
  });

  describe('GET /api/admin/registry', () => {
    it('requires admin role', async () => {
      MockModel.findOne.mockReturnValueOnce(mockRegistry);
      const res = await request(app)
        .get('/api/admin/registry')
        .set('Authorization', makeToken('nurse'));
      expect(res.status).toBe(403);
    });

    it('returns full registry to admin', async () => {
      MockModel.findOne.mockReturnValueOnce(mockRegistry);
      const res = await request(app)
        .get('/api/admin/registry')
        .set('Authorization', makeAdminToken());
      expect(res.status).toBe(200);
    });

    it('returns 401 with no token', async () => {
      const res = await request(app).get('/api/admin/registry');
      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/admin/registry/modules/:id', () => {
    it('requires admin role', async () => {
      const res = await request(app)
        .put('/api/admin/registry/modules/patient-summary')
        .set('Authorization', makeToken('physician'))
        .send({ enabled: false });
      expect(res.status).toBe(403);
    });
  });
});
