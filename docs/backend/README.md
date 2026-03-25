# Backend Microservices

All backend services live under `backend/services/`. They are orchestrated via Docker Compose and communicate through the API Gateway and a Redis pub/sub event bus.

---

## Service Inventory

| Service | Port | Directory | Responsibility |
|---------|------|-----------|---------------|
| API Gateway | 5000 | `services/api-gateway/` | Single entry point; JWT validation; routes all `/api/*` traffic; Swagger at `/api-docs`; `/health/deep` deep check |
| Auth Service | 5001 | `services/auth-service/` | Login, token refresh, logout; role derived from username at token issuance |
| Patient Service | 5002 | `services/patient-service/` | Patient CRUD, patient search |
| Vitals Service | 5003 | `services/vitals-service/` | Vital signs read/write |
| Labs Service | 5004 | `services/labs-service/` | Lab results read/write |
| Medications Service | 5005 | `services/medications-service/` | Medication list read/write |
| Visits Service | 5006 | `services/visits-service/` | Clinical encounter read/write |
| Care Team Service | 5007 | `services/care-team-service/` | Care team member management |
| Clinical Notes Service | 5012 | `services/clinical-notes-service/` | Full-text clinical notes CRUD |
| Registry Service | 5100 | `services/registry-service/` | Plugin/module metadata; admin enable/disable API |
| AI Orchestrator | 5300 | `services/ai-orchestrator/` | Multi-agent recommendation engine |
| Medication Agent | — | `services/medication-agent/` | Drug interaction + contraindication analysis |
| Labs Agent | — | `services/labs-agent/` | Diagnostic test recommendations |
| LLM Agent | — | `services/llm-agent/` | AI reasoning backbone (tool-calling loop) |
| Comms Agent | — | `services/comms-agent/` | Async notification dispatch |

---

## Shared Library (`backend/shared/`)

All services that need shared functionality import from `backend/shared/`:

### `eventPublisher.js`
Redis pub/sub wrapper. Services publish domain events (e.g., `patient.updated`, `vital.added`) and other services subscribe to react asynchronously.

```js
const { publish } = require('../../shared/eventPublisher');
await publish('patient.updated', { patientId });
```

### Repository Pattern (`shared/repositories/`)

Data access is abstracted behind repository interfaces. Services call repository methods instead of writing Mongoose/MongoDB queries inline.

```
shared/repositories/
├── interfaces/
│   ├── IPatientRepository.js
│   ├── IVitalsRepository.js
│   ├── ILabsRepository.js
│   ├── IMedicationsRepository.js
│   ├── IVisitsRepository.js
│   ├── ICareTeamRepository.js
│   └── IClinicalNotesRepository.js
├── adapters/
│   └── mongo/
│       ├── MongoPatientRepository.js
│       ├── MongoVitalsRepository.js
│       ├── MongoLabsRepository.js
│       ├── MongoMedicationsRepository.js
│       ├── MongoVisitsRepository.js
│       ├── MongoCareTeamRepository.js
│       └── MongoClinicalNotesRepository.js
└── repositoryFactory.js       ← getRepository(domain)
```

**Usage in a service:**
```js
const { getRepository } = require('../../shared/repositories/repositoryFactory');
const repo = getRepository('vitals');
const vitals = await repo.getVitals(patientId);
```

The active adapter is controlled by the `DB_ADAPTER` environment variable (default: `mongo`). Adding a new adapter (e.g., PostgreSQL) requires implementing the interface and registering it in the factory — no service code changes needed.

---

## Database

**MongoDB** (`patientrecords` database, port 27017)

| Collection | Owner | Contents |
|------------|-------|----------|
| `patients` | Patient Service | Demographics, vitals, labs, medications, visits (embedded arrays), care team |
| `clinical_notes` | Clinical Notes Service | Free-text clinical notes (separate collection) |

**Redis** (port 6379) — pub/sub event bus only; no persistent data stored here.

---

## Authentication

JWT tokens are issued by Auth Service at login. The `role` field is derived at issuance from the username:

| Username pattern | Role assigned |
|-----------------|---------------|
| `admin` | `admin` |
| starts with `doc` | `physician` |
| anything else | `nurse` |

The token carries a single `role` string (not an array). All other services validate the token via the API Gateway's JWT middleware.

Demo credentials: `admin / admin`, `doctor / doctor`, `nurse / nurse`

---

## Running Locally

### With Docker Compose (recommended)

```powershell
# From repo root
docker compose up -d

# Check all services are healthy
curl http://localhost:5000/health/deep
```

### Individual service (for development)

```powershell
cd backend/services/vitals-service
npm install
npm start
```

Each service reads `MONGO_URL`, `REDIS_URL`, and `JWT_SECRET` from environment variables (set in `docker-compose.yml`). The `DB_ADAPTER` variable defaults to `mongo` if not set.

---

## API Endpoints (via Gateway at port 5000)

```
POST   /auth/login                          Auth
POST   /auth/refresh                        Auth
POST   /auth/logout                         Auth

GET    /api/patients                        Patient list + search
GET    /api/patients/:id                    Patient detail
PUT    /api/patients/:id                    Update patient

GET    /api/patients/:id/vitals             Vitals list
POST   /api/patients/:id/vitals             Add vital

GET    /api/patients/:id/labs               Labs list
POST   /api/patients/:id/labs               Add lab result

GET    /api/patients/:id/medications        Medications list
POST   /api/patients/:id/medications        Add medication

GET    /api/patients/:id/visits             Visits list
POST   /api/patients/:id/visits             Add visit

GET    /api/patients/:id/care-team          Care team
POST   /api/care-team/members               Add member
PUT    /api/care-team/members/:id           Update member
DELETE /api/care-team/members/:id           Remove member

GET    /api/clinical-notes                  All notes
POST   /api/clinical-notes                  Create note
GET    /api/clinical-notes/:id              Single note
PUT    /api/clinical-notes/:id              Update note
DELETE /api/clinical-notes/:id              Delete note

GET    /api/modules                         Registry module list
POST   /api/admin/registry/:name/enable     Enable module
POST   /api/admin/registry/:name/disable    Disable module

POST   /api/ai/recommend/:patientId         AI recommendation (orchestrator)

GET    /health                              Gateway liveness
GET    /health/deep                         All services health aggregate
GET    /api-docs                            Swagger UI
```

