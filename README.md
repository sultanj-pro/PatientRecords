# PatientRecords - Micro-Frontend Medical Records System

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/sultanj-pro/PatientRecords/blob/main/LICENSE)

A modern, scalable healthcare information system built with Angular 17, Module Federation micro-frontend architecture, and a fully decomposed microservices backend.

## Table of Contents

- 📋 [Overview](#overview)
  - 🔬 [Module Federation Case Study](#module-federation-case-study)
  - 🚀 [Future Vision](#future-vision)
  - ✨ [Key Capabilities](#key-capabilities)
- 🛠️ [Technology Stack](#technology-stack)
- 🏗️ [System Architecture](#system-architecture)
- 🚀 [Quick Start](#quick-start)
- 📁 [Project Structure](#project-structure)
- ✨ [Features](#features)
- 💻 [Development](#development)
- 🐳 [Deployment](#deployment)
- 📡 [API Documentation](#api-documentation)
- ⚠️ [Troubleshooting](#troubleshooting)
- 🗺️ [Roadmap](#roadmap)
- 📚 [Additional Resources](#additional-resources)
- 👥 [Contributing](#contributing)
- 📝 [License](#license)
- 📞 [Support](#support)

## Overview 

PatientRecords is a production-grade reference architecture demonstrating **how to scale engineering teams and systems together**. Built on Module Federation, it solves the central challenge faced by growing organizations: maintaining velocity and autonomy as team count increases.

### Case Study Purpose

**PatientRecords is a case study project** designed to provide a framework and reference implementation for building large-scale systems incrementally. It demonstrates:

- **Incremental Architecture** — Building systems piece by piece without architectural rewrites
- **Module Federation Frontends** — Managing multiple teams and technology choices in a unified UI
- **Microservices Backend** — Fully decomposed backend with API Gateway, Auth, Patient, Registry, and 5 clinical domain services, each in its own container
- **Production Patterns** — Real-world architectural patterns applicable to enterprises of any size
- **Team Autonomy at Scale** — How independent teams deliver independent modules with independent deploy cadences

**All of this can be achieved using this software.** PatientRecords provides a fully functional, working implementation you can:
- Clone and run immediately with Docker
- Extend with your own modules
- Study and learn from
- Use as a foundation for your own systems
- Adapt for your organization's architecture

**Target Audience:**
- Engineering leaders designing large-scale systems
- Architects planning multi-team organizations
- Teams adopting Module Federation for the first time
- Organizations evolving from monoliths to service-oriented architectures

**Use Case:** Educational, architectural reference, and production pattern demonstration. Not intended as production healthcare software (see [Liability & Compliance Disclaimer](#license)).

### The Core Problem This Solves

After leading organizations from 3 to 300+ engineers, I've witnessed the same pattern repeatedly:
- **Architectural coupling** becomes the bottleneck, not development capacity
- **Technology monoculture** forces all teams to work in the same framework, regardless of problem fit
- **Deployment coordination** turns minor changes into coordinated releases
- **Team autonomy** gets sacrificed for consistency

**PatientRecords demonstrates the inverse:** Independent teams shipping independent code.

### Module Federation as Organizational Scaling Pattern

This isn't just a technical pattern—it's a **team organization pattern**. Each module can have:
- Its own team (1-5 engineers)
- Independent deploy cadence (ship on team's schedule)
- Technology choice (Angular, React, Vue—whatever fits)
- Own testing & QA process
- Separate code review gates

**The mathematics:** N independent teams with monolithic architecture requires ~N² coordination overhead. Module Federation reduces this to ~N.

### Module Federation Case Study

**PatientRecords demonstrates production-grade Module Federation architecture:**

✅ **Proven Results:**
- Successfully running **6 Angular modules + 1 React module** in a single unified shell application
- Independent modules built with different frameworks coexist seamlessly via Module Federation
- Real-time cross-framework state synchronization (patient context, authentication)
- Modules maintain complete independence: deploy, update, and scale separately
- Shared dependencies managed efficiently—no duplication of React, Angular, or RxJS
- Deep-linking and navigation work across all framework types

**Key Insight:** Module Federation successfully enables true technology flexibility. Teams adopt the right tool for their problem, not the organizational standard. This is how you scale engineering from startup to enterprise without architectural ossification.

### Why This Matters for Leadership

See **[ARCHITECTURE_LEADERSHIP.md](./ARCHITECTURE_LEADERSHIP.md)** for strategic insights on:
- When to choose Module Federation vs. alternatives
- Team structure implications
- Deployment autonomy patterns
- Risk management at scale

See **[LESSONS_LEARNED.md](./LESSONS_LEARNED.md)** for 20+ years of patterns and anti-patterns from building systems at scale.

### Current State (Implemented)

- **Microservices Backend** — API Gateway (5000) + Auth (5001) + Patient (5002) + Vitals/Labs/Medications/Visits/Care-Team domain services (5003–5007) + Registry (5100), all in separate containers
- **Admin Dashboard** — Runtime module management: enable/disable modules, edit per-module role permissions, view service health grid
- **7 Micro-frontends** — 6 Angular modules + 1 React module, all dynamically loaded via plugin registry

### Future Vision

This foundation will evolve into:
- **Agentic AI Integration** — Autonomous agents for clinical decision support, schedule optimization, and real-time alerts
- **Edge Computing** — Offline-capable modules with local-first architecture and cloud sync
- **Advanced Module Orchestration** — Dynamic module loading based on user roles, device capabilities, and network conditions

### Key Capabilities
- **Multi-framework micro-frontends** — 6 Angular modules + 1 React module via Module Federation
- **Multi-module clinical system** with demographics, vitals, medications, visits, labs, care team, and procedures
- **Microservices backend** — API Gateway routing to 8 independent domain services
- **Admin Dashboard** — Runtime module management with enable/disable toggles and per-module role editor
- **Shareable patient URLs** with deep-linkable module views (`/dashboard/:module/:patientId`)
- **Real-time patient context sync** across all modules using Observable pattern
- **Real-time session management** with automatic token refresh
- **Role-based access control** (RBAC) for clinical workflows — roles: `admin`, `physician`, `nurse`
- **Framework-agnostic module loading** — load Angular or React modules dynamically
- **Responsive web design** for desktop and tablet use
- **Containerized deployment** using Docker and Docker Compose (17 containers)
- **Comprehensive API** with OpenAPI/Swagger documentation and structured JSON logging

[⬆️ Back to Top](#table-of-contents)

## Technology Stack

### Frontend
- **Angular 17** — Shell application and 6 micro-frontend modules
- **React 18** — Procedures micro-frontend module demonstrating multi-framework support
- **Module Federation** — Multi-framework orchestration via @angular-architects/module-federation and Webpack Module Federation
- **TypeScript 5** — Type-safe JavaScript development
- **RxJS 7** — Reactive programming with Observables
- **Karma & Jasmine** — Unit testing framework
- **Nginx** — Reverse proxy and HTTP server for production deployments

### Backend (Microservices)
- **API Gateway** (port 5000) — Single entry point, request routing, JWT validation
- **Auth Service** (port 5001) — Login, token refresh/logout, role derivation
- **Patient Service** (port 5002) — Patient CRUD and search
- **Vitals Service** (port 5003) — Vital signs with structured logging
- **Labs Service** (port 5004) — Lab results
- **Medications Service** (port 5005) — Medication management
- **Visits Service** (port 5006) — Clinical encounter records
- **Care Team Service** (port 5007) — Team member management
- **Registry Service** (port 5100) — Plugin registry: module metadata, enable/disable, role management
- **Node.js 18+ / Express.js** — Runtime and framework for all services
- **MongoDB with Mongoose** — Shared NoSQL data store
- **JWT (jsonwebtoken)** — Stateless auth; role derived from username (`admin`→admin, `doc*`→physician, else→nurse)
- **Swagger/OpenAPI** — API documentation at `/api-docs` on every service
- **Jest** — Testing framework with coverage reporting

### Infrastructure & DevOps
- **Docker** — Containerization for consistent deployments
- **Docker Compose** — Multi-container orchestration
- **Docker Registry** — Private container image registry
- **PostgreSQL** — Relational database support for migrations
- **Alpine Linux** — Lightweight base images

### Build & Development Tools
- **Angular CLI 17** — Angular development and build tooling
- **Nx** — Monorepo management with task orchestration
- **npm Workspaces** — Monorepo organization

[⬆️ Back to Top](#table-of-contents)

## System Architecture

### Micro-Frontend Design

The system uses Angular Module Federation to isolate clinical modules within a shell application:

<div align="center">

![PatientRecords System Architecture](docs/diagrams/system-architecture.svg)

</div>

### Patient Context Sharing & URL-Based Routing

#### Shareable Patient URLs (Phase 6a)

Direct patient-module access with shareable URLs:

**URL Pattern**: `/dashboard/:module/:patientId`

Examples:
- `/dashboard/vitals/20001` - Vitals view for patient 20001
- `/dashboard/medications/20002` - Medications for patient 20002
- `/dashboard/labs/20003` - Lab results for patient 20003

**Key Features**:
- Copy/paste URLs to share specific patient views with colleagues
- Browser refresh preserves patient and module context
- Login flow preserves intended destination via `returnUrl`
- Patient selection updates URL while staying on current tab

**Cross-Module State Synchronization**:
- All modules watch `localStorage.__PATIENT_CONTEXT__` via RxJS Observable (500ms interval)
- Patient selection in one module instantly refreshes all other loaded modules
- No page refresh required when switching patients
- Type-safe patientId handling with explicit String conversion

**Implementation Details**:
- Dashboard component syncs from URL on both initial load and route changes
- Patient context stored in localStorage as single source of truth
- All modules implement identical Observable pattern for consistency
- URL navigation uses `navigateByUrl()` for full path preservation

### Authentication & Session Management

#### Token Refresh Strategy (Phase 5d)

Two-tier approach for uninterrupted user experience:

**Tier 1: Proactive Refresh**
- Client checks if JWT expiring within 5 minutes
- Automatically refreshes token before expiration
- User continues working without interruption

**Tier 2: Reactive Refresh**
- On any 401 response, attempt immediate token refresh
- Retry original request with new token
- Fallback to login only if refresh fails

**JWT Token Format**
```json
{
  "sub": "user_id",
  "email": "user@example.com",
  "roles": ["doctor", "admin"],
  "iat": 1234567890,
  "exp": 1234571490
}
```

**Expiration**: 1 hour (3600 seconds)
**Refresh Endpoint**: `POST /auth/refresh` with current token

[⬆️ Back to Top](#table-of-contents)

## Quick Start

### Prerequisites
- Docker Engine 20.10+
- Docker Compose 2.0+
- Node.js 18+ (for local development)

### Running with Docker

1. **Clone the repository**
   ```bash
   git clone https://github.com/sultanj-pro/PatientRecords.git
   cd PatientRecords
   ```

2. **Start all services**
   ```bash
   docker compose up -d
   ```

3. **Verify services are running**
   ```bash
   docker compose ps
   ```

   Expected output (17 containers):
   ```
   NAME                                STATUS    PORTS
   # Frontend micro-frontends
   patientrecord-shell                 Up        0.0.0.0:4200->4200/tcp
   patientrecord-demographics          Up        0.0.0.0:4201->4200/tcp
   patientrecord-vitals                Up        0.0.0.0:4202->4200/tcp
   patientrecord-labs                  Up        0.0.0.0:4203->4200/tcp
   patientrecord-medications           Up        0.0.0.0:4204->4200/tcp
   patientrecord-visits                Up        0.0.0.0:4205->4200/tcp
   patientrecord-care-team             Up        0.0.0.0:4206->4200/tcp
   patientrecord-procedures            Up        0.0.0.0:4207->4200/tcp  (React)
   # Backend microservices
   patientrecord-api-gateway           Up        0.0.0.0:5000->5000/tcp
   patientrecord-auth-service          Up        0.0.0.0:5001->5001/tcp
   patientrecord-patient-service       Up        0.0.0.0:5002->5002/tcp
   patientrecord-vitals-service        Up        0.0.0.0:5003->5003/tcp
   patientrecord-labs-service          Up        0.0.0.0:5004->5004/tcp
   patientrecord-medications-service   Up        0.0.0.0:5005->5005/tcp
   patientrecord-visits-service        Up        0.0.0.0:5006->5006/tcp
   patientrecord-care-team-service     Up        0.0.0.0:5007->5007/tcp
   patientrecord-registry-service      Up        0.0.0.0:5100->5100/tcp
   patientrecord-mongo                 Up        0.0.0.0:27017->27017/tcp
   ```

4. **Access the application**

   - **Web UI**: http://localhost:4200
   - **Admin Panel**: http://localhost:4200/admin *(login as `admin` / `password123`)*
   - **Direct Patient View**: http://localhost:4200/dashboard/vitals/20001
   - **Procedures Module** (React): http://localhost:4200/dashboard/procedures/20001
   - **API Gateway**: http://localhost:5000
   - **API Documentation**: http://localhost:5000/api-docs
   - **System Health**: http://localhost:5000/health/deep

5. **Default credentials**

   | Username | Password | Role |
   |---|---|---|
   | `admin` | `password123` | Admin — access to Admin Panel |
   | `doc1` | `password123` | Physician — clinical modules |
   | `nurse1` | `password123` | Nurse — clinical modules |

6. **Test patients** (with varied clinical data)
   - Patient 20001 (Sarah Mitchell): Healthy, minimal medications
   - Patient 20002 (John Anderson): Hypertension/diabetes, 3 medications
   - Patient 20003 (Emily Rodriguez): Prenatal care, optimal vitals
   - Patient 20004 (Michael Thompson): Complex cardiac, 4 medications
   - Patient 20005 (Jennifer Kumar): Thyroid/psychiatric, 2 medications

### Local Development

1. **Install dependencies**
   ```bash
   # Shell App
   cd frontend/shell-app
   npm install

   # Shared Library
   cd ../shared
   npm install

   # Individual Module (example: demographics)
   cd ../modules/demographics
   npm install

   # Backend
   cd backend
   npm install
   ```

2. **Run development servers**
   ```bash
   # Terminal 1: Shell App
   cd frontend/shell-app
   npm start

   # Terminal 2: Demographics Module
   cd frontend/modules/demographics
   npm start

   # Terminal 3: Backend API
   cd backend
   npm start
   ```

3. **Access during development**
   - Shell: http://localhost:4200
   - Demographics: http://localhost:4201
   - Backend: http://localhost:5001

[⬆️ Back to Top](#table-of-contents)

## Project Structure

```
PatientRecords
├── frontend/
│   ├── shell-app/              # Main application shell
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── core/       # Services, guards, interceptors
│   │   │   │   ├── components/ # Login, dashboard, error pages
│   │   │   │   └── app.routes.ts # Protected routes with AuthGuard
│   │   │   └── main.ts
│   │   ├── angular.json
│   │   └── Dockerfile
│   │
│   ├── modules/                # Micro-frontend modules
   │   ├── demographics/       # Patient demographics module (Angular)
   │   ├── vitals/            # Vital signs module (Angular)
   │   ├── medications/       # Medications module (Angular)
   │   ├── labs/              # Laboratory results module (Angular)
   │   ├── visits/            # Clinical visits module (Angular)
   │   ├── care-team/         # Care team module (Angular)
   │   └── procedures-react/  # Procedures module (React) ⭐ Multi-Framework showcase
│   │
│   └── shared/                 # Shared library
│       └── lib/
│           ├── services/       # TokenService, AuthService
│           ├── models/         # DTO, interface definitions
│           └── index.ts
│
├── backend/
│   ├── services/
│   │   ├── api-gateway/       # Port 5000 — routing, JWT validation
│   │   ├── auth-service/      # Port 5001 — login, refresh, logout
│   │   ├── patient-service/   # Port 5002 — patient CRUD
│   │   ├── vitals-service/    # Port 5003 — vital signs
│   │   ├── labs-service/      # Port 5004 — lab results
│   │   ├── medications-service/ # Port 5005 — medications
│   │   ├── visits-service/    # Port 5006 — clinical visits
│   │   ├── care-team-service/ # Port 5007 — care team
│   │   └── registry-service/  # Port 5100 — plugin registry + admin API
│   ├── init-db.js             # MongoDB initialization
│   └── Dockerfile
│
├── mongo/                      # MongoDB container setup
│   └── Dockerfile
│
├── migrations/
│   └── 001_init.sql           # Database initialization
│
├── scripts/
│   ├── apply_migrations.ps1   # Database schema setup
│   └── smoke_check.js         # Service health validation
│
├── docker-compose.yml         # Multi-container orchestration
├── docker-compose.override.postgres.yml # Alternative DB config
└── README.md                  # This file
```

[⬆️ Back to Top](#table-of-contents)

## Features

### Clinical Modules

**Demographics Module** (Angular)
- Patient personal information management
- Contact details and emergency contacts
- Insurance and billing information
- Medical history

**Vitals Module** (Angular)
- Blood pressure, temperature, heart rate monitoring
- Respiratory rate tracking
- Real-time trend visualization
- Historical audit trail

**Medications Module** (Angular)
- Active medication inventory
- Prescription history
- Drug interaction checking
- Dosage management

**Labs Module** (Angular)
- Laboratory test results
- Report generation
- Result trending
- Integration with lab systems

**Visits Module** (Angular)
- Clinical encounter documentation
- Chief complaint and assessment
- Treatment plan tracking
- Follow-up scheduling

**Care Team Module** (Angular)
- Clinical team member management
- Role and specialty tracking
- Medical license verification
- Team communication

**Procedures Module** (React) ⭐
- Surgical and clinical procedures tracking
- Procedure scheduling and history
- Procedure status and outcomes
- **Demonstrates multi-framework support** — React module loaded alongside Angular modules via Module Federation

### Platform Features

**Admin Dashboard** ⚙️
- Accessible at `/admin` — visible only to users with `admin` role
- **Service health grid** — real-time status of all backend microservices via `/health/deep`
- **Module management table** — enable or disable any clinical module at runtime without redeployment
- **Inline role editor** — per-module role permissions (admin / physician / nurse) with save/cancel
- Changes persist to MongoDB via Registry Service admin API

**Microservices Backend** 🏗️
- **API Gateway** (port 5000) — single entry point; routes all `/api/*` traffic to the correct service
- **Auth Service** — stateless JWT; role derived from username prefix
- **5 Clinical Domain Services** — Vitals, Labs, Medications, Visits, Care Team — each independently deployable
- **Registry Service** — stores module metadata; admin endpoints protected by `role=admin` JWT check
- Structured JSON logging and deep health checks across all services

**Multi-Framework Architecture** ⭐
- **6 Angular micro-frontends** — Demographics, Vitals, Medications, Labs, Visits, Care Team
- **1 React micro-frontend** — Procedures module (loaded via `loadRemoteModule(type:'script')`)
- **Framework-agnostic loading** — Dynamic module discovery via registry
- **Shared dependencies** — React, React-DOM shared between shell and React module
- **Cross-framework state** — Patient context synchronized across all modules regardless of framework
- Production-ready pattern for adopting different frameworks in different modules

**Authentication & Authorization**
- JWT-based secure authentication
- Automatic token refresh with 5-minute buffer
- Session timeout protection
- Role-based access control (RBAC)
- Graceful session expiration handling
- **Deep-link preservation** — Direct URLs preserved after login redirect

**User Experience**
- Shareable patient URLs for collaboration
- Real-time patient context sync across all modules
- Patient selection stays on current tab while updating URL
- Responsive design for multiple devices
- Persistent login across module reloads
- Return URL navigation after login (preserves deep-linked patient URLs)
- Session expiration notifications
- Comprehensive error handling

**Development**
- TypeScript for type safety
- Standalone Angular components
- Module Federation for independent deployment
- Shared services across modules
- Unit test coverage with Jest

**Operations**
- Docker containerization
- Docker Compose orchestration
- Health check monitoring
- Environment configuration via .env
- Comprehensive logging

[⬆️ Back to Top](#table-of-contents)

## Development

### Adding a New Clinical Module

1. **Create module structure**
   ```bash
   cd frontend/modules
   mkdir new-module
   cd new-module
   ```

2. **Generate Angular module** (using Angular CLI templates)
   ```bash
   ng generate @nrwl/angular:app new-module
   ```

3. **Configure Module Federation** in `webpack.config.js`:
   ```javascript
   module.exports = withModuleFederation({
     name: 'new-module',
     filename: 'remoteEntry.js',
     exposes: {
       './Module': './src/app/app.module.ts',
     },
     shared: share({
       '@angular/core': { singleton: true, strictVersion: true },
       '@angular/common': { singleton: true, strictVersion: true },
       'rxjs': { singleton: true, strictVersion: true },
     }),
   });
   ```

4. **Update shell-app routing** to load new module:
   ```typescript
   {
     path: 'new-module',
     loadChildren: () => loadRemoteModule({
       type: 'module',
       remoteEntry: 'http://localhost:PORT/remoteEntry.js',
       exposedModule: './Module'
     }).then(m => m.AppModule)
   }
   ```

### Running Tests

```bash
# Shell App
cd frontend/shell-app
npm test

# Individual Module
cd frontend/modules/demographics
npm test

# Backend
cd backend
npm test

# With Coverage
npm run test:cov
```

### Code Style

- **Language**: TypeScript 5.0+
- **Formatter**: Prettier (config in workspace root)
- **Linter**: ESLint
- **Angular Version**: 17 (standalone components)

[⬆️ Back to Top](#table-of-contents)

## Deployment

### Docker Build Process

Each module follows a multi-stage build:

```dockerfile
# Stage 1: Build
FROM node:24-alpine AS builder
WORKDIR /app
COPY . .
COPY shared ../shared
RUN cd ../shared && npm install
RUN npm install
RUN npm run build

# Stage 2: Serve
FROM node:24-alpine
COPY --from=builder /app/dist /app
EXPOSE 4200
CMD ["node", "main.js"]
```

### Environment Configuration

Create `.env` file in root:
```env
NODE_ENV=production
API_URL=http://backend:5001
JWT_SECRET=your_secret_key_here
JWT_EXPIRATION=3600
MONGO_URL=mongodb://mongo:27017/patient-records
```

### Docker Compose Workflow

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f patientrecord-backend

# Stop services
docker compose down

# Rebuild images (fresh build)
docker compose build --no-cache

# Scale services
docker compose up -d --scale patientrecord-demographics=3
```

### Health Checks

Each container includes health checks:

```bash
# Check shell app
curl -f http://localhost:4200/index.html || exit 1

# Check backend API
curl -f http://localhost:5001/health || exit 1

# Check MongoDB
nc -z localhost 27017 || exit 1
```

[⬆️ Back to Top](#table-of-contents)

## API Documentation

### Base URL
```
http://localhost:5000/api
```
> All requests go through the **API Gateway** on port 5000. Direct service ports (5001–5007, 5100) are also accessible for development/debugging.

### Authentication Endpoints

**Login**
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 3600,
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "roles": ["doctor"]
  }
}
```

**Refresh Token**
```http
POST /auth/refresh
Authorization: Bearer <current_token>

Response:
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 3600
}
```

**Logout**
```http
POST /auth/logout
Authorization: Bearer <token>

Response: { "success": true }
```

### Patient Endpoints

**List Patients**
```http
GET /patients
Authorization: Bearer <token>
```

**Get Patient Details**
```http
GET /patients/:id
Authorization: Bearer <token>
```

**Create Patient**
```http
POST /patients
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "dob": "1990-01-15",
  "gender": "M"
}
```

### Admin / Registry Endpoints

> Requires `role=admin` JWT token.

**List All Modules (including disabled)**
```http
GET /api/admin/registry
Authorization: Bearer <admin_token>
```

**Toggle Module Enable/Disable**
```http
PATCH /api/admin/registry/modules/:id/toggle
Authorization: Bearer <admin_token>

Response: { "id": "vitals", "enabled": false }
```

**Update Module Roles**
```http
PUT /api/admin/registry/modules/:id
Authorization: Bearer <admin_token>
Content-Type: application/json

{ "roles": ["admin", "physician"] }
```

**Service Health (deep)**
```http
GET /health/deep
Authorization: Bearer <token>
```

### OpenAPI/Swagger

Full API documentation available at:
```
http://localhost:5000/api-docs
```

[⬆️ Back to Top](#table-of-contents)

## Troubleshooting

### Container Issues

**Symptom**: Container exits immediately
```bash
# Check logs
docker compose logs patientrecord-shell

# Rebuild without cache
docker compose build --no-cache

# Start with verbose logging
docker compose up --verbose
```

**Symptom**: Port already in use
```bash
# Find process using port 4200
lsof -i :4200

# Kill process
kill -9 <PID>

# Or change port in docker-compose.yml
```

### Module Loading Issues

**Symptom**: Module Federation remote entry not loading
```
Error: Unable to resolve remoteEntry.js
```

**Solution**:
1. Verify module container is running: `docker compose ps`
2. Check module build completed: `docker compose logs patientrecord-demographics`
3. Verify port mapping correct in docker-compose.yml
4. Clear browser cache (Ctrl+Shift+Delete)

### Authentication Issues

**Symptom**: Session expires after 1 hour
```
Redirected to /login with sessionTimeout
```

**Expected behavior**: This is normal. User will be redirected to login with return URL automatically preserved.

**Customization**: Adjust token expiration in backend:
```javascript
// backend/routes/auth.js
const token = jwt.sign(payload, SECRET, { expiresIn: '2h' }); // Change duration
```

### Database Issues

**Symptom**: MongoDB connection refused
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```

**Solution**:
```bash
# Check MongoDB container running
docker compose ps patientrecord-mongo

# Restart MongoDB
docker compose restart patientrecord-mongo

# Check logs
docker compose logs patientrecord-mongo
```

### Build Failures

**Symptom**: TypeScript compilation errors
```
ERROR in src/app/app.component.ts (2, 30)
  TS2307: Cannot find module '@angular/core'
```

**Solution**: Rebuild shared library dependencies
```bash
# Shell App
cd frontend/shell-app
npm install

# Shared Library
cd ../shared
npm install

# Retry rebuild
docker compose build --no-cache patientrecord-shell
```

[⬆️ Back to Top](#table-of-contents)

## Roadmap

### Phase 6 (Current - Completed)
- [x] Shareable patient URLs with deep-linkable module views
- [x] Observable pattern for real-time cross-module patient sync
- [x] URL preservation through login flow
- [x] Varied test data for realistic clinical scenarios
- [ ] Advanced search and filtering
- [ ] Patient data export (PDF, Excel)
- [ ] Audit logging for HIPAA compliance
- [ ] Multi-language support

### Phase 7 (Priority - Next)

**Clinical Notes Module**

Essential foundational capability enabling physicians to document clinical observations, assessments, and clinical decision-making during patient encounters. Clinical notes serve as the authoritative record of care and provide critical context for all downstream AI agents and analytics.

#### Core Capabilities
- **Rich Text Clinical Notes** — WYSIWYG editor for detailed clinical documentation with formatting, templates, and structured data
- **Note Templates** — Pre-built templates for common encounter types (Physical Exam, Follow-up Visit, Procedure Note, etc.)
- **Vital Signs & Measurement Integration** — Auto-populate vital signs, lab results, and medications from patient record into notes
- **Historical Note Access** — View all previous clinical notes with timestamps and author attribution
- **Full-Text Search** — Search across all patient notes for clinical keywords, diagnoses, medications mentioned
- **Note Versioning & Audit Trail** — Track all note modifications with before/after versions for compliance

#### Clinical Context Integration
- Notes linked to specific visits and encounters
- Automatic timestamps and clinician attribution
- Cross-reference to labs, medications, and vital signs
- Patient-accessible summary view (patient portal integration future phase)

#### Compliance & Documentation
- HIPAA-compliant storage with encryption
- Complete audit trail of all note access and modifications
- Standardized formatting for regulatory requirements
- Meaningful Use and documentation standards support

#### System Architecture
- New "Clinical Notes" module on port 4207
- Backend storage with full-text indexing for search performance
- Integration with Visits module for encounter context
- Real-time sync with PatientContextService

---

### Phase 8 (Planned)

**Autonomous Clinical Decision Support Agents**

A suite of AI-driven autonomous agents that provide intelligent recommendations to healthcare professionals for enhanced diagnostic accuracy, prognosis, and treatment planning. All agent recommendations require explicit healthcare professional approval before implementation.

**Enabled by Phase 7**: Agents analyze clinical notes alongside structured patient data for comprehensive, context-aware recommendations.

#### Core Agent Capabilities
- **Medication Recommendation Agent** — Analyzes patient history, current medications, vitals, clinical notes, and lab results to recommend medication adjustments or changes
- **Diagnostic Data Agent** — Recommends specific labs, imaging, or other health data collection needed for better diagnosis based on clinical presentation
- **Treatment Planning Agent** — Suggests evidence-based treatment protocols based on patient conditions, comorbidities, clinical notes, and clinical guidelines
- **Care Coordination Agent** — Recommends specialist referrals or additional clinical team members based on patient needs documented in notes
- **Orchestration Agent** — Coordinates recommendations across all agents, prioritizes actions, manages dependencies, and ensures coherent multi-agent workflows

#### Approval Workflow
- All agent recommendations display in a review queue within the dashboard
- Healthcare professionals review recommendations with evidence-based reasoning displayed
- Clinician explicitly approves, modifies, or rejects recommendations before any action
- Approved recommendations generate orders (medication, lab requests, referrals)
- All agent interactions and approvals logged for compliance and audit trails

#### Data Sources & Intelligence
- **Clinical Notes** — Full clinical documentation from Phase 7 module
- **Patient Data** — Current medications, vitals, lab results, visit history, diagnoses, allergies
- **Clinical Guidelines** — Evidence-based treatment protocols and best practices
- **Drug Interaction Database** — Real-time interaction checking and contraindication warnings
- **Patient Outcomes** — Historical treatment outcomes for similar patient profiles

#### System Architecture
- Agents implemented as independent microservices or serverless functions
- Real-time patient data synchronization via PatientContextService
- Integration with Phase 7 clinical notes for context
- Integration with backend clinical database for rule evaluation
- Secure API communication with approval workflow engine

#### Safety & Compliance
- All recommendations include confidence scores and evidence citations
- Recommendations never auto-execute; human approval always required
- Complete audit trail of all AI decisions and clinician actions
- Explainability features show reasoning behind each recommendation
- HIPAA-compliant logging and data handling

#### Future Enhancements
- Machine learning models trained on historical patient outcomes
- Natural language processing for advanced clinical notes analysis
- Advanced predictive analytics for early intervention
- Multi-specialty collaboration recommendations
- Real-time alerts for critical clinical conditions

[⬆️ Back to Top](#table-of-contents)

## Additional Resources

**Strategic & Leadership**
- [Architecture Leadership: Organizational Scaling Patterns](./ARCHITECTURE_LEADERSHIP.md) — Why Module Federation, team structure implications, decision framework
- [Lessons Learned: 20+ Years Building Software at Scale](./LESSONS_LEARNED.md) — Patterns, anti-patterns, and principles from two decades of engineering leadership

**Technical Documentation**
- [Module Federation Implementation](./docs/PLUGIN_ARCHITECTURE_V2.md)
- [Micro-Frontend Architecture](./docs/MICRO_FRONTEND_ARCHITECTURE.md)
- [System Architecture Diagrams](./docs/SYSTEM_DIAGRAMS.md)
- [Backend README](./docs/backend/README.md)

### How-To Guides

**Module Development**
- [Adding a Module](./docs/howto/ADDING_A_MODULE.md) — Quick reference for adding new clinical modules
- [Add Remote Module (Detailed)](./docs/howto/ADD_REMOTE_MODULE_DETAILED.md) — Comprehensive step-by-step guide with all integration points
- [Module Federation Testing Quick Start](./docs/howto/QUICK_START_MF_TESTING.md) — Testing multi-framework modules

**Deployment & Operations**
- [Installation Guide](./docs/howto/INSTALLATION_GUIDE.md) — Complete setup and installation instructions
- [Customer Deployment Guide](./docs/howto/CUSTOMER_DEPLOYMENT_GUIDE.md) — Guide for deploying to customer environments
- [Deployment Implementation Roadmap](./docs/howto/DEPLOYMENT_IMPLEMENTATION_ROADMAP.md) — Deployment strategy and planning
- [On-Premise Deployment Test](./docs/howto/ONPREMISE_DEPLOYMENT_TEST.md) — Testing on-premise deployments

**Build & Configuration**
- [Build and Release](./docs/howto/BUILD_AND_RELEASE.md) — Build pipeline and release procedures
- [Registry Setup](./docs/howto/REGISTRY_SETUP.md) — Configuring the plugin registry
- [CI Secrets](./docs/howto/CI-SECRETS.md) — Managing secrets in CI/CD pipeline

[⬆️ Back to Top](#table-of-contents)

## Contributing

1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes and test locally
3. Build Docker images: `docker compose build`
4. Commit with descriptive message
5. Push to remote and create pull request

[⬆️ Back to Top](#table-of-contents)

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

**MIT License Summary:**
- ✅ Commercial use
- ✅ Modification
- ✅ Distribution
- ✅ Private use
- ⚠️ **Liability & Compliance Disclaimer**: 
  - PROVIDED AS-IS without any warranties or guarantees
  - NOT HIPAA compliant — Do not use in production healthcare systems
  - NOT certified for any security or compliance standards (SOC 2, ISO 27001, etc.)
  - NOT intended for handling real patient data or protected health information (PHI)
  - Use at your own risk; assumes full responsibility on user/organization
  - Suitable only for educational, research, and demonstration purposes
  - For production healthcare systems, conduct full security audit and compliance review

[⬆️ Back to Top](#table-of-contents)

## Support

For issues, questions, or suggestions:
- Create an issue on GitHub
- Contact the development team
- Check existing documentation

---

**Last Updated**: Plugin Architecture V2 - Complete with multi-framework micro-frontends
**System Status**: ✅ All services operational
**Latest Feature**: Multi-framework Module Federation (6 Angular + 1 React modules)
**Current Phase**: Phase 6 Complete - Ready for Phase 7 (Clinical Notes Module)
