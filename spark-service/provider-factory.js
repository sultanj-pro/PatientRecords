const fs = require('fs');
const path = require('path');

// Provider modules live in ./providers and must export at least `getOptions()`.
// Optionally they may export `testConnection()` (async) to validate connectivity.

function loadProviderModule(name) {
  const safe = name.replace(/[^a-z0-9_-]/gi, '').toLowerCase();
  const file = path.join(__dirname, 'providers', `${safe}.js`);
  if (fs.existsSync(file)) {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    return require(file);
  }
  return null;
}

function getProviderName() {
  return (process.env.STORAGE_PROVIDER || 'delta-minio').toLowerCase();
}

function getProvider() {
  const name = getProviderName();
  const mod = loadProviderModule(name);
  if (mod) return mod;

  // fallback to a bundled minio provider if available
  const fallback = loadProviderModule('delta-minio');
  if (fallback) return fallback;

  // Minimal inline fallback
  return {
    getOptions: () => ({})
  };
}

function getProviderOptions() {
  const provider = getProvider();
  try {
    return provider.getOptions();
  } catch (err) {
    return { error: String(err) };
  }
}

module.exports = { getProviderName, getProvider, getProviderOptions };
