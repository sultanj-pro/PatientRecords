const request = require('supertest');
const { getProviderOptions } = require('../provider-factory');
const app = require('../server');

describe('spark-service provider factory', () => {
  test('returns minio options by default', () => {
    process.env.MINIO_ENDPOINT = 'http://minio:9000';
    process.env.MINIO_ROOT_USER = 'minioadmin';
    process.env.MINIO_ROOT_PASSWORD = 'minioadmin';
    process.env.STORAGE_PROVIDER = 'delta-minio';
    const opts = getProviderOptions();
    expect(opts['spark.hadoop.fs.s3a.access.key']).toBe('minioadmin');
    expect(opts['spark.hadoop.fs.s3a.endpoint']).toBe('http://minio:9000');
  });

  test('health and provider-options endpoints', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });

    // provider-options
    process.env.MINIO_ENDPOINT = 'http://minio:9000';
    const res2 = await request(app).get('/provider-options');
    expect(res2.status).toBe(200);
    expect(res2.body).toHaveProperty('provider');
    expect(res2.body).toHaveProperty('options');
  });
});
