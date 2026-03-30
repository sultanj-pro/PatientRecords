# Data Access Layer — Implementation Plan

## Problem Statement

All 15 microservices currently import Mongoose directly and issue queries inline inside route handlers. Swapping the underlying database (e.g. MongoDB → PostgreSQL) requires touching every service. The goal is to introduce a **Repository Pattern** that decouples business logic from storage technology.

## Why Not Go?

The repository layer lives *inside* each Node.js service as a shared library imported via `require()`. Node.js cannot import Go as a library. The alternatives (Go data-proxy microservice, CGo/WASM bridge) add network latency to every DB call or are prohibitively complex to maintain. The clean path to Go is rewriting individual services in Go over time — the repository interfaces defined here would have Go equivalents at that point.

## Architecture

```
Route Handler
     │
     ▼
Repository Interface  (abstract contract — throws NotImplementedError)
     │
     ▼
Repository Factory    (reads DB_ADAPTER env var, returns the right adapter)
     │
     ├── MongoAdapter   (wraps existing Mongoose code — default)
     └── KnexAdapter    (future — covers PostgreSQL, MySQL, MSSQL, SQLite)
```

### Key Design Decisions

| Decision | Rationale |
|---|---|
| Interface throws `NotImplementedError` | Forces adapter authors to implement every method; caught at startup not runtime |
| Factory reads `DB_ADAPTER` env var | Zero code change to switch adapters; `DB_ADAPTER=mongo` (default) or `DB_ADAPTER=knex` |
| Adapters live in `backend/shared/` | One copy consumed by all services; no duplication |
| Services own 0 Mongoose code | All Mongoose imports move to MongoAdapter; services import only the factory |

## Repository Interfaces

Located in `backend/shared/repositories/interfaces/`

| File | Service(s) |
|---|---|
| `IPatientRepository.js` | patient-service |
| `IVitalsRepository.js` | vitals-service, patient-service |
| `ILabsRepository.js` | labs-service, patient-service |
| `IMedicationsRepository.js` | medications-service, patient-service |
| `IVisitsRepository.js` | visits-service, patient-service |
| `ICareTeamRepository.js` | care-team-service, patient-service |
| `IClinicalNotesRepository.js` | clinical-notes-service |

## MongoDB Adapter: Operation Map

All six domain services (vitals, labs, medications, visits, care-team) share the same "load-modify-save" pattern against the `patients` collection:

```
findOne({ patientid }) → mutate subdoc array → markModified(array) → save()
```

`clinical-notes-service` is the exception: it owns a dedicated `clinical_notes` collection and uses `Note.find()`, `Note.create()`, `Note.findOne({ _id })`, plus soft-delete.

### Known Bug Fixed During Refactor

`labs-service` and `medications-service` are missing `markModified()` calls before `save()`. The MongoDB adapter will call `markModified` consistently on all subdoc arrays.

## Implementation Phases

### Phase 1 — Repository Interfaces ✅ (create abstract contracts)

Create `backend/shared/repositories/interfaces/` with one file per domain.

Each interface exports a class whose every method throws:
```js
throw new Error(`${this.constructor.name} must implement methodName()`);
```

### Phase 2 — MongoDB Adapters ✅ (move Mongoose code out of services)

Create `backend/shared/repositories/adapters/mongo/` with one adapter per interface.

Each adapter:
- Requires the Mongoose model (passed in via constructor or lazy-loaded)
- Implements every method from the corresponding interface
- Adds `markModified()` before every `save()` (fixing the labs/meds bug)

### Phase 3 — Repository Factory ✅

`backend/shared/repositories/repositoryFactory.js`

```js
const adapter = process.env.DB_ADAPTER || 'mongo';

const factories = {
  mongo: {
    patient:       () => new MongoPatientRepository(),
    vitals:        () => new MongoVitalsRepository(),
    labs:          () => new MongoLabsRepository(),
    medications:   () => new MongoMedicationsRepository(),
    visits:        () => new MongoVisitsRepository(),
    careTeam:      () => new MongoCareTeamRepository(),
    clinicalNotes: () => new MongoClinicalNotesRepository(),
    registry:      () => new MongoRegistryRepository(),
  },
  knex: {
    patient:       () => new KnexPatientRepository(),
    vitals:        () => new KnexVitalsRepository(),
    labs:          () => new KnexLabsRepository(),
    medications:   () => new KnexMedicationsRepository(),
    visits:        () => new KnexVisitsRepository(),
    careTeam:      () => new KnexCareTeamRepository(),
    clinicalNotes: () => new KnexClinicalNotesRepository(),
    registry:      () => new KnexRegistryRepository(),
  },
};

module.exports = (domain) => factories[adapter][domain]();
```

### Phase 4 — Refactor Services ✅ (one at a time, test after each)

Replace all Mongoose imports and inline queries with:
```js
const getRepository = require('../../shared/repositories/repositoryFactory');
const repo = getRepository('vitals');

// Before:
const patient = await Patient.findOne({ patientid: parseInt(id) });

// After:
const patient = await repo.getByPatientId(parseInt(id));
```

Refactor order: vitals → labs → medications → visits → care-team → patient → clinical-notes → registry

Services now require **zero Mongoose code** — all persistence lives in the relevant adapter file.

---

### Phase 5 — Knex / PostgreSQL Adapters ✅

Created `backend/shared/repositories/adapters/knex/` with one adapter per domain:

| File | Table(s) |
|---|---|
| `KnexPatientRepository.js` | `patients` (JSONB demographics + allergies) |
| `KnexVitalsRepository.js` | `vitals` |
| `KnexLabsRepository.js` | `labs` |
| `KnexMedicationsRepository.js` | `medications` |
| `KnexVisitsRepository.js` | `visits` |
| `KnexCareTeamRepository.js` | `care_team_members` |
| `KnexClinicalNotesRepository.js` | `clinical_notes` |
| `KnexRegistryRepository.js` | `registry` (modules stored as JSONB) |

PostgreSQL schema: `backend/shared/db/migrations/001_initial_schema.sql`

Switch adapters with a single env var — no code changes required:
```sh
DB_ADAPTER=knex   # PostgreSQL via Knex
DB_ADAPTER=mongo  # MongoDB via Mongoose (default)
```

---

### Phase 6 — AI Service Stores ✅

`ai-orchestrator` and `comms-agent` have their own embedded data stores (not part of the shared factory). Both were migrated to honour `DB_ADAPTER`:

| Service | File | Tables (knex) | Collections (mongo) |
|---|---|---|---|
| `ai-orchestrator` | `approvalStore.js` | `ai_recommendations` | `ai_recommendations` |
| `comms-agent` | `notificationStore.js` | `notifications`, `ai_audit_log` | `notifications`, `ai_audit_log` |

Key behaviours preserved across both adapters:
- **Immutable status** — `approved`/`dismissed` recommendations cannot be changed again
- **Dedup window** — notifications with the same `ruleId` within 24 h are not duplicated
- **Idempotent audit log** — duplicate `streamMsgId` is silently ignored (PostgreSQL `23505`, MongoDB `E11000`)
- **Redis Streams consumer** — `comms-agent` consumer starts immediately in both modes; writes go to whichever store is active

---

### Phase 7 — Update Tests

Mock repository interfaces instead of Mongoose models.

### Phase 6 — Full Validation

```powershell
cd deployment; .\seed.ps1
node scripts\smoke-test.js   # expect 40/40
npx jest                     # all green
```

### Phase 7 — Knex Adapter (future sprint)

Add `backend/shared/repositories/adapters/knex/` implementing the same interfaces against a relational schema. Switch with `DB_ADAPTER=knex` in docker-compose environment.

## Services NOT Refactored

These services do not own data and have no Mongoose usage:

- `api-gateway` — HTTP proxy only
- `registry-service` — reads static registry.json
- `ai-orchestrator` — orchestrates agent calls
- All agent services (`llm-agent`, `labs-agent`, `medication-agent`, `comms-agent`) — pure HTTP/LLM

## Environment Variables

| Variable | Default | Values |
|---|---|---|
| `DB_ADAPTER` | `mongo` | `mongo`, `knex` |
| `MONGO_URI` | existing | unchanged |
| `DATABASE_URL` | (none yet) | PostgreSQL DSN — Phase 7 |
