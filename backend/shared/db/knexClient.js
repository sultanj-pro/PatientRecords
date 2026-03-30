'use strict';

const knex = require('knex');

let _client = null;

function getKnexClient() {
  if (_client) return _client;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required when DB_ADAPTER=knex');
  }

  _client = knex({
    client: 'pg',
    connection: connectionString,
    pool: { min: 2, max: 10 },
  });

  return _client;
}

module.exports = { getKnexClient };
