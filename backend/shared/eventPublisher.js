'use strict';

const Redis = require('ioredis');

const STREAM_NAME = 'patientrecord-events';
const MAX_STREAM_LENGTH = 10000; // trim to last 10k events to cap memory

let client = null;

function getClient() {
  if (!client) {
    client = new Redis({
      host: process.env.REDIS_HOST || 'patientrecord-redis',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      maxRetriesPerRequest: 1,
    });

    client.on('error', (err) => {
      // Log but never crash — event publishing is best-effort
      console.error('[eventPublisher] Redis error:', err.message);
    });
  }
  return client;
}

/**
 * Publish a domain event to the shared Redis Stream.
 * Fail-silent: if Redis is unavailable the domain operation still succeeds.
 *
 * @param {string} eventType  e.g. 'labs-resulted'
 * @param {object} payload    Domain-specific fields (no raw PHI in values — use IDs only)
 */
async function publishEvent(eventType, payload) {
  try {
    const redis = getClient();
    // XADD with MAXLEN ~ to keep stream bounded
    await redis.xadd(
      STREAM_NAME,
      'MAXLEN', '~', MAX_STREAM_LENGTH,
      '*', // auto-generate entry ID
      'eventType', eventType,
      'payload', JSON.stringify(payload),
      'timestamp', new Date().toISOString()
    );
  } catch (err) {
    // Intentionally swallowed — event bus failure must not break clinical workflows
    console.error(`[eventPublisher] Failed to publish "${eventType}":`, err.message);
  }
}

module.exports = { publishEvent };
