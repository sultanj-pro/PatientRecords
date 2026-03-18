const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

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

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'api-gateway', port: PORT });
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

