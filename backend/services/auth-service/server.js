const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const PORT = process.env.PORT || 5001;
const TOKEN_EXPIRATION_MINUTES = parseInt(process.env.TOKEN_EXPIRATION_MINUTES || '60', 10);
const TOKEN_EXPIRATION_SECONDS = TOKEN_EXPIRATION_MINUTES * 60;

function signToken(username, role) {
  return jwt.sign({ sub: username, role }, JWT_SECRET, { expiresIn: TOKEN_EXPIRATION_SECONDS });
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'auth-service', port: PORT });
});

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  const { username } = req.body || {};
  if (!username) return res.status(400).json({ error: 'username required' });
  const role = username === 'admin' ? 'admin' : username.startsWith('doc') ? 'physician' : 'nurse';
  const token = signToken(username, role);
  res.json({ accessToken: token, tokenType: 'Bearer', expiresIn: TOKEN_EXPIRATION_SECONDS, role });
});

// POST /api/auth/refresh
app.post('/api/auth/refresh', (req, res) => {
  const { token } = req.body || {};
  if (!token) return res.status(400).json({ error: 'token required' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const newToken = signToken(payload.sub, payload.role || 'nurse');
    return res.json({ accessToken: newToken, tokenType: 'Bearer', expiresIn: TOKEN_EXPIRATION_SECONDS });
  } catch (err) {
    return res.status(401).json({ error: 'invalid token' });
  }
});

// POST /api/auth/validate
app.post('/api/auth/validate', (req, res) => {
  const { token } = req.body || {};
  if (!token) return res.status(400).json({ error: 'token required' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    res.json({ valid: true, username: payload.sub, role: payload.role });
  } catch (err) {
    return res.status(401).json({ valid: false, error: 'token invalid or expired' });
  }
});

app.listen(PORT, () => {
  console.log(`Auth Service listening on port ${PORT}`);
});
