'use strict';

const Redis = require('ioredis');
const { EVENT_ESCALATION_RULES } = require('./rules/escalationRules');
const { createNotification } = require('./notificationStore');

const STREAM_NAME   = 'patientrecord-events';
const GROUP_NAME    = 'comms-agent-group';
const CONSUMER_NAME = 'comms-agent-1';
const POLL_MS       = 5000;  // poll every 5 seconds
const BATCH_SIZE    = 10;    // messages per poll

let redis    = null;
let running  = false;
let pollTimer = null;

function buildClient() {
  const client = new Redis({
    host: process.env.REDIS_HOST || 'patientrecord-redis',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    maxRetriesPerRequest: 1,
  });
  client.on('error', (err) => {
    console.error('[comms-agent:consumer] Redis error:', err.message);
  });
  return client;
}

/**
 * Parse a flat Redis stream field array into a plain object.
 * XREADGROUP returns entries as ['field1','val1','field2','val2',...].
 */
function parseFields(fields) {
  const obj = {};
  for (let i = 0; i < fields.length; i += 2) {
    obj[fields[i]] = fields[i + 1];
  }
  return obj;
}

/**
 * Evaluate all escalation rules against one stream message.
 * Creates a notification in MongoDB for each matched rule.
 */
async function processMessage(msgId, fields) {
  const { eventType, payload: payloadStr } = fields;
  if (!eventType || !payloadStr) return;

  let payload;
  try {
    payload = JSON.parse(payloadStr);
  } catch {
    console.warn('[comms-agent:consumer] Bad payload JSON in msg', msgId);
    return;
  }

  const applicable = EVENT_ESCALATION_RULES.filter(r => r.eventType === eventType);
  for (const rule of applicable) {
    try {
      if (!rule.match(payload)) continue;
      const patientId = payload.patientId || payload.patient_id;
      if (!patientId) continue;

      await createNotification({
        patientId: String(patientId),
        type:      'event-escalation',
        severity:  rule.severity,
        title:     rule.title(payload),
        message:   rule.message(payload),
        eventType,
        ruleId:    rule.id,
        eventData: payload,
      });
      console.log(`[comms-agent:consumer] Notification created — rule ${rule.id} for patient ${patientId}`);
    } catch (err) {
      console.error(`[comms-agent:consumer] Error evaluating rule ${rule.id}:`, err.message);
    }
  }
}

/**
 * Ensure the consumer group exists. Handles the case where it was already created.
 */
async function ensureGroup(client) {
  try {
    // '0' means start from the beginning of the stream for the first consumer
    await client.xgroup('CREATE', STREAM_NAME, GROUP_NAME, '0', 'MKSTREAM');
    console.log(`[comms-agent:consumer] Created group "${GROUP_NAME}" on stream "${STREAM_NAME}"`);
  } catch (err) {
    if (!err.message.includes('BUSYGROUP')) {
      throw err; // unexpected
    }
    // Group already exists — that's fine
  }
}

/**
 * One poll cycle: read up to BATCH_SIZE pending messages and ACK each one.
 */
async function poll(client) {
  // '>' means only return messages not yet delivered to any consumer in this group
  const results = await client.xreadgroup(
    'GROUP', GROUP_NAME, CONSUMER_NAME,
    'COUNT', BATCH_SIZE,
    'BLOCK', 0,
    'STREAMS', STREAM_NAME, '>'
  );

  if (!results || !results.length) return;

  for (const [/* streamName */, messages] of results) {
    for (const [msgId, fields] of messages) {
      await processMessage(msgId, parseFields(fields));
      await client.xack(STREAM_NAME, GROUP_NAME, msgId);
    }
  }
}

/**
 * Start the background consumer loop. Safe to call multiple times (no-op if already running).
 */
async function startConsumer() {
  if (running) return;
  running = true;

  redis = buildClient();
  // Wait briefly for MongoDB to be connected before processing events
  await new Promise(r => setTimeout(r, 2000));
  await ensureGroup(redis);

  // Use BLOCK=0 in poll(), so we drive via recursive setTimeout for clean shutdown
  const loop = async () => {
    if (!running) return;
    try {
      await poll(redis);
    } catch (err) {
      console.error('[comms-agent:consumer] Poll error:', err.message);
    }
    if (running) pollTimer = setTimeout(loop, POLL_MS);
  };

  // Start immediately, then rely on the BLOCK 0 inside poll to wait for messages
  console.log('[comms-agent:consumer] Starting Redis stream consumer…');
  loop();
}

/**
 * Gracefully stop the consumer (for testing / shutdown hooks).
 */
async function stopConsumer() {
  running = false;
  if (pollTimer) clearTimeout(pollTimer);
  if (redis) await redis.quit();
  redis = null;
}

module.exports = { startConsumer, stopConsumer };
