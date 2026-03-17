# Microservices Architecture Implementation Plan

## Goal
Transform PatientRecords from monolithic backend to microservices architecture with:
- 7 domain microservices (1:1 with frontend modules)
- 3 infrastructure services (Auth, Patient Identity, API Gateway)
- Registry Service with self-registration capabilities
- Admin Dashboard for module management

## Timeline
4 weeks total
- **Phase 0** (Day 1-2): Port migration safety checkpoint
- **Phase 1a** (Day 3-4): API Gateway as simple proxy
- **Phase 1b** (Week 1): Gradually add microservices
- Week 2: Core domain services extraction
- Week 3: Integration & validation
- Week 4: Admin Dashboard + documentation

## Overall Architecture

```
Frontend Shell (4200)
├── Other Modules (4201-4207)
├── Admin Dashboard Module (4208)
└── queries →

API Gateway (5000)
├── Auth verification
├── Request routing
└── Response aggregation

Infrastructure Services
├── Auth Service (5001)
├── Patient Identity Service (5002)
└── Registry Service (5100)

Domain Services
├── Vitals Service (5003)
├── Medications Service (5004)
├── Labs Service (5005)
├── Visits Service (5006)
├── Care Team Service (5007)
├── Procedures Service (5008)
└── [Future services]

Database
└── MongoDB (shared instance, separate databases per service)
    ├── auth-db
    ├── patients-db
    ├── vitals-db
    ├── medications-db
    ├── labs-db
    ├── visits-db
    ├── care-team-db
    ├── procedures-db
    └── registry-db
```

---

## PHASE 0: Port Migration Safety Checkpoint (Day 1-2)
**Goal:** Move current backend to new port, verify everything still works

### 0.1 Update docker-compose.yml - Move Backend Port
**Deliverables:**
- [ ] Change backend service port mapping from 5001 → 8001
- [ ] Keep all other services unchanged initially
- [ ] Start services: `docker-compose up`

**File to update:**
- `docker-compose.yml` (backend ports section)

**Testing Phase 0.1:**
```bash
docker-compose up
# Backend now accessible on 8001
curl http://localhost:8001/health
```

---

### 0.2 Update Frontend API_URL
**Deliverables:**
- [ ] Update frontend configuration to point to new backend port
- [ ] Check these locations:
  - `frontend/shell-app/src/environment.ts` or environment files
  - `frontend/shell-app/.env` or similar
  - `docker-compose.yml` environment variables for shell-app
- [ ] Change from: `API_URL=http://backend:5001`
- [ ] Change to: `API_URL=http://backend:8001`

**Files to update:**
- Frontend environment configuration files
- docker-compose.yml (if env var there)

**Testing Phase 0.2:**
```bash
docker-compose up
# Frontend still loads on 4200
# All modules load and work
# API calls go to backend:8001
curl http://localhost:4200
# Test one API endpoint through frontend
```

---

### 0.3 Full System Test with New Port
**Deliverables:**
- [ ] Start full docker-compose stack
- [ ] Test all frontend modules load
- [ ] Test authentication (login/logout)
- [ ] Test data retrieval (vitals, medications, etc)
- [ ] Verify no broken links or 404s
- [ ] All endpoints respond correctly from port 8001

**Testing Checklist:**
- [ ] Shell app loads (4200)
- [ ] All navigation works
- [ ] Login works
- [ ] Patient data loads
- [ ] All modules accessible
- [ ] No console errors
- [ ] Backend responds from 8001

**Commit this working state:**
```bash
git add -A
git commit -m "chore: migrate backend from port 5001 to 8001 for gateway transition"
```

---

## PHASE 1a: API Gateway as Simple Proxy (Day 3-4)
**Goal:** Create API Gateway that passes all requests to backend:8001 without changing behavior

### 1a.1 Create API Gateway Structure
**Deliverables:**
- [ ] Create `backend/services/api-gateway/` directory
- [ ] Create basic Express server that acts as proxy
- [ ] Simple routing: ALL requests → backend:8001 (pass-through proxy)

**Files to create:**
- `backend/services/api-gateway/server.js`
- `backend/services/api-gateway/package.json`
- `backend/services/api-gateway/Dockerfile`

**Code structure (pseudo-code):**
```javascript
// api-gateway/server.js
const express = require('express');
const httpProxy = require('express-http-proxy');

const app = express();

// PHASE 1a: Simple proxy to old backend
// All requests → backend:8001
app.use('/api', httpProxy('http://backend:8001'));

app.listen(5000, () => {
  console.log('API Gateway listening on 5000 (proxy to backend:8001)');
});
```

---

### 1a.2 Add Gateway to docker-compose.yml
**Deliverables:**
- [ ] Add api-gateway service to docker-compose
- [ ] Port: 5000
- [ ] Depends on: mongo, backend
- [ ] Health check: `GET /health` returns 200

**docker-compose.yml addition:**
```yaml
api-gateway:
  build: ./backend/services/api-gateway
  ports:
    - "5000:5000"
  environment:
    - BACKEND_URL=http://backend:8001
  depends_on:
    - mongo
    - backend
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
    interval: 10s
```

---

### 1a.3 Update Frontend to Use Gateway
**Deliverables:**
- [ ] Update API_URL from http://backend:8001 → http://api-gateway:5000
- [ ] Update in all locations:
  - Environment configuration
  - docker-compose.yml env vars
  - Any hardcoded URLs

**Files to update:**
- Frontend environment files
- docker-compose.yml (shell-app service)

**Change:**
```
FROM: API_URL=http://backend:8001
TO:   API_URL=http://api-gateway:5000
```

---

### 1a.4 Test Gateway as Proxy
**Deliverables:**
- [ ] Start services: `docker-compose up`
- [ ] Test gateway is running on 5000
- [ ] Test frontend still works (load on 4200)
- [ ] Test all endpoints work through gateway
- [ ] Verify behavior is identical to direct backend

**Testing Checklist:**
```bash
docker-compose up

# Gateway runs on 5000
curl http://localhost:5000/api/patients
curl http://localhost:5000/api/auth/login

# Frontend uses gateway
# All functionality identical to before
# Load app and verify everything works
```

- [ ] Shell app loads
- [ ] Authentication works
- [ ] All modules load
- [ ] API calls successful
- [ ] No errors in console

**Commit this working state:**
```bash
git add -A
git commit -m "feat: add API Gateway as simple pass-through proxy to backend:8001"
```

---

## PHASE 1b: Gradually Add Microservices (Week 1)
**Goal:** Add microservices one at a time, gateway routes recognized endpoints to them

**Principle:** For each new service:
1. Create service (e.g., Auth Service)
2. Update gateway to route recognized endpoints to it
3. Test that it works
4. Commit working state
5. Move to next service

### 1b.1 Extract & Deploy Auth Service
**Deliverables:**
- [ ] Create `backend/services/auth-service/` from backend/routes/auth.js
- [ ] Auth Service on port 5001
- [ ] API endpoints: /auth/login, /auth/refresh, /auth/logout, /auth/verify
- [ ] Uses separate auth-db in MongoDB

**Files to create:**
- `backend/services/auth-service/server.js`
- `backend/services/auth-service/routes/auth.js`
- `backend/services/auth-service/Dockerfile`
- `backend/services/auth-service/package.json`

**Add to docker-compose.yml:**
```yaml
auth-service:
  build: ./backend/services/auth-service
  ports:
    - "5001:5001"
  environment:
    - MONGO_URL=mongodb://mongo:27017/auth
  depends_on:
    - mongo
```

**Update API Gateway routing:**
```javascript
// /api/auth/* routes to Auth Service (5001)
// Everything else still → backend:8001
app.use('/api/auth', httpProxy('http://auth-service:5001'));
app.use('/api', httpProxy('http://backend:8001')); // catch-all
```

**Testing:**
```bash
docker-compose up
# Auth Service runs on 5001
curl http://localhost:5000/api/auth/login  # goes to Auth Service via gateway
curl http://localhost:5000/api/patients     # still goes to backend:8001
# Frontend login still works
```

- [ ] Auth Service starts
- [ ] Gateway routes /auth/* to it
- [ ] Login/logout work through gateway
- [ ] Frontend authenticates successfully

**Commit this working state:**
```bash
git add -A
git commit -m "feat(phase-1b): extract Auth Service, gateway routes /auth to it"
```

---

### 1b.2 Create Patient Identity Service
**Deliverables:**
- [ ] Create `backend/services/patient-service/`
- [ ] Patient Service on port 5002
- [ ] API endpoints: /patients CRUD
- [ ] Uses separate patients-db

**Update API Gateway routing:**
```javascript
app.use('/api/patients', httpProxy('http://patient-service:5002'));
app.use('/api/auth', httpProxy('http://auth-service:5001'));
app.use('/api', httpProxy('http://backend:8001')); // catch-all
```

**Testing & Commit:**
- [ ] Patient Service starts on 5002
- [ ] Gateway routes /patients/* to it
- [ ] Patient CRUD operations work
- [ ] Frontend patient data loads

**Commit:** `feat(phase-1b): extract Patient Service, gateway routes /patients to it`

---

### 1b.3 Create Registry Service
**Deliverables:**
- [ ] Create `backend/services/registry-service/`
- [ ] Registry Service on port 5100
- [ ] REST endpoints: GET/POST/PUT/DELETE /modules

**Update API Gateway routing:**
```javascript
app.use('/api/modules', httpProxy('http://registry-service:5100'));
// ... other services above
```

**Testing & Commit:**
- [ ] Registry Service runs on 5100
- [ ] Gateway routes /modules/* to it
- [ ] Module registry works

**Commit:** `feat(phase-1b): extract Registry Service, gateway routes /modules to it`

---

### 1b.4 Summary After Phase 1b
**Architecture at this point:**
```
Frontend (4200)
  ↓ calls
API Gateway (5000)
  ├─ /api/auth/* → Auth Service (5001)
  ├─ /api/patients/* → Patient Service (5002)
  ├─ /api/modules/* → Registry Service (5100)
  └─ /api/* → Old Backend (8001) [all other endpoints]
```

**State:**
- ✅ All frontend functionality intact
- ✅ 3 infrastructure services working
- ✅ 4 independent services running
- ✅ Every commit is a valid, deployable state
- ✅ No risk - can rollback any moment
**Deliverables:**
- [ ] Create `backend/services/api-gateway/` directory
- [ ] Express app that routes requests to appropriate services
- [ ] Load service registry from Registry Service on startup
- [ ] Implement basic request routing logic:
  ```
  /api/patients/* → Patient Service
  /api/vitals/* → Vitals Service
  /api/medications/* → Medications Service
  ... etc
  ```
- [ ] Authentication middleware (forwards auth header, validates token)
- [ ] Error handling and response aggregation
- [ ] Docker & docker-compose integration (port 5000)
- [ ] README documenting endpoints

**Files to create:**
- `backend/services/api-gateway/server.js`
- `backend/services/api-gateway/routes/router.js`
- `backend/services/api-gateway/middleware/auth.js`
- `backend/services/api-gateway/Dockerfile`
- `backend/services/api-gateway/package.json`

**Testing:**
- Manually route requests through gateway to verify they reach backend

---

### 1.2 Extract & Enhance Auth Service
**Deliverables:**
- [ ] Create `backend/services/auth-service/` from existing auth code
- [ ] Refactor current `backend/routes/auth.js` into Auth Service
- [ ] Auth Service owns `auth-db` in MongoDB
- [ ] API endpoints:
  ```
  POST /auth/login
  POST /auth/refresh
  POST /auth/logout
  GET /auth/verify (verify token without refresh)
  ```
- [ ] Docker & docker-compose (port 5001)

**Files to create:**
- `backend/services/auth-service/server.js`
- `backend/services/auth-service/routes/auth.js`
- `backend/services/auth-service/Dockerfile`
- `backend/services/auth-service/package.json`

**Testing:**
- Test login/refresh/logout flows through API Gateway

---

### 1.3 Create Patient Identity Service
**Deliverables:**
- [ ] Create `backend/services/patient-service/`
- [ ] Extract patient record basics (ID, DOB, demographics, contact info)
- [ ] Patient Search/Lookup endpoint
- [ ] Owns `patients-db` in MongoDB
- [ ] API endpoints:
  ```
  GET /patients
  GET /patients/:id
  POST /patients
  PUT /patients/:id
  DELETE /patients/:id
  GET /patients/search?query=...
  ```
- [ ] Docker & docker-compose (port 5002)
- [ ] Health check endpoint: `GET /health`

**Files to create:**
- `backend/services/patient-service/server.js`
- `backend/services/patient-service/routes/patients.js`
- `backend/services/patient-service/models/patient.js`
- `backend/services/patient-service/Dockerfile`
- `backend/services/patient-service/package.json`

**Data migration:**
- Migration script: Extract patient documents from current MongoDB to new patients-db
- Script: `backend/scripts/migrate-patients.js`

---

### 1.4 Create Registry Service
**Deliverables:**
- [ ] Create `backend/services/registry-service/`
- [ ] Load initial registry from `backend/registry.json`
- [ ] API endpoints:
  ```
  GET /modules (list all active modules)
  GET /modules/:id (get single module)
  POST /modules (register new module)
  PUT /modules/:id (update module)
  DELETE /modules/:id (deregister module)
  PATCH /modules/:id/enable
  PATCH /modules/:id/disable
  POST /modules/:id/health-check (test if remoteEntry is accessible)
  ```
- [ ] Owns `registry-db` in MongoDB
- [ ] Self-registration API (services can register themselves on startup)
- [ ] Docker & docker-compose (port 5100)

**Files to create:**
- `backend/services/registry-service/server.js`
- `backend/services/registry-service/routes/modules.js`
- `backend/services/registry-service/models/module.js`
- `backend/services/registry-service/Dockerfile`
- `backend/services/registry-service/package.json`

**Data migration:**
- Load `backend/registry.json` into registry-db on startup
- Migration script: `backend/scripts/migrate-registry.js`

---

### 1.5 Update docker-compose.yml
**Deliverables:**
- [ ] Add services to docker-compose:
  - api-gateway (5000)
  - auth-service (5001)
  - patient-service (5002)
  - registry-service (5100)
- [ ] Keep old monolithic backend for now (port 5001 → temporarily rename to 8001)
- [ ] All services depend on MongoDB
- [ ] Health checks for each service
- [ ] Environment variables for service URLs

**File to update:**
- `docker-compose.yml`

**Testing Phase 1:**
```bash
docker-compose up
# Test endpoints through API Gateway
curl http://localhost:5000/api/patients
curl http://localhost:5000/api/auth/login -X POST ...
curl http://localhost:5100/modules
```

---

## PHASE 2: Domain Services Extraction (Week 2)
**Goal:** Extract first batch of domain services (least coupled to each other)

### 2.1 Create Vitals Service
**Deliverables:**
- [ ] Create `backend/services/vitals-service/`
- [ ] Extract from current monolith (routes/vitals.js)
- [ ] Owns `vitals-db` in MongoDB
- [ ] API endpoints:
  ```
  GET /vitals/:patientId
  POST /vitals/:patientId
  PUT /vitals/:patientId/:vitalId
  GET /vitals/:patientId/trends
  ```
- [ ] Service calls Patient Service to validate patient exists
- [ ] Docker & docker-compose (port 5003)

**Files to create:**
- `backend/services/vitals-service/server.js`
- `backend/services/vitals-service/routes/vitals.js`
- `backend/services/vitals-service/models/vital.js`
- `backend/services/vitals-service/services/patient-client.js` (calls Patient Service)
- `backend/services/vitals-service/Dockerfile`

**Data migration:**
- Migrate vitals data to vitals-db
- Script: `backend/scripts/migrate-vitals.js`

---

### 2.2 Create Care Team Service
**Deliverables:**
- [ ] Create `backend/services/care-team-service/`
- [ ] Extract team management logic
- [ ] Owns `care-team-db` in MongoDB
- [ ] API endpoints similar to current implementation
- [ ] Docker & docker-compose (port 5007)

---

### 2.3 Create Labs Service (Simplified)
**Deliverables:**
- [ ] Create `backend/services/labs-service/`
- [ ] Extract labs data and endpoints
- [ ] Owns `labs-db` in MongoDB
- [ ] Docker & docker-compose (port 5005)

---

### 2.4 Update API Gateway Routing
**Deliverables:**
- [ ] Update router to route to new domain services
- [ ] Test all endpoints work through gateway

**Testing Phase 2:**
```bash
docker-compose up
# Test domain service endpoints
curl http://localhost:5000/api/vitals/20001
curl http://localhost:5000/api/care-team
curl http://localhost:5000/api/labs/20001
```

---

## PHASE 3: Integration & Validation (Week 3)
**Goal:** Complete domain service extraction, validate everything works together

### 3.1 Extract Remaining Domain Services
**Deliverables:**
- [ ] Medications Service (port 5004)
- [ ] Visits Service (port 5006)
- [ ] Procedures Service (port 5008)

---

### 3.2 Decommission Monolithic Backend
**Deliverables:**
- [ ] Verify all endpoints work through API Gateway
- [ ] Remove old monolithic server.js
- [ ] Update docker-compose to remove old backend
- [ ] Final docker-compose.yml with 10 services:
  - 1 MongoDB
  - 1 API Gateway
  - 1 Auth Service
  - 1 Patient Service
  - 1 Registry Service
  - 6 Domain Services

---

### 3.3 Cross-Service Communication Testing
**Deliverables:**
- [ ] Test service-to-service calls work (e.g., Vitals → Patient verification)
- [ ] Test error handling when a service is down
- [ ] Performance testing: response times through API Gateway

---

### 3.4 Create Data Migration Scripts
**Deliverables:**
- [ ] Comprehensive migration script: `backend/scripts/migrate-all.js`
- [ ] Tests to verify data integrity post-migration
- [ ] Rollback procedure documented

---

### 3.5 Update Frontend
**Deliverables:**
- [ ] Update API endpoints in frontend if any changed
- [ ] Update environment variables (API_URL still points to 5000)
- [ ] Test all modules work with new backend structure

---

## PHASE 4: Admin Dashboard + Documentation (Week 4)
**Goal:** Add management UI and comprehensive documentation

### 4.1 Create Admin Dashboard Module
**Deliverables:**
- [ ] Create `frontend/modules/admin-dashboard/`
- [ ] Generate Angular module structure with components:
  - ModuleListComponent (display all modules)
  - ModuleFormComponent (register/edit module)
  - ModuleHealthComponent (show health status)
- [ ] Service: AdminModuleService (calls Registry Service APIs)
- [ ] Role-based access (only 'admin' role can see this module)
- [ ] Docker & docker-compose (port 4208)

**Features:**
- [ ] List all registered modules with status
- [ ] Register new module (form validation)
- [ ] Update module details
- [ ] Deregister module (with confirmation)
- [ ] Enable/disable module (toggle without deletion)
- [ ] Health check (test if remoteEntry.js is accessible)
- [ ] Real-time status indicators (online/offline)

---

### 4.2 Update Shell App
**Deliverables:**
- [ ] Add route to Admin Dashboard module (protected by role guard)
- [ ] Navigation menu item visible only to admins
- [ ] Update dynamic routes to include admin-dashboard

---

### 4.3 Documentation
**Deliverables:**
- [ ] Create `docs/MICROSERVICES_ARCHITECTURE.md`:
  - Overview of all 10 services
  - Service responsibilities
  - Database schema per service
  - API endpoints per service
  - Service dependencies
  - Communication patterns

- [ ] Create `docs/howto/EXTRACTING_DOMAIN_SERVICES.md`:
  - Step-by-step guide for extracting a new domain service
  - Database migration pattern
  - API endpoint template
  - Docker setup
  - Integration with API Gateway

- [ ] Create `docs/howto/SERVICE_REGISTRATION.md`:
  - How services self-register with Registry Service
  - How frontend discovers modules
  - Adding a new module to the registry

- [ ] Update `README.md`:
  - Add "Scaled Backend Architecture" section
  - Update architecture diagram to show microservices
  - Update docker-compose section

- [ ] Create `docs/DEPLOYMENT_MICROSERVICES.md`:
  - How to deploy microservices (local Docker)
  - How to scale individual services
  - Health checks and monitoring

---

### 4.4 Testing & Validation
**Deliverables:**
- [ ] Integration tests:
  - End-to-end API Gateway tests
  - Service-to-service communication tests
  - Auth flow through API Gateway tests
- [ ] Load testing (simulate multiple concurrent requests)
- [ ] Failure scenarios (service down, database down)
- [ ] Admin Dashboard functionality tests

---

## Testing Checklist

### Phase 1 Validation
- [ ] API Gateway routes requests correctly
- [ ] Auth Service login/refresh/logout work
- [ ] Patient Service CRUD operations work
- [ ] Registry Service endpoints work
- [ ] Services register/deregister modules
- [ ] All 4 services start without errors

### Phase 2 Validation
- [ ] Vitals Service works independently
- [ ] Care Team Service works independently
- [ ] Labs Service works independently
- [ ] Services can call Patient Service to verify patient exists
- [ ] API Gateway routes all domain service requests correctly

### Phase 3 Validation
- [ ] All domain services extracted and working
- [ ] Old monolithic backend removed
- [ ] All frontend modules work with new backend
- [ ] Data migration complete with zero data loss
- [ ] Response times acceptable through API Gateway

### Phase 4 Validation
- [ ] Admin Dashboard loads without errors
- [ ] Can list modules in Admin Dashboard
- [ ] Can register new module via Admin Dashboard
- [ ] Can update module via Admin Dashboard
- [ ] Can deregister module via Admin Dashboard
- [ ] Module health checks work
- [ ] Documentation is complete and accurate

---

## Deliverables Summary

**End of Week 1:**
- API Gateway working
- Auth Service operational
- Patient Identity Service operational
- Registry Service operational
- 4 services in docker-compose, all communicating

**End of Week 2:**
- 3 domain services extracted (Vitals, Care Team, Labs)
- All routing through API Gateway works
- Data migration from monolith to domain databases

**End of Week 3:**
- All 6 domain services extracted
- Old monolithic backend decommissioned
- Complete docker-compose with 10 services
- All integration tests passing

**End of Week 4:**
- Admin Dashboard module complete and functional
- Comprehensive documentation
- Ready to present as complete microservices reference architecture

---

## Post-Implementation (Optional Future Work)

### Event-Driven Architecture
- Add RabbitMQ/Kafka as event bus
- Services publish events when things change
- Example: "Vital recorded" event triggers Care Team notification

### Service Discovery
- Move from hardcoded service URLs to Consul/Eureka
- Services register themselves dynamically
- API Gateway discovers services automatically

### Distributed Tracing
- Add OpenTelemetry/Jaeger
- Trace requests across all services
- Performance monitoring

### Separate MongoDB Instances
- Each service gets its own MongoDB
- True data isolation
- Phase from shared instance to separate instances

---

## Success Criteria

✅ **Organizational Scaling Message:** 
"7 independent backend teams (1:1 with frontend teams), each owning a service, deploying independently"

✅ **Working Architecture:**
All 10 services running, communicating, fully functional

✅ **Maintainable Code:**
Clear service boundaries, easy to understand each service's responsibility

✅ **Reference Implementation:**
Complete example someone can clone and extend with their own domain services

✅ **Ready for LinkedIn:**
Complete case study showing full-stack team scaling with microservices + micro-frontends
