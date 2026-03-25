# 📚 PatientRecords - Complete Documentation Index

**Last Updated:** Current  
**Status:** ✅ Production Running  
**Architecture:** Micro-frontend + Microservices | ~29 Docker containers | 40/40 smoke tests passing

---

## 🎯 Where to Go for What

### "I want to understand the system architecture"
→ Read [SYSTEM_DIAGRAMS.md](./SYSTEM_DIAGRAMS.md) or view [docs/diagrams/system-architecture-v2.svg](./diagrams/system-architecture-v2.svg)

### "I want to see what the UI looks like"
→ Read [frontend/UI_WALKTHROUGH.md](./frontend/UI_WALKTHROUGH.md)

### "I want to understand role-based access"
→ Read [frontend/ROLE_BASED_LOADING.md](./frontend/ROLE_BASED_LOADING.md)

### "I want a high-level overview"
→ Read [BUILD_SUMMARY.md](./BUILD_SUMMARY.md)

### "I want to understand the backend microservices"
→ Read [backend/README.md](./backend/README.md)

### "I want to understand the data access layer"
→ Read [DATA_ACCESS_LAYER_PLAN.md](./DATA_ACCESS_LAYER_PLAN.md)

### "I want to understand the plugin/module registry"
→ Read [PLUGIN_ARCHITECTURE_V2.md](./PLUGIN_ARCHITECTURE_V2.md)

### "I want to deploy this system"
→ Read the root [README.md](../README.md) or [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md)

---

## 📖 Documentation Files

### Architecture & Design

1. **[SYSTEM_DIAGRAMS.md](./SYSTEM_DIAGRAMS.md)** - Visual architecture
   - Current system state table (all services + ports)
   - Overall system architecture ASCII diagram
   - Backend microservices diagram (all 15 services)
   - Repository Pattern / Data Access Layer diagram
   - Redis event bus topology
   - AI Multi-Agent layer diagram
   - Module Federation setup
   - Role-based access flow
   - Data flow diagrams

2. **[DATA_ACCESS_LAYER_PLAN.md](./DATA_ACCESS_LAYER_PLAN.md)** - Repository Pattern implementation
   - Problem statement & rationale
   - Interface definitions (7 repository interfaces)
   - MongoDB adapter implementations
   - Factory pattern / DB_ADAPTER env var
   - Services refactored
   - Extension guide (adding new adapters)

3. **[PLUGIN_ARCHITECTURE_V2.md](./PLUGIN_ARCHITECTURE_V2.md)** - Registry-driven module system
   - Registry service API
   - Module enable/disable at runtime
   - Per-role access configuration
   - Admin dashboard integration

4. **[MICRO_FRONTEND_ARCHITECTURE.md](./MICRO_FRONTEND_ARCHITECTURE.md)** - Webpack Module Federation
   - Host (shell) + remote (module) configuration
   - Shared singleton packages
   - Dynamic remote loading

5. **[MULTI_FRAMEWORK_ARCHITECTURE.md](./MULTI_FRAMEWORK_ARCHITECTURE.md)** - Angular + React coexistence
   - Procedures module (React 18) in Angular shell
   - Cross-framework patient context sharing

### Backend

6. **[backend/README.md](./backend/README.md)** - Backend microservices reference
   - All 15 services with ports and responsibilities
   - Shared library (`backend/shared/`)
   - Repository Pattern usage
   - Redis event bus
   - Environment variables
   - Running services locally

### Frontend

7. **[frontend/README.md](./frontend/README.md)** - Frontend modules reference
   - All 8 frontend apps (shell + 7 modules)
   - Module Federation configuration
   - Ports and start commands

8. **[frontend/ROLE_BASED_LOADING.md](./frontend/ROLE_BASED_LOADING.md)** - Authorization system
   - Role-based access matrix (3 roles × 7 modules)
   - Registry-driven configuration
   - Role derivation from username prefix
   - Admin dashboard runtime management

9. **[frontend/UI_OVERVIEW.md](./frontend/UI_OVERVIEW.md)** - Complete UI documentation
   - System architecture at a glance
   - UI flow & components
   - All 7 modules described
   - Login screen layout
   - Dashboard structure

10. **[frontend/UI_WALKTHROUGH.md](./frontend/UI_WALKTHROUGH.md)** - Step-by-step guide
    - Login screen with demo credentials
    - Dashboard after login
    - Module-by-module walkthrough
    - Role-based access demonstrations

### Operations & Status

11. **[BUILD_SUMMARY.md](./BUILD_SUMMARY.md)** - System build overview
    - What is running and where
    - Container inventory
    - Test results summary
    - Technology stack

12. **[REALTIME_STATUS.md](./REALTIME_STATUS.md)** - Current system status
    - All service health endpoints
    - Port reference
    - Infrastructure components (MongoDB, Redis)

### AI / Roadmap

13. **[PHASE_8_AI_MULTIAGENT_ROADMAP.md](./PHASE_8_AI_MULTIAGENT_ROADMAP.md)** - AI layer design
    - AI Orchestrator (port 5300)
    - Specialized agents (Medication, Labs, LLM, Comms)
    - Async event-driven notification pattern

14. **[PHASE_8_IMPLEMENTATION_PLAN.md](./PHASE_8_IMPLEMENTATION_PLAN.md)** - AI implementation guide

---

## 🏗️ System Quick Reference

### Frontend (Micro-Frontend Modules)

| App | Port | Framework | Purpose |
|-----|------|-----------|---------|
| Shell App | 4200 | Angular 17 | Auth, routing, patient search, admin dashboard |
| Demographics | 4201 | Angular 17 | Patient demographics, contact info |
| Vitals | 4202 | Angular 17 | Vital signs + history |
| Labs | 4203 | Angular 17 | Lab results with status |
| Medications | 4204 | Angular 17 | Active & historical medications |
| Visits | 4205 | Angular 17 | Clinical encounters |
| Care Team | 4206 | Angular 17 | Care team member management |
| Procedures | 4207 | React 18 | Procedures (multi-framework demo) |

### Backend (Microservices)

| Service | Port | Responsibility |
|---------|------|---------------|
| API Gateway | 5000 | Single entry point, JWT validation, Swagger |
| Auth Service | 5001 | Login, token refresh, logout |
| Patient Service | 5002 | Patient CRUD, search |
| Vitals Service | 5003 | Vital signs |
| Labs Service | 5004 | Lab results |
| Medications Service | 5005 | Medications |
| Visits Service | 5006 | Clinical encounters |
| Care Team Service | 5007 | Team management |
| Clinical Notes Service | 5012 | Full-text clinical notes (CRUD) |
| Registry Service | 5100 | Plugin metadata, admin API |
| AI Orchestrator | 5300 | Multi-agent recommendations |
| Medication Agent | — | Drug interaction analysis |
| Labs Agent | — | Diagnostic recommendations |
| LLM Agent | — | AI reasoning backbone |
| Comms Agent | — | Async notification dispatch |

### Infrastructure

| Component | Port | Purpose |
|-----------|------|---------|
| MongoDB | 27017 | Primary data store (`patientrecords` DB) |
| Redis | 6379 | Pub/sub event bus between services |
| RedisInsight | 8001 | Redis GUI (dev/debug) |

### Authentication

- JWT tokens; role derived from username prefix at login:
  - `admin` → `admin` role (all 7 modules + admin panel)
  - `doc*` → `physician` role (all 7 modules)
  - anything else → `nurse` role (Demographics, Vitals only by default; configurable via registry)
- Demo credentials: `admin / admin`, `doctor / doctor`, `nurse / nurse`

---