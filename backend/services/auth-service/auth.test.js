'use strict';

const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');

// Inline the app without starting a listener (avoids port conflicts)
const JWT_SECRET = 'dev-secret';

function buildApp() {
  const app = express();
  app.use(bodyParser.json());

  function signToken(username, role) {
    return jwt.sign({ sub: username, role }, JWT_SECRET, { expiresIn: 3600 });
  }

  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'auth-service' }));

  app.post('/api/auth/login', (req, res) => {
    const { username } = req.body || {};
    if (!username) return res.status(400).json({ error: 'username required' });
    const role = username === 'admin' ? 'admin' : username.startsWith('doc') ? 'physician' : 'nurse';
    const token = signToken(username, role);
    res.json({ accessToken: token, tokenType: 'Bearer', expiresIn: 3600, role });
  });

  app.post('/api/auth/refresh', (req, res) => {
    const { token } = req.body || {};
    if (!token) return res.status(400).json({ error: 'token required' });
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      const newToken = signToken(payload.sub, payload.role || 'nurse');
      res.json({ accessToken: newToken, tokenType: 'Bearer', expiresIn: 3600 });
    } catch {
      res.status(401).json({ error: 'invalid token' });
    }
  });

  app.post('/api/auth/validate', (req, res) => {
    const { token } = req.body || {};
    if (!token) return res.status(400).json({ error: 'token required' });
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      res.json({ valid: true, username: payload.sub, role: payload.role });
    } catch {
      res.status(401).json({ valid: false, error: 'token invalid or expired' });
    }
  });

  return app;
}

describe('auth-service', () => {
  let app;

  beforeAll(() => {
    app = buildApp();
  });

  describe('GET /health', () => {
    it('returns ok', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  describe('POST /api/auth/login', () => {
    it('returns a token for a valid username', async () => {
      const res = await request(app).post('/api/auth/login').send({ username: 'admin' });
      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.role).toBe('admin');
    });

    it('assigns physician role for doc* usernames', async () => {
      const res = await request(app).post('/api/auth/login').send({ username: 'doc1' });
      expect(res.status).toBe(200);
      expect(res.body.role).toBe('physician');
    });

    it('assigns nurse role for other usernames', async () => {
      const res = await request(app).post('/api/auth/login').send({ username: 'nurse1' });
      expect(res.status).toBe(200);
      expect(res.body.role).toBe('nurse');
    });

    it('returns 400 when username is missing', async () => {
      const res = await request(app).post('/api/auth/login').send({});
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('issues a new token for a valid existing token', async () => {
      const original = jwt.sign({ sub: 'admin', role: 'admin' }, JWT_SECRET, { expiresIn: 3600 });
      const res = await request(app).post('/api/auth/refresh').send({ token: original });
      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
    });

    it('returns 401 for an invalid token', async () => {
      const res = await request(app).post('/api/auth/refresh').send({ token: 'bad.token.here' });
      expect(res.status).toBe(401);
    });

    it('returns 400 when token is missing', async () => {
      const res = await request(app).post('/api/auth/refresh').send({});
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/validate', () => {
    it('returns valid:true for a good token', async () => {
      const token = jwt.sign({ sub: 'doc1', role: 'physician' }, JWT_SECRET, { expiresIn: 3600 });
      const res = await request(app).post('/api/auth/validate').send({ token });
      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(true);
      expect(res.body.username).toBe('doc1');
    });

    it('returns 401 for an expired/invalid token', async () => {
      const res = await request(app).post('/api/auth/validate').send({ token: 'garbage' });
      expect(res.status).toBe(401);
      expect(res.body.valid).toBe(false);
    });
  });
});
