'use strict';

const http = require('http');
const express    = require('express');
const bodyParser = require('body-parser');
const cors       = require('cors');
const mongoose   = require('mongoose');
const { WebSocketServer } = require('ws');
const hub = require('./wsHub');

const { analyze }               = require('./analyzer');
const { startConsumer }         = require('./consumer');
const {
  getAllNotifications,
  getPendingNotifications,
  acknowledgeNotification,
} = require('./notificationStore');

const app  = express();
const PORT = process.env.PORT || 5011;
const MONGODB_URI = process.env.MONGODB_URI ||
  'mongodb://admin:admin@localhost:27017/patientrecords?authSource=admin';

app.use(cors());
app.use(bodyParser.json({ limit: '2mb' }));

// MongoDB connection (only when not using knex/PostgreSQL)
const DB_ADAPTER = (process.env.DB_ADAPTER || 'mongo').toLowerCase();
if (DB_ADAPTER !== 'knex') {
  mongoose.connect(MONGODB_URI)
    .then(() => {
      console.log('[comms-agent] MongoDB connected');
      startConsumer().catch(err =>
        console.error('[comms-agent] Consumer start error:', err.message)
      );
    })
    .catch(err => {
      console.error('[comms-agent] MongoDB connection error:', err.message);
      process.exit(1);
    });
} else {
  console.log('[comms-agent] Using PostgreSQL (DB_ADAPTER=knex)');
  // Start Redis stream consumer immediately — notificationStore is already PG-aware
  startConsumer().catch(err =>
    console.error('[comms-agent] Consumer start error:', err.message)
  );
}

// ── Health ─────────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'comms-agent', port: PORT });
});

// ── Analyze endpoint (internal, no auth) ────────────────────────────────────

app.post('/analyze', async (req, res) => {
  try {
    const { visits, medications, patient } = req.body;
    const findings = await analyze({ visits, medications, patient });
    res.json({ findings });
  } catch (err) {
    console.error('[comms-agent] analyze error:', err.message);
    res.status(500).json({ error: 'Analysis failed', message: err.message });
  }
});

// ── Notifications (internal use by orchestrator / frontend) ──────────────────

app.get('/notifications/:patientId/unread', async (req, res) => {
  try {
    const notes = await getPendingNotifications(req.params.patientId);
    res.json({ notifications: notes, count: notes.length });
  } catch (err) {
    console.error('[comms-agent] unread notifications fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch notifications', message: err.message });
  }
});

app.get('/notifications/:patientId', async (req, res) => {
  try {
    const notes = await getAllNotifications(req.params.patientId);
    res.json({ notifications: notes, count: notes.length });
  } catch (err) {
    console.error('[comms-agent] notifications fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch notifications', message: err.message });
  }
});

app.post('/notifications/:id/acknowledge', async (req, res) => {
  try {
    const note = await acknowledgeNotification(req.params.id);
    if (!note) return res.status(404).json({ error: 'Notification not found' });
    res.json(note);
  } catch (err) {
    console.error('[comms-agent] acknowledge error:', err.message);
    res.status(500).json({ error: 'Acknowledge failed', message: err.message });
  }
});

// ── HTTP + WebSocket server (8.8.1) ─────────────────────────────────────────────────────

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/notifications' });

// patientId → Set<WebSocket> — track per-patient subscriptions
const subscriptions = new Map();

function broadcastNotification(patientId, notification) {
  const subs = subscriptions.get(String(patientId));
  if (!subs || subs.size === 0) return;
  const msg = JSON.stringify({ type: 'notification', data: notification });
  for (const ws of subs) {
    if (ws.readyState === 1 /* OPEN */) ws.send(msg);
  }
}

wss.on('connection', (ws) => {
  let subscribedPatientId = null;

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'subscribe' && msg.patientId) {
        subscribedPatientId = String(msg.patientId);
        if (!subscriptions.has(subscribedPatientId)) subscriptions.set(subscribedPatientId, new Set());
        subscriptions.get(subscribedPatientId).add(ws);
        ws.send(JSON.stringify({ type: 'subscribed', patientId: subscribedPatientId }));
      }
    } catch { /* ignore malformed messages */ }
  });

  ws.on('close', () => {
    if (subscribedPatientId) subscriptions.get(subscribedPatientId)?.delete(ws);
  });
});

// Relay hub events → WebSocket broadcast
hub.on('notification', ({ patientId, notification }) => {
  broadcastNotification(patientId, notification);
});

server.listen(PORT, () => {
  console.log(`[comms-agent] Listening on port ${PORT}`);
});
