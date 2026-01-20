const express = require('express');
const cors = require('cors');
const { getProviderName, getProvider, getProviderOptions } = require('./provider-factory');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/provider-options', (req, res) => {
  const opts = getProviderOptions();
  res.json({ provider: getProviderName(), options: opts });
});

// Run provider-specific connectivity tests (if provider implements `testConnection`).
app.get('/provider-test', async (req, res) => {
  const provider = getProvider();
  if (!provider || typeof provider.testConnection !== 'function') {
    return res.status(400).json({ ok: false, error: 'provider does not implement testConnection' });
  }

  try {
    const result = await provider.testConnection();
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

const port = process.env.PORT || 8998;
if (require.main === module) {
  app.listen(port, () => {
    console.log(`spark-service stub listening on ${port}`);
  });
}

module.exports = app;
