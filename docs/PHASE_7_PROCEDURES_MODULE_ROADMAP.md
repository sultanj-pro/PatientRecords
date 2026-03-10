# Phase 7+: Procedures Micro-Frontend & Supporting Infrastructure

## Overview

This document outlines the implementation roadmap for extending PatientRecords with a React-based Procedures micro-frontend module and the supporting infrastructure needed to load, serve, and integrate it with the existing Angular shell application.

The Procedures module showcases:
- ✅ Cross-framework micro-frontend architecture (Angular shell + React module)
- ✅ Dynamic module loading via Module Federation
- ✅ Dynamic registry discovery
- ✅ Polyglot microservices (new BFF language)
- ✅ Production-ready containerization

---

## Current Architecture Status

### ✅ What Already Exists

**Registry & Discovery**
- `registry/registry.json` - Static module manifest with all 7 modules defined
- `PluginRegistryService` - Angular service to query registry
- Registry Nginx service (port 5000) - Serves registry.json over HTTP
- Procedures module entry already in registry (currently **disabled**)

**Shell Application**
- Angular 17 with Module Federation support
- Dashboard component with module routing
- Patient context synchronization
- Authentication & session management

**Existing Modules** (6 Angular modules)
- Demographics, Vitals, Labs, Medications, Visits, Care Team
- All using traditional Angular Module Federation

### ❌ What's Missing

1. **React Procedures Module**
   - Webpack Module Federation configuration
   - React components (ProceduresList, ProcedureDetail, etc.)
   - remoteEntry.js generation
   - Dockerfile for containerization

2. **Module Loader Service**
   - Dynamic remoteEntry.js loading capability
   - Component instantiation from federation config
   - React component mounting in Angular host

3. **Shell Integration**
   - Code to detect and load React modules
   - Handling mixed Angular/React routing
   - Cross-framework component rendering

4. **BFF-Procedures Backend API**
   - REST endpoints for procedures data
   - Patient procedure history
   - Procedure scheduling/management
   - Integration with core API

5. **Docker & Infrastructure**
   - Procedures module container
   - BFF-Procedures container
   - docker-compose service definitions

---

## Implementation Phases

### Phase 7.1: Dynamic Module Loader Service

**Goal**: Enable shell to dynamically load and render both Angular and React modules

**Deliverables**:
- `ModuleLoaderService` - Handles dynamic module loading
- Support for loading remoteEntry.js at runtime
- Component instantiation from federation config
- Error handling & fallbacks

**Files to Create**:
- `frontend/shell-app/src/app/core/services/module-loader.service.ts`
- `frontend/shell-app/src/app/shared/components/dynamic-module-container/dynamic-module-container.component.ts`

**Key Responsibilities**:
```
1. Load remoteEntry.js script dynamically
2. Initialize shared dependencies
3. Retrieve exposed module
4. Mount component in DOM (handles both Angular & React)
5. Handle errors gracefully
6. Cleanup on module unload
```

**Integration Points**:
- DashboardComponent queries PluginRegistryService for module metadata
- Dashboard passes metadata to ModuleLoaderService
- ModuleLoaderService loads and instantiates the module
- Component rendered in template outlet or DOM container

**Success Criteria**:
- ✅ Angular modules continue to work (no regression)
- ✅ React modules can be loaded dynamically
- ✅ Both framework types render in shell
- ✅ Component lifecycle properly managed
- ✅ Error handling prevents full page failure

---

### Phase 7.2: React Procedures Micro-Frontend Module

**Goal**: Build first React micro-frontend module using Module Federation

**Architecture**:
```
frontend/modules/procedures-react/
├── src/
│   ├── components/
│   │   ├── ProceduresList.jsx          # Main list view
│   │   ├── ProcedureDetail.jsx         # Detail view
│   │   ├── ProcedureTimeline.jsx       # Timeline visualization
│   │   └── ScheduleProcedure.jsx       # Scheduling interface
│   ├── hooks/
│   │   ├── usePatientContext.js        # Access patient context
│   │   └── useProcedures.js            # API data fetching
│   ├── services/
│   │   └── proceduresService.js        # API calls to BFF
│   ├── styles/
│   │   ├── procedures.css
│   │   └── variables.css
│   ├── ProceduresModule.jsx            # Main module export
│   ├── bootstrap.js                    # Entry point
│   └── index.js
├── webpack.config.js                   # Module Federation config
├── package.json
├── Dockerfile
├── nginx.conf                          # Production serving
└── .env.example
```

**Key Features**:
1. **Patient Context Integration**
   - Access currentPatientId from localStorage
   - Listen to patient-context-changed events
   - Real-time updates when patient changes

2. **API Integration**
   - Calls BFF-Procedures on port 5XXX
   - Follows same pattern as other modules
   - Includes auth headers

3. **React Components**
   - Functional components with hooks
   - React Query for data fetching (or SWR)
   - Responsive design matching Angular modules

4. **Module Federation Config**
   ```javascript
   new ModuleFederationPlugin({
     name: 'proceduresApp',
     filename: 'remoteEntry.js',
     exposes: {
       './ProceduresModule': './src/ProceduresModule'
     },
     shared: {
       react: { singleton: true, requiredVersion: '18.2.0' },
       'react-dom': { singleton: true, requiredVersion: '18.2.0' }
     }
   })
   ```

**Data Model**:
```typescript
interface Procedure {
  id: string;
  patientId: string;
  name: string;
  description: string;
  type: 'surgical' | 'diagnostic' | 'therapeutic';
  status: 'scheduled' | 'completed' | 'cancelled';
  scheduledDate: Date;
  completedDate?: Date;
  provider: string;
  location: string;
  notes: string;
  outcome?: string;
}
```

**API Endpoints** (via BFF):
- `GET /api/procedures/patient/{patientId}` - List procedures
- `GET /api/procedures/{id}` - Get procedure detail
- `POST /api/procedures` - Schedule procedure
- `PUT /api/procedures/{id}` - Update procedure
- `GET /api/procedures/{id}/timeline` - Procedure timeline

**Files to Create**:
- All files in `frontend/modules/procedures-react/`

**Success Criteria**:
- ✅ remoteEntry.js generates correctly
- ✅ Module loads in shell without errors
- ✅ Patient context updates reflected in real-time
- ✅ All CRUD operations work
- ✅ Styling consistent with other modules
- ✅ Error states handled gracefully
- ✅ Docker image builds successfully

---

### Phase 7.3: BFF-Procedures Backend Service

**Goal**: Create Backend-for-Frontend service for procedures data

**Decision**: Choose language based on requirements
- **Go**: High performance, resource-efficient (recommended)
- **Python**: Data-heavy operations
- **Node.js**: Consistency with existing services

**Assumed Choice**: **Go** (matches strategy: Node for common, Go for performance)

**Architecture**:
```
backend/bff-procedures/
├── main.go                    # Entry point
├── handlers/
│   ├── procedures.go          # HTTP handlers
│   └── middleware.go          # Auth, logging
├── services/
│   ├── procedures.go          # Business logic
│   └── cache.go               # Caching layer (Redis)
├── models/
│   ├── procedure.go
│   └── response.go
├── core/
│   └── client.go              # Core API client
├── Dockerfile
├── go.mod
├── go.sum
└── .env.example
```

**Go Implementation Pattern**:
```go
// Example: GET /procedures/patient/{patientId}
func (h *ProcedureHandler) ListProcedures(w http.ResponseWriter, r *http.Request) {
    // 1. Get patientId from URL
    // 2. Extract JWT and verify permissions
    // 3. Call core API: GET /patients/{id}/procedures
    // 4. Transform response to module format
    // 5. Apply caching (30-minute TTL)
    // 6. Return JSON
}
```

**Core API Integration**:
- Calls `http://core-api:5001/procedures/patient/{patientId}`
- Uses same auth headers as frontend request
- Aggregates data with related records (provider info, etc.)

**Caching Strategy**:
- Redis cache for procedures lists (30 min TTL)
- Invalidate on create/update/delete
- Per-patient cache keys

**Files to Create**:
- All files in `backend/bff-procedures/`

**Success Criteria**:
- ✅ All endpoints operational
- ✅ Proper error handling
- ✅ Performance benchmarks met (<100ms p95)
- ✅ Docker image builds
- ✅ Passes integration tests
- ✅ Proper logging/tracing

---

### Phase 7.4: Core API Extensions

**Goal**: Add procedures support to core API if not already present

**Check First**:
- Does `backend/server.js` already have `/procedures` endpoints?
- Is procedures data in MongoDB schema?

**If Needed**:

**Endpoints to Add**:
- `GET /procedures/patient/:patientId`
- `GET /procedures/:id`
- `POST /procedures`
- `PUT /procedures/:id`
- `DELETE /procedures/:id`

**Database Schema**:
```javascript
const procedureSchema = new Schema({
  patientId: String,
  name: String,
  description: String,
  type: String,
  status: String,
  scheduledDate: Date,
  completedDate: Date,
  provider: String,
  location: String,
  notes: String,
  outcome: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
```

**Files to Modify**:
- `backend/server.js` - Add routes
- `backend/models/` - Add Procedure model (if Mongoose used)

---

### Phase 7.5: Integration & Testing

**Goal**: Wire all components together and validate

**Integration Tasks**:

1. **Module Registry Update**
   - Enable procedures module in registry.json
   - Verify all federation config is correct

2. **Shell Integration**
   - Test routing to `/dashboard/procedures/{patientId}`
   - Verify patient context passes correctly
   - Test module loading/unloading

3. **API Integration**
   - Verify API Gateway routes procedures requests
   - Test auth flow
   - Test error scenarios

4. **Cross-Framework Testing**
   - Load Angular module
   - Load React module
   - Switch between both
   - Verify patient context sync

**Test Scenarios**:
- ✅ User navigates to procedures module
- ✅ Patient list loads correctly
- ✅ Procedure details display
- ✅ Creating new procedure works
- ✅ Switching patients updates data
- ✅ Error states handled
- ✅ Auth required for access
- ✅ Role-based access works

**Files to Modify/Create**:
- `frontend/shell-app/src/app/components/dashboard/dashboard.component.ts` - Add React loading logic
- Integration test specs
- E2E tests

---

### Phase 7.6: Containerization & Deployment

**Goal**: Package and deploy all new services

**Docker Files**:

1. **React Procedures Module** (`frontend/modules/procedures-react/Dockerfile`)
   ```dockerfile
   FROM node:18-alpine as builder
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci
   COPY . .
   RUN npm run build
   
   FROM nginx:alpine
   COPY --from=builder /app/dist /usr/share/nginx/html
   COPY nginx.conf /etc/nginx/nginx.conf
   EXPOSE 4207
   CMD ["nginx", "-g", "daemon off;"]
   ```

2. **BFF-Procedures** (`backend/bff-procedures/Dockerfile`)
   ```dockerfile
   FROM golang:1.21 AS builder
   WORKDIR /app
   COPY go.mod go.sum ./
   RUN go mod download
   COPY . .
   RUN CGO_ENABLED=0 go build -o server main.go
   
   FROM alpine:latest
   WORKDIR /root/
   COPY --from=builder /app/server .
   EXPOSE 5XXX
   CMD ["./server"]
   ```

**docker-compose.yml Updates**:
```yaml
patientrecord-procedures:
  build:
    context: ./frontend/modules/procedures-react
    dockerfile: Dockerfile
  ports:
    - "4207:4207"
  environment:
    - API_GATEWAY=http://api-gateway:5000
  depends_on:
    - api-gateway

bff-procedures:
  build:
    context: ./backend/bff-procedures
    dockerfile: Dockerfile
  ports:
    - "5XXX:5XXX"
  environment:
    - CORE_API=http://core-api:5001
  depends_on:
    - core-api
```

**Deployment Steps**:
```bash
# Build images
docker-compose build patientrecord-procedures bff-procedures

# Start services
docker-compose up -d patientrecord-procedures bff-procedures

# Verify
docker-compose ps
docker logs patientrecord-procedures
docker logs bff-procedures
```

**Success Criteria**:
- ✅ Containers build without errors
- ✅ Containers start and stay running
- ✅ Health checks pass
- ✅ Ports accessible
- ✅ All services can communicate

---

### Phase 7.7: Documentation & Portfolio Polish

**Goal**: Document everything for portfolio/knowledge transfer

**Documentation Files to Create**:

1. **PHASE_7_PROCEDURES_IMPLEMENTATION.md**
   - Step-by-step implementation guide
   - Code examples
   - Troubleshooting

2. **REACT_MODULE_FEDERATION.md**
   - How React Module Federation works
   - Shared dependencies management
   - Common issues

3. **MODULE_LOADER_ARCHITECTURE.md**
   - How dynamic module loading works
   - Architecture decisions
   - Extension points

4. **MULTI_FRAMEWORK_ARCHITECTURE.md**
   - Why Angular + React together
   - How to add new frameworks
   - Best practices

5. **UPDATE: README.md**
   - Add procedures module to architecture diagram
   - Update tech stack with React
   - Update capabilities list

**Success Criteria**:
- ✅ All code documented
- ✅ Architecture decisions explained
- ✅ Troubleshooting guide exists
- ✅ Examples for extending with new modules
- ✅ README reflects all changes

---

## Implementation Timeline

```
Phase 7.1: Module Loader Service          ~ 2-3 hours
Phase 7.2: React Procedures Module        ~ 4-6 hours
Phase 7.3: BFF-Procedures (Go)            ~ 3-4 hours
Phase 7.4: Core API Extensions            ~ 1-2 hours (if needed)
Phase 7.5: Integration & Testing          ~ 3-4 hours
Phase 7.6: Containerization               ~ 1-2 hours
Phase 7.7: Documentation                  ~ 2-3 hours
────────────────────────────────────────────────────
TOTAL                                    ~ 16-24 hours
```

---

## Dependencies & Prerequisites

### Technical Requirements
- Node.js 18+
- Go 1.21+
- Docker & Docker Compose
- npm/yarn

### Must Be Completed First
- ✅ Existing 6 Angular modules working
- ✅ PluginRegistryService functional
- ✅ Registry service operational
- ✅ API Gateway working
- ✅ Core API operational

### Must Exist
- ✅ registry.json with procedures entry
- ✅ AuthService in shell
- ✅ PatientContextService in shell
- ✅ Docker setup working

---

## Success Metrics

### Functional
- ✅ React module displays procedures for selected patient
- ✅ Patient context sync works across frameworks
- ✅ All CRUD operations functional
- ✅ Auth required and enforced
- ✅ Role-based access works

### Performance
- ✅ Module load time < 2 seconds
- ✅ API response < 200ms (p95)
- ✅ BFF response < 100ms (p95)
- ✅ No memory leaks on module load/unload

### Quality
- ✅ No console errors in browser
- ✅ Proper error handling/UI
- ✅ Responsive design works
- ✅ Docker images optimized
- ✅ All code documented

### Portfolio Value
- ✅ Demonstrates cross-framework architecture
- ✅ Shows dynamic loading capability
- ✅ Proves polyglot microservices work
- ✅ Shows production-ready practices
- ✅ Clear documentation for interviews

---

## Risk Management

| Risk | Mitigation |
|------|-----------|
| Module loading complexity | Comprehensive testing, error boundaries |
| Performance issues | Caching, lazy loading, monitoring |
| Cross-framework conflicts | Careful dependency management |
| Docker networking | Use docker-compose networking |
| Auth/CORS issues | Test early, verify headers |

---

## Next Steps

1. Review and approve this roadmap
2. Start Phase 7.1: Module Loader Service
3. Document decisions as you go
4. Test each phase before moving to next
5. Update README with cross-framework architecture
6. Create pull request with all changes

---

## Notes

- Each phase should be its own commit
- Test thoroughly before moving to next phase
- Document any deviations from this plan
- This is a portfolio showcase - prioritize clarity and production-readiness
- Consider performance implications of dynamic loading
