# PatientRecords - System Build Summary

## Status: ✅ Production Running

**Architecture:** Micro-frontend SPA + Microservices backend  
**Containers:** ~29 Docker containers  
**Tests:** 40/40 smoke tests passing  
**Database:** MongoDB (`patientrecords`) + Redis (event bus)

---

## What Is Running

### Frontend (Micro-Frontend Shell + 7 Modules)

```
Shell App             http://localhost:4200   Angular 17 host
├─ Demographics       http://localhost:4201   Angular 17 remote
├─ Vitals             http://localhost:4202   Angular 17 remote
├─ Labs               http://localhost:4203   Angular 17 remote
├─ Medications        http://localhost:4204   Angular 17 remote
├─ Visits             http://localhost:4205   Angular 17 remote
├─ Care Team          http://localhost:4206   Angular 17 remote
└─ Procedures         http://localhost:4207   React 18 remote  ⭐ multi-framework
```

### Backend (Microservices via API Gateway)

```
API Gateway           http://localhost:5000   Entry point, JWT validation
├─ Auth Service       http://localhost:5001   Login / token refresh
├─ Patient Service    http://localhost:5002   Patient CRUD + search
├─ Vitals Service     http://localhost:5003   Vital signs
├─ Labs Service       http://localhost:5004   Lab results
├─ Medications Svc    http://localhost:5005   Medications
├─ Visits Service     http://localhost:5006   Clinical encounters
├─ Care Team Svc      http://localhost:5007   Team management
├─ Clinical Notes Svc http://localhost:5012   Free-text clinical notes
├─ Registry Service   http://localhost:5100   Plugin metadata + admin API
└─ AI Orchestrator    http://localhost:5300   Multi-agent recommendations
    ├─ Medication Agent                       Drug interaction analysis
    ├─ Labs Agent                             Diagnostic recommendations
    ├─ LLM Agent                              AI reasoning backbone
    └─ Comms Agent                            Async notification dispatch
```

### Infrastructure

```
MongoDB               localhost:27017         Primary data store
Redis                 localhost:6379          Pub/sub event bus
RedisInsight          http://localhost:8001   Redis GUI (dev)
```

---

## What Makes This Special

### 1. Micro-Frontend Architecture (Webpack Module Federation)
- Angular shell app dynamically loads Angular and React remotes at runtime
- Each module deploys independently — no monolith rebuilds
- Singleton shared packages loaded once (RxJS, Angular core, etc.)
- Patient context shared across framework boundaries via postMessage

### 2. Full Microservices Backend
- 15 backend services, each owning its own routes and logic
- API Gateway is the single entry point — frontends only talk to `:5000`
- Redis pub/sub for asynchronous inter-service events (`eventPublisher.js`)
- Registry Service enables runtime module enable/disable without redeployment

### 3. Repository Pattern / Data Access Layer
- All 7 data services use a repository interface instead of inline Mongoose calls
- Active adapter controlled by `DB_ADAPTER` env var (default: `mongo`)
- Adding PostgreSQL/DynamoDB requires only a new adapter class
- `backend/shared/repositories/` — interfaces, adapters, factory

### 4. Role-Based Access Control (Registry-Driven)
```
3 Roles × 7 Modules — managed at runtime via Admin Dashboard

admin     → All 7 modules + Admin Panel
physician → All 7 modules
nurse     → Demographics + Vitals (default; configurable via registry)

Role derived from username at login:
  admin → admin | doc* → physician | else → nurse
```

### 5. AI Multi-Agent Layer
- AI Orchestrator assembles full patient context, delegates to specialized agents
- Agents: Medication (drug interactions), Labs (diagnostics), LLM (reasoning), Comms (notifications)
- Integrated via `/api/ai/recommend/:patientId` through the standard API Gateway

### 6. Multi-Framework Frontend
- Procedures module is React 18 loaded inside the Angular 17 shell
- Demonstrates MFE framework independence

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Shell + 6 modules | Angular 17, TypeScript, RxJS, Bootstrap |
| Procedures module | React 18, TypeScript |
| Module Federation | Webpack 5 |
| Backend services | Node.js, Express |
| Data access | Mongoose (via Repository Pattern) |
| Primary DB | MongoDB |
| Event bus | Redis pub/sub |
| Auth | JWT (jsonwebtoken) |
| API documentation | Swagger / OpenAPI |
| Containerization | Docker, Docker Compose |
| Container orchestration | ~29 Docker containers |

---

## Test Results

```
Smoke test suite: 40/40 passing ✅
Coverage: Patient CRUD, Vitals, Labs, Medications, Visits, Care Team, Clinical Notes, Auth, Registry
Tool: Node.js HTTP test script (scripts/smoke-test.js)
```

---

## Quick Start

```powershell
# Start everything
docker compose up -d

# Verify all services healthy
curl http://localhost:5000/health/deep

# Open the app
start http://localhost:4200

# Swagger API docs
start http://localhost:5000/api-docs
```

Demo credentials: `admin / admin` · `doctor / doctor` · `nurse / nurse`
