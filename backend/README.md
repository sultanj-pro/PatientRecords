# backend (stub)

This is a minimal backend stub to support local development and the compose stack.

Endpoints:
- `GET /health` — liveness
- `POST /auth/login` — body `{ username, password }` returns `{ accessToken, role }`
- `POST /auth/refresh` — body `{ token }` returns a refreshed token
- `GET /api/patients` — protected endpoint (requires `Authorization: Bearer <token>`)

To run locally (without Docker):

```powershell
cd PatientRecords/backend
npm install
npm start
```

To run with Docker Compose (from `PatientRecords`):

```powershell
docker compose up -d
# then test:
curl http://localhost:3001/health
curl -X POST http://localhost:3001/auth/login -H "Content-Type: application/json" -d '{"username":"admin"}'
```
