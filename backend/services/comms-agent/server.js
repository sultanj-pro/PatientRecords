'use strict';

const express    = require('express');
const bodyParser = require('body-parser');
const cors       = require('cors');
const mongoose   = require('mongoose');

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

// MongoDB connection
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('[comms-agent] MongoDB connected');
    // Start Redis stream consumer after DB is ready
    startConsumer().catch(err =>
      console.error('[comms-agent] Consumer start error:', err.message)
    );
  })
  .catch(err => {
    console.error('[comms-agent] MongoDB connection error:', err.message);
    process.exit(1);
  });

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

app.listen(PORT, () => {
  console.log(`[comms-agent] Listening on port ${PORT}`);
});
