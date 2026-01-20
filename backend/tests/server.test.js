const request = require('supertest');

jest.mock('fs');
const fs = require('fs');
const samplePatients = [
  {
    patientid: 31323,
    firstname: 'sephFirst',
    lastname: 'rrellLast',
    vitals: [
      { dateofobservation: '2014-05-17', vital_description: 'WEIGHT', value: '54.1250' }
    ]
  }
];
fs.readFileSync.mockImplementation((p, enc) => JSON.stringify(samplePatients));

const app = require('../server');

describe('backend stub', () => {
  let token;
  test('health', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  test('login returns token and role', async () => {
    const res = await request(app).post('/auth/login').send({ username: 'doc1' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body.role).toBe('physician');
    token = res.body.accessToken;
  });

  test('list patients requires auth', async () => {
    const res = await request(app).get('/api/patients');
    expect(res.status).toBe(401);
  });

  test('list patients returns data', async () => {
    const res = await request(app).get('/api/patients').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty('patientid');
  });

  test('get patient by id', async () => {
    const res = await request(app).get('/api/patients/31323').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('firstname', 'sephFirst');
  });

  test('get vitals', async () => {
    const res = await request(app).get('/api/patients/31323/vitals').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty('vital_description', 'WEIGHT');
  });

  test('get visits (alias)', async () => {
    const res = await request(app).get('/api/patients/31323/visits').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('get meds (alias)', async () => {
    const res = await request(app).get('/api/patients/31323/meds').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('provider-options proxies to spark-service', async () => {
    // mock global.fetch
    const fake = { json: async () => ({ provider: 'delta-minio' }) };
    global.fetch = jest.fn().mockResolvedValue(fake);
    const res = await request(app).get('/api/provider-options').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('provider', 'delta-minio');
  });

  test('returns 404 for missing patient', async () => {
    const res = await request(app).get('/api/patients/99999').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});
