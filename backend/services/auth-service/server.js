const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost').split(',').map(s => s.trim());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const allowed = ALLOWED_ORIGINS.some(o => origin === o || origin.startsWith(o + ':'));
    if (allowed) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true
}));
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(JSON.stringify({ time: new Date().toISOString(), method: req.method, path: req.path, status: res.statusCode, ms: Date.now() - start }));
  });
  next();
});

app.use(bodyParser.json());

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
if (JWT_SECRET === 'dev-secret') {
  if (process.env.NODE_ENV === 'production') {
    console.error('[SECURITY] JWT_SECRET is using the default value in production! Set the JWT_SECRET environment variable. Exiting.');
    process.exit(1);
  } else {
    console.warn('[SECURITY] WARNING: JWT_SECRET is set to the default dev value. Set the JWT_SECRET environment variable before deploying to production.');
  }
}
const PORT = process.env.PORT || 5001;
const TOKEN_EXPIRATION_MINUTES = parseInt(process.env.TOKEN_EXPIRATION_MINUTES || '60', 10);
const TOKEN_EXPIRATION_SECONDS = TOKEN_EXPIRATION_MINUTES * 60;

// ── User store ────────────────────────────────────────────────────────────────
// Production: set USERS_JSON to a base64-encoded JSON array of { username, passwordHash, role }
// Dev: set ADMIN_PASSWORD, DOCTOR_PASSWORD, NURSE_PASSWORD env vars (defaults below)
const SALT_ROUNDS = 10;
let usersMap = {};

const usersJson = process.env.USERS_JSON;
if (usersJson) {
  try {
    const parsed = JSON.parse(Buffer.from(usersJson, 'base64').toString('utf8'));
    for (const u of parsed) {
      usersMap[u.username.toLowerCase()] = { passwordHash: u.passwordHash, role: u.role };
    }
    console.log(`[auth] Loaded ${Object.keys(usersMap).length} user(s) from USERS_JSON`);
  } catch (err) {
    console.error('[auth] Failed to parse USERS_JSON:', err.message);
    process.exit(1);
  }
} else {
  const adminPassword  = process.env.ADMIN_PASSWORD  || 'Admin1234!';
  const doctorPassword = process.env.DOCTOR_PASSWORD || 'Doctor1234!';
  const nursePassword  = process.env.NURSE_PASSWORD  || 'Nurse1234!';
  usersMap['admin']  = { passwordHash: bcrypt.hashSync(adminPassword,  SALT_ROUNDS), role: 'admin' };
  usersMap['doctor'] = { passwordHash: bcrypt.hashSync(doctorPassword, SALT_ROUNDS), role: 'physician' };
  usersMap['nurse']  = { passwordHash: bcrypt.hashSync(nursePassword,  SALT_ROUNDS), role: 'nurse' };
  console.log('[auth] Using default dev credentials (admin/doctor/nurse). Set USERS_JSON for production.');
}

function signToken(username, role) {
  return jwt.sign({ sub: username, role }, JWT_SECRET, { expiresIn: TOKEN_EXPIRATION_SECONDS });
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'auth-service', port: PORT });
});

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  const user = usersMap[username.toLowerCase()];
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = signToken(username, user.role);
  res.json({ accessToken: token, tokenType: 'Bearer', expiresIn: TOKEN_EXPIRATION_SECONDS, role: user.role });
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

