const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 5000;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8001';
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:5001';
const PATIENT_SERVICE_URL = process.env.PATIENT_SERVICE_URL || 'http://localhost:5002';
const REGISTRY_SERVICE_URL = process.env.REGISTRY_SERVICE_URL || 'http://localhost:5100';

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

// /api/patients/* → Patient Service (5002)
app.use('/api/patients', createProxyMiddleware(proxyOpts(PATIENT_SERVICE_URL)));

// Catch-all → monolith backend (8001) for anything not yet extracted
app.use('/api', createProxyMiddleware(proxyOpts(BACKEND_URL)));

app.listen(PORT, () => {
  console.log(`API Gateway listening on port ${PORT}`);
  console.log(`  /api/auth      → ${AUTH_SERVICE_URL}`);
  console.log(`  /api/registry  → ${REGISTRY_SERVICE_URL}`);
  console.log(`  /api/patients  → ${PATIENT_SERVICE_URL}`);
  console.log(`  /api/*         → ${BACKEND_URL} (catch-all)`);
});
