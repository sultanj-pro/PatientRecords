const express = require('express');
const cors = require('cors');
const http = require('http');
const net = require('net');
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
const CARE_TEAM_SERVICE_URL      = process.env.CARE_TEAM_SERVICE_URL      || 'http://localhost:5007';
const AI_ORCHESTRATOR_URL        = process.env.AI_ORCHESTRATOR_URL        || 'http://localhost:5008';
const COMMS_AGENT_URL            = process.env.COMMS_AGENT_URL            || 'http://localhost:5011';
const CLINICAL_NOTES_URL         = process.env.CLINICAL_NOTES_URL         || 'http://localhost:5012';
const LLM_AGENT_URL              = process.env.LLM_AGENT_URL              || 'http://localhost:5013';
const MEDICATION_AGENT_URL       = process.env.MEDICATION_AGENT_URL       || 'http://localhost:5009';
const LABS_AGENT_URL             = process.env.LABS_AGENT_URL             || 'http://localhost:5010';
const REDIS_HOST                 = process.env.REDIS_HOST                 || 'localhost';
const REDIS_PORT                 = parseInt(process.env.REDIS_PORT || '6379', 10);

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
    { name: 'ai-orchestrator',      url: AI_ORCHESTRATOR_URL },
    { name: 'comms-agent',          url: COMMS_AGENT_URL },
    { name: 'clinical-notes',       url: CLINICAL_NOTES_URL },
    { name: 'llm-agent',            url: LLM_AGENT_URL },
    { name: 'medication-agent',     url: MEDICATION_AGENT_URL },
    { name: 'labs-agent',           url: LABS_AGENT_URL },
  ];

  // TCP ping for Redis (no HTTP endpoint)
  const checkRedis = () => new Promise((resolve) => {
    const socket = net.createConnection({ host: REDIS_HOST, port: REDIS_PORT, timeout: 2000 });
    socket.on('connect', () => { socket.destroy(); resolve('ok'); });
    socket.on('error',   () => resolve('unreachable'));
    socket.on('timeout', () => { socket.destroy(); resolve('timeout'); });
  });

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
  const redisStatus = await checkRedis();

  const allOk = results.every((r) => r.status === 'ok') && redisStatus === 'ok';
  res.status(allOk ? 200 : 207).json({
    status: allOk ? 'ok' : 'degraded',
    gateway: 'ok',
    services: {
      ...Object.fromEntries(results.map((r) => [r.name, r.status])),
      redis: redisStatus,
    },
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
app.use(/^\/api\/patients\/[^/]+\/notes/, createProxyMiddleware(proxyOpts(CLINICAL_NOTES_URL)));
app.use('/api/notes', createProxyMiddleware(proxyOpts(CLINICAL_NOTES_URL)));

// /api/ai/* -> AI Orchestrator (5008)
app.use('/api/ai', createProxyMiddleware(proxyOpts(AI_ORCHESTRATOR_URL)));

// /api/notifications/* -> Comms Agent (5011)  [strip /api prefix]
app.use('/api/notifications', createProxyMiddleware({
  ...proxyOpts(COMMS_AGENT_URL),
  pathRewrite: { '^/api/notifications': '/notifications' }
}));

// /api/patients (list + identity) -> Patient Service (5002)
app.use('/api/patients', createProxyMiddleware(proxyOpts(PATIENT_SERVICE_URL)));

// Catch-all -- monolith decommissioned, return 404 for unknown routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not Found', message: `No service handles ${req.method} ${req.path}` });
});

// ── HTTP server (required for WebSocket upgrade proxying) ─────────────────────────

const server = http.createServer(app);

// 8.8.2 — Proxy WebSocket upgrade requests for /ws/notifications to comms-agent
server.on('upgrade', (req, clientSocket, head) => {
  if (!req.url.startsWith('/ws/notifications')) {
    clientSocket.write('HTTP/1.1 404 Not Found\r\n\r\n');
    clientSocket.destroy();
    return;
  }

  const commsUrl = new URL(COMMS_AGENT_URL);
  const targetPort = parseInt(commsUrl.port, 10) || 80;
  const targetHost = commsUrl.hostname;

  const serverSocket = net.createConnection({ host: targetHost, port: targetPort }, () => {
    // Reconstruct and forward the raw HTTP upgrade request
    const reqLines = [
      `${req.method} ${req.url} HTTP/${req.httpVersion}`,
      `Host: ${commsUrl.host}`,
    ];
    for (const [key, val] of Object.entries(req.headers)) {
      if (key.toLowerCase() !== 'host') {
        reqLines.push(`${key}: ${Array.isArray(val) ? val.join(', ') : val}`);
      }
    }
    reqLines.push('', '');
    serverSocket.write(reqLines.join('\r\n'));
    if (head && head.length) serverSocket.write(head);
    serverSocket.pipe(clientSocket);
    clientSocket.pipe(serverSocket);
  });

  serverSocket.on('error', (err) => {
    console.error('[Gateway] WS tunnel error:', err.message);
    clientSocket.end();
  });
  clientSocket.on('error', () => serverSocket.destroy());
});

server.listen(PORT, () => {
  console.log(`API Gateway listening on port ${PORT}`);
  console.log(`  /api/auth      -> ${AUTH_SERVICE_URL}`);
  console.log(`  /api/registry  -> ${REGISTRY_SERVICE_URL}`);
  console.log(`  /api/patients  -> ${PATIENT_SERVICE_URL}`);
  console.log(`  /api/*         -> 404 (monolith decommissioned)`);
});

