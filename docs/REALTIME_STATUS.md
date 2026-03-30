# PatientRecords - System Status Reference

**Architecture:** Micro-frontend + Microservices  
**Containers:** ~29 Docker containers  
**Tests:** 40/40 smoke tests passing

---

## Service Health Endpoints

```
GET http://localhost:5000/health       API Gateway liveness
GET http://localhost:5000/health/deep  All services aggregate
GET http://localhost:5000/api-docs     Swagger UI
```

---

## Port Reference

### Frontend

| App | Port | URL |
|-----|------|-----|
| Shell App | 4200 | http://localhost:4200 |
| Demographics | 4201 | http://localhost:4201 |
| Vitals | 4202 | http://localhost:4202 |
| Labs | 4203 | http://localhost:4203 |
| Medications | 4204 | http://localhost:4204 |
| Visits | 4205 | http://localhost:4205 |
| Care Team | 4206 | http://localhost:4206 |
| Procedures | 4207 | http://localhost:4207 |

### Backend

| Service | Port | Health |
|---------|------|--------|
| API Gateway | 5000 | `/health` |
| Auth Service | 5001 | `/health` |
| Patient Service | 5002 | `/health` |
| Vitals Service | 5003 | `/health` |
| Labs Service | 5004 | `/health` |
| Medications Service | 5005 | `/health` |
| Visits Service | 5006 | `/health` |
| Care Team Service | 5007 | `/health` |
| Clinical Notes Service | 5012 | `/health` |
| Registry Service | 5100 | `/health` |
| AI Orchestrator | 5008 | `/health` |
| Medication Agent | 5009 | `/health` |
| Labs Agent | 5010 | `/health` |
| Comms Agent | 5011 | `/health` |
| LLM Agent | 5013 | `/health` |

### Infrastructure

| Component | Port | Purpose |
|-----------|------|---------|
| PostgreSQL | 5432 | Primary data store (`patientrecords` DB) — active when `DB_ADAPTER=knex` |
| MongoDB | 27017 | Optional data store — active when `DB_ADAPTER=mongo` (default) |
| Redis | 6379 | Event stream bus (`patientrecord-events` stream) |
| RedisInsight | 8001 | Redis GUI |

---

## Active Systems

### PostgreSQL (primary when DB_ADAPTER=knex)
```
Database:  patientrecords
Tables:    patients, vitals, labs, medications, visits,
           care_team_members, clinical_notes, registry,
           ai_recommendations, notifications, ai_audit_log
Port:      5432
User:      admin / admin
```

### MongoDB (active when DB_ADAPTER=mongo)
```
Database:     patientrecords
Port:         27017
Note:         Optional — all services fall back to Mongoose when DB_ADAPTER=mongo
```

### Redis
```
Role:    Redis Streams event bus (XADD / XREADGROUP)
Port:    6379
Stream:  patientrecord-events
Usage:   Domain services publish events; Comms Agent consumer processes them
```

### Repository Pattern
```
Location:  backend/shared/repositories/
Adapter:   Controlled by DB_ADAPTER env var
           DB_ADAPTER=knex  → PostgreSQL via Knex (production default)
           DB_ADAPTER=mongo → MongoDB via Mongoose
Services:  patient, vitals, labs, medications, visits,
           care-team, clinical-notes, registry
AI stores: ai-orchestrator (approvalStore.js), comms-agent (notificationStore.js)
           — both honour DB_ADAPTER and switch between PG and Mongoose accordingly
```

---

## Authentication

```
POST http://localhost:5000/auth/login
Body: { "username": "admin", "password": "admin" }

Role derivation:
  username == "admin"        → role: admin
  username starts with "doc" → role: physician
  anything else              → role: nurse

Demo credentials:
  admin / admin     → admin role  (all 7 modules + admin panel)
  doctor / doctor   → physician   (all 7 modules)
  nurse / nurse     → nurse       (Demographics, Vitals by default)
```

---

## Startup

```powershell
# Start all containers
docker compose up -d

# Verify health
curl http://localhost:5000/health/deep

# Run smoke tests
node scripts/smoke-test.js
# Expected: 40/40 passing

# View logs for a specific service
docker compose logs -f vitals-service
```

---

## Module Access Matrix (Current)

| Module | admin | physician | nurse |
|--------|-------|-----------|-------|
| Demographics (4201) | ✓ | ✓ | ✓ |
| Vitals (4202) | ✓ | ✓ | ✓ |
| Labs (4203) | ✓ | ✓ | ✗ |
| Medications (4204) | ✓ | ✓ | ✗ |
| Visits (4205) | ✓ | ✓ | ✗ |
| Care Team (4206) | ✓ | ✓ | ✗ |
| Procedures (4207) | ✓ | ✓ | ✗ |
| Admin Panel | ✓ | ✗ | ✗ |

> Module visibility is registry-driven and configurable at runtime via the Admin Panel.