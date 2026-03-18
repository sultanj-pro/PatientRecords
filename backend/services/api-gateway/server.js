const express = require('express');
const cors = require('cors');
const http = require('http');
const { createProxyMiddleware } = require('http-proxy-middleware');
const swaggerUi = require('swagger-ui-express');
const openapiSpec = require('./openapi.json');

const app = express();
const PORT = process.env.PORT || 5000;
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:5001';
const PATIENT_SERVICE_URL = process.env.PATIENT_SERVICE_URL || 'http://localhost:5002';
const REGISTRY_SERVICE_URL = process.env.REGISTRY_SERVICE_URL || 'http://localhost:5100';
const VITALS_SERVICE_URL = process.env.VITALS_SERVICE_URL || 'http://localhost:5003';
const LABS_SERVICE_URL = process.env.LABS_SERVICE_URL || 'http://localhost:5004';
const MEDICATIONS_SERVICE_URL = process.env.MEDICATIONS_SERVICE_URL || 'http://localhost:5005';
const VISITS_SERVICE_URL = process.env.VISITS_SERVICE_URL || 'http://localhost:5006';
const CARE_TEAM_SERVICE_URL = process.env.CARE_TEAM_SERVICE_URL || 'http://localhost:5007';

app.use(cors());

// Swagger UI — available at /api-docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiSpec, {
  customSiteTitle: 'PatientRecords API',
  swaggerOptions: { persistAuthorization: true }
}));

const proxyOpts = (target) => ({
  target,
  changeOrigin: true,
  on: {
    error: (err, req, res) => {
      console.error(`[Gateway] Proxy error to ${target}: ${err.message}`);
      res.status(502).json({ error: 'Bad Gateway', message: err.message });
    }
  }
});

// Shallow health check (used by Docker healthcheck)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'api-gateway', port: PORT });
});

// Deep health check — fans out to all upstream services
app.get('/health/deep', async (req, res) => {
  const services = [
    { name: 'auth-service',        url: AUTH_SERVICE_URL },
    { name: 'patient-service',     url: PATIENT_SERVICE_URL },
    { name: 'vitals-service',      url: VITALS_SERVICE_URL },
    { name: 'labs-service',        url: LABS_SERVICE_URL },
    { name: 'medications-service', url: MEDICATIONS_SERVICE_URL },
    { name: 'visits-service',      url: VISITS_SERVICE_URL },
    { name: 'care-team-service',   url: CARE_TEAM_SERVICE_URL },
    { name: 'registry-service',    url: REGISTRY_SERVICE_URL },
  ];

  const checkService = (url) => new Promise((resolve) => {
    const req = http.get(`${url}/health`, { timeout: 3000 }, (r) => {
      resolve(r.statusCode === 200 ? 'ok' : 'degraded');
    });
    req.on('error', () => resolve('unreachable'));
    req.on('timeout', () => { req.destroy(); resolve('timeout'); });
  });

  const results = await Promise.all(
    services.map(async (s) => ({ name: s.name, status: await checkService(s.url) }))
  );

  const allOk = results.every((r) => r.status === 'ok');
  res.status(allOk ? 200 : 207).json({
    status: allOk ? 'ok' : 'degraded',
    gateway: 'ok',
    services: Object.fromEntries(results.map((r) => [r.name, r.status])),
  });
});

// PHASE 1b routing — peel off services one by one
// /api/auth/* → Auth Service (5001)
app.use('/api/auth', createProxyMiddleware(proxyOpts(AUTH_SERVICE_URL)));

// /api/registry + /api/admin/registry → Registry Service (8004)
app.use('/api/admin/registry', createProxyMiddleware(proxyOpts(REGISTRY_SERVICE_URL)));
app.use('/api/registry', createProxyMiddleware(proxyOpts(REGISTRY_SERVICE_URL)));

// /api/patients/:id/* clinical domain services (specific routes BEFORE base patient route)
app.use(/^\/api\/patients\/[^/]+\/vitals/, createProxyMiddleware(proxyOpts(VITALS_SERVICE_URL)));
app.use(/^\/api\/patients\/[^/]+\/labs/, createProxyMiddleware(proxyOpts(LABS_SERVICE_URL)));
app.use(/^\/api\/patients\/[^/]+\/(medications|meds)/, createProxyMiddleware(proxyOpts(MEDICATIONS_SERVICE_URL)));
app.use(/^\/api\/patients\/[^/]+\/visits/, createProxyMiddleware(proxyOpts(VISITS_SERVICE_URL)));
app.use(/^\/api\/patients\/[^/]+\/care-team/, createProxyMiddleware(proxyOpts(CARE_TEAM_SERVICE_URL)));

// /api/patients (list + identity) -> Patient Service (5002)
app.use('/api/patients', createProxyMiddleware(proxyOpts(PATIENT_SERVICE_URL)));

// Catch-all -- monolith decommissioned, return 404 for unknown routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not Found', message: `No service handles ${req.method} ${req.path}` });
});

app.listen(PORT, () => {
  console.log(`API Gateway listening on port ${PORT}`);
  console.log(`  /api/auth      -> ${AUTH_SERVICE_URL}`);
  console.log(`  /api/registry  -> ${REGISTRY_SERVICE_URL}`);
  console.log(`  /api/patients  -> ${PATIENT_SERVICE_URL}`);
  console.log(`  /api/*         -> 404 (monolith decommissioned)`);
});

