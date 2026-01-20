// Simple integration helper: polls the spark-service `/provider-test` endpoint
// until it returns a successful result or times out.
// Usage: node test-provider.js [--url http://localhost:8998] [--timeout 120]

const http = require('http');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { url: 'http://localhost:8998', timeoutSec: 120, intervalSec: 3 };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if ((a === '--url' || a === '-u') && args[i + 1]) { out.url = args[++i]; }
    if ((a === '--timeout' || a === '-t') && args[i + 1]) { out.timeoutSec = Number(args[++i]); }
  }
  return out;
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => {
        try {
          const j = JSON.parse(raw);
          resolve({ statusCode: res.statusCode, body: j });
        } catch (err) {
          reject(new Error('invalid-json'));
        }
      });
    }).on('error', (err) => reject(err));
  });
}

async function run() {
  const { url, timeoutSec, intervalSec } = parseArgs();
  const endAt = Date.now() + timeoutSec * 1000;
  console.log(`Polling ${url}/provider-test for up to ${timeoutSec}s ...`);

  while (Date.now() < endAt) {
    try {
      const r = await getJson(`${url.replace(/\/$/, '')}/provider-test`);
      console.log('HTTP', r.statusCode, JSON.stringify(r.body));
      if (r.statusCode === 200 && r.body && (r.body.ok === true || r.body.ok === undefined)) {
        console.log('provider-test succeeded');
        process.exit(0);
      }
      // Non-200 or body indicates not ready/failure
    } catch (err) {
      // ignore and retry
    }
    await new Promise((r) => setTimeout(r, intervalSec * 1000));
    process.stdout.write('.');
  }

  console.error('\nprovider-test did not succeed within timeout');
  process.exit(2);
}

run();
