const { URL } = require('url');
// Optional Postgres testConnectivity using `pg` driver. If `pg` is not available,
// the function will return an informative error message.

function getOptions() {
  // Return a minimal set of JDBC-related options that a Spark job could consume.
  // The actual Spark job would use these to call `spark.read.format('jdbc')...`.
  return {
    'provider.type': 'jdbc',
    'jdbc.url': process.env.JDBC_URL || '',
    'jdbc.user': process.env.JDBC_USER || '',
    'jdbc.password': process.env.JDBC_PASSWORD || '',
    'jdbc.driver': process.env.JDBC_DRIVER || 'org.postgresql.Driver'
  };
}

async function testConnection() {
  // Only support Postgres via `pg` for this example.
  let pg;
  try {
    // lazy require so spark-service can still run without pg installed
    // eslint-disable-next-line global-require
    pg = require('pg');
  } catch (err) {
    return { ok: false, error: 'pg not installed. Run `npm install pg` to enable JDBC tests.' };
  }

  const urlStr = process.env.JDBC_URL;
  if (!urlStr) return { ok: false, error: 'JDBC_URL is not set.' };

  let client;
  try {
    // Support full JDBC URL like postgres://user:pass@host:port/db
    const parsed = new URL(urlStr);
    const cfg = {
      host: parsed.hostname,
      port: parsed.port || 5432,
      database: parsed.pathname ? parsed.pathname.slice(1) : undefined,
      user: process.env.JDBC_USER || parsed.username || undefined,
      password: process.env.JDBC_PASSWORD || parsed.password || undefined,
      ssl: process.env.JDBC_SSL === 'true' || false
    };

    client = new pg.Client(cfg);
    await client.connect();
    const res = await client.query('SELECT 1 as ok');
    await client.end();
    return { ok: true, rows: res.rows };
  } catch (err) {
    if (client) try { await client.end(); } catch (e) {}
    return { ok: false, error: String(err) };
  }
}

module.exports = { getOptions, testConnection };
