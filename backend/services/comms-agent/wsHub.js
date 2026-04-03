'use strict';

/**
 * wsHub — lightweight EventEmitter bus used to decouple the Redis stream
 * consumer from the WebSocket server without a circular require().
 *
 * consumer.js  → hub.emit('notification', { patientId, notification })
 * server.js    → hub.on('notification', ...) → broadcast to WS clients
 */

const EventEmitter = require('events');
const hub = new EventEmitter();
hub.setMaxListeners(0); // unlimited — one listener per subscriber

module.exports = hub;
