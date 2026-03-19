# PatientRecords - Visual System Diagrams

> **Last Updated:** March 18, 2026

## Current System State

| Layer | Components | Notes |
|---|---|---|
| Frontend Shell | Port 4200 (Angular 17) | Auth, routing, patient search, admin dashboard |
| Micro-Frontends | 4201–4207 (6 Angular + 1 React) | Demographics, Vitals, Labs, Medications, Visits, Care Team, Procedures |
| API Gateway | Port 5000 | Single entry point; JWT validation; routes to all services |
| Auth Service | Port 5001 | Login, token refresh, logout |
| Patient Service | Port 5002 | Patient CRUD |
| Clinical Services | Ports 5003–5007 | Vitals, Labs, Medications, Visits, Care Team |
| Registry Service | Port 5100 | Plugin metadata + admin API (enable/disable modules, role management) |
| MongoDB | Port 27017 | Shared data store |

---

# PatientRecords Phase 4 - Visual System Diagram

## Overall System Architecture

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                            USER BROWSER                                 ┃
┃                        http://localhost:4200                            ┃
┃                                                                          ┃
┃  ┌──────────────────────────────────────────────────────────────────┐  ┃
┃  │                     🏥 PATIENT RECORDS                           │  ┃
┃  │                   Angular Shell App (4200)                       │  ┃
┃  │                                                                  │  ┃
┃  │  ┌─────────────┐  ┌──────────────────┐  ┌──────────────────┐  │  ┃
┃  │  │   Login     │──│   Navigation     │──│    Dashboard    │  │  ┃
┃  │  │ Component   │  │   w/ Search      │  │   w/ Patient    │  │  ┃
┃  │  │             │  │                  │  │   Info Header   │  │  ┃
┃  │  └─────────────┘  └──────────────────┘  └──────────────────┘  │  ┃
┃  │                                                                  │  ┃
┃  │  ┌──────────────────────────────────────────────────────────┐  │  ┃
┃  │  │        Modules Dashboard (Role-Based Access)            │  │  ┃
┃  │  ├──────────────────────────────────────────────────────────┤  │  ┃
┃  │  │ [👤 Demographics] [💓 Vitals] [🧬 Labs]                 │  │  ┃
┃  │  │ [💊 Medications] [📅 Visits] [👥 Care Team]              │  │  ┃
┃  │  │ [🔬 Procedures]                                           │  │  ┃
┃  │  │                                                           │  │  ┃
┃  │  │ Visible modules depend on user's role + registry config  │  │  ┃
┃  │  │ Admin: 7/7  │  Physician: 7/7  │  Nurse: 2/7            │  │  ┃
┃  │  │                                                           │  │  ┃
┃  │  │ ⚙️ Admin Panel button (admin-only) → /admin              │  │  ┃
┃  │  └──────────────────────────────────────────────────────────┘  │  ┃
┃  │                          ↓ Click Module ↓                       │  ┃
┃  │  ┌──────────────────────────────────────────────────────────┐  │  ┃
┃  │  │          Module Loader Service (Dynamic Load)            │  │  ┃
┃  │  ├──────────────────────────────────────────────────────────┤  │  ┃
┃  │  │  1. Detect module name                                   │  │  ┃
┃  │  │  2. Check role-based permissions                        │  │  ┃
┃  │  │  3. Load via Webpack Module Federation                 │  │  ┃
┃  │  │  4. Cache loaded module                                 │  │  ┃
┃  │  │  5. Render component                                    │  │  ┃
┃  │  └──────────────────────────────────────────────────────────┘  │  ┃
┃  │                          ↓ Module Loaded ↓                      │  ┃
┃  │  ┌──────────────────────────────────────────────────────────┐  │  ┃
┃  │  │        Micro-Frontend Module (Dynamic Content)           │  │  ┃
┃  │  ├──────────────────────────────────────────────────────────┤  │  ┃
┃  │  │                                                           │  │  ┃
┃  │  │  Demographics    │ Vitals        │ Labs                 │  │  ┃
┃  │  │  ─────────────   │ ──────────    │ ────                │  │  ┃
┃  │  │  Name            │ Temperature   │ Test Results        │  │  ┃
┃  │  │  MRN             │ BP            │ Status              │  │  ┃
┃  │  │  DOB             │ HR            │ Reference Range     │  │  ┃
┃  │  │  Age             │ O₂ Sat        │                     │  │  ┃
┃  │  │  Gender          │ + History     │ Medications         │  │  ┃
┃  │  │  Contact         │               │ ──────────────      │  │  ┃
┃  │  │                  │               │ Active Meds         │  │  ┃
┃  │  │  Visits          │               │ Historical          │  │  ┃
┃  │  │  ─────────────   │               │                     │  │  ┃
┃  │  │  Upcoming        │               │                     │  │  ┃
┃  │  │  Timeline        │               │                     │  │  ┃
┃  │  │  Stats           │               │                     │  │  ┃
┃  │  │                                                          │  │  ┃
┃  │  └──────────────────────────────────────────────────────────┘  │  ┃
┃  │                                                                  │  ┃
┃  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │  ┃
┃  │  │ Auth Service │  │ Patient Svc  │  │ Context Svc  │         │  ┃
┃  │  │ (JWT Token)  │  │ (API Calls)  │  │ (Patient ID) │         │  ┃
┃  │  └──────────────┘  └──────────────┘  └──────────────┘         │  ┃
┃  │                                                                  │  ┃
┃  └──────────────────────────────────────────────────────────────────┘  ┃
┃                                                                          ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
                                    ↓
                            HTTP API Requests
                                    ↓
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                     MICROSERVICES BACKEND                               ┃
┃                   API Gateway: http://localhost:5000                    ┃
┃                                                                          ┃
┃  API Gateway (5000) ─ routes /api/* traffic                           ┃
┃  ├─ Auth Service      (5001) ─ /auth/login, /auth/refresh             ┃
┃  ├─ Patient Service   (5002) ─ /api/patients                          ┃
┃  ├─ Vitals Service    (5003) ─ /api/patients/:id/vitals               ┃
┃  ├─ Labs Service      (5004) ─ /api/patients/:id/labs                 ┃
┃  ├─ Medications Svc   (5005) ─ /api/patients/:id/medications          ┃
┃  ├─ Visits Service    (5006) ─ /api/patients/:id/visits               ┃
┃  ├─ Care Team Service (5007) ─ /api/patients/:id/care-team            ┃
┃  └─ Registry Service  (5100) ─ /api/modules, /api/admin/registry      ┃
┃                                                                          ┃
┃  All services: structured JSON logging + /health endpoint              ┃
┃  Gateway: /health/deep aggregates health across all services           ┃
┃                                                                          ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
                                    ↓
                            MongoDB Queries
                                    ↓
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                        DATABASE (MongoDB)                               ┃
┃                                                                          ┃
┃  patientrecords                                                        ┃
┃  └─ patients collection                                                ┃
┃     ├─ _id: ObjectId                                                  ┃
┃     ├─ patientid: Number                                              ┃
┃     ├─ firstname: String                                              ┃
┃     ├─ lastname: String                                               ┃
┃     ├─ demographics: Array                                            ┃
┃     ├─ vitals: Array                                                  ┃
┃     │  └─ Auto-retirement on new vital (soft delete)                 ┃
┃     ├─ labs: Array                                                    ┃
┃     ├─ medications: Array                                             ┃
┃     └─ visits: Array                                                  ┃
┃        └─ visitType: enum (hospital, clinic, office)                  ┃
┃                                                                          ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

---

## Module Federation Architecture

```
┌────────────────────────────────────────────────────────────┐
│           WEBPACK MODULE FEDERATION SETUP                  │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  Shell App (HOST)          Micro-Frontends (REMOTES)       │
│  ─────────────────         ──────────────────────           │
│  Port 4200                 Ports 4201-4207                  │
│                                                             │
│  webpack.config.js         webpack.config.js               │
│  ┌─────────────────┐       ┌──────────────────┐            │
│  │ Module          │       │ Module           │            │
│  │ Federation      │       │ Federation       │            │
│  ├─────────────────┤       ├──────────────────┤            │
│  │ name:           │       │ name:            │            │
│  │ 'shell-app'     │       │ 'demographics'   │ (+ others) │
│  │                 │       │                  │            │
│  │ remotes: {      │       │ exposes: {       │            │
│  │  demographicsApp│◄──┐   │   './Module':    │            │
│  │  vitalsApp      │◄──┼─→ │   './module.ts'  │            │
│  │  labsApp        │◄──┤   │   './Component'  │            │
│  │  medicationsApp │◄──┤   │ }                │            │
│  │  visitsApp      │◄──┤   │                  │            │
│  │  careTeamApp    │◄──┤   │ shared: {        │            │
│  │  (* procedures  │   │   │   '@angular/*',  │            │
│  │   via dynamic   │   │   │   'rxjs',        │            │
│  │   loadRemote)   │   │   │   '@patient...' │            │
│  │ }               │   │   │ }                │            │
│  │                 │   │   └──────────────────┘            │
│  │                 │   │   Dynamic Load on Click:           │
│  │ shared: {       │   │   import(remoteUrl +               │
│  │   singleton:    │───┼──►'remoteEntry.js').then(load)    │
│  │   '@angular/*'  │   │                                    │
│  │   'rxjs'        │   │                                    │
│  │   '@patient..' │   │                                    │
│  │ }               │   │                                    │
│  └─────────────────┘   │   Returns:                         │
│                        │   LoadedModule = {                 │
│                        │     name,                          │
│                        │     component,                     │
│                        │     loaded,                        │
│                        │     error                          │
│                        │   }                                │
│                        └──────────────────────┘             │
│                                                             │
│  Result: Dynamic module loading without page reload       │
│         Each module can be deployed independently          │
│         Shared packages loaded only once (singleton)       │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

---

## Role-Based Module Access Flow

```
┌──────────────────┐
│   User Login     │
│ admin / admin    │
└────────┬─────────┘
         │
         ↓
┌─────────────────────────────────┐
│ AuthService.login()             │
│ ├─ Send credentials to backend  │
│ ├─ Receive JWT token + role     │
│ ├─ Store token in localStorage  │
│ └─ Emit authenticated$ subject  │
└────────────┬────────────────────┘
             │
             ↓
┌──────────────────────────────────┐
│ ModuleLoaderService.              │
│ loadModulesForRole(role)          │
│ ├─ Get role from JWT token       │
│ ├─ Look up in ModuleConfig       │
│ ├─ Get visible modules for role  │
│ └─ Filter AVAILABLE_MODULES[]    │
└────────────┬─────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────────────┐
│ MODULE CONFIG - ROLE-BASED ACCESS MATRIX               │
│ (Roles managed at runtime via Admin Dashboard)         │
│                                                         │
│ ADMIN sees: [Demographics] [Vitals] [Labs]            │
│             [Medications] [Visits] [Care Team]        │
│             [Procedures]   (7/7) + Admin Panel        │
│                                                         │
│ PHYSICIAN sees: [Demographics] [Vitals] [Labs]        │
│                 [Medications] [Visits] [Care Team]    │
│                 [Procedures]  (7/7)                   │
│                                                         │
│ NURSE sees: [Demographics] [Vitals] (2/7)            │
│             (configurable via Admin Dashboard)         │
│                                                         │
│ Note: Module visibility is registry-driven and        │
│ editable at runtime — no code changes required.       │
└────────────┬────────────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────┐
│ ModulesDashboard.Component      │
│ Updates visible tabs            │
│ ├─ Removes unauthorized modules │
│ ├─ Shows status for each module │
│ └─ Enables click handlers       │
└────────────┬────────────────────┘
             │
             ↓
┌──────────────────────────────────────────────────────┐
│ User Sees Dashboard with Role-Based Tabs             │
│                                                      │
│ [👤 Demographics] [💓 Vitals] [🧬 Labs]           │
│ [💊 Medications] [📅 Visits] [👥 Care Team]        │
│ [🔬 Procedures]                                     │
│                                                      │
│ (Only modules allowed for user's role appear)       │
└──────────────────────────────────────────────────────┘
             │
             ↓ (User clicks module)
             │
┌──────────────────────────────────────────────────────┐
│ ModuleLoaderService.loadModule(moduleName)          │
│ ├─ Check if already cached                          │
│ ├─ If cached, return cached version                 │
│ ├─ If not, dynamically load via webpack MF          │
│ ├─ Store in loadedModules Map                       │
│ └─ Emit loading$ subject                            │
└──────────────────────────────────────────────────────┘
             │
             ↓
┌────────────────────────────────────┐
│ Webpack Module Federation          │
│ Loads: localhost:port/remoteEntry.js
│ Then: Loads actual module code    │
│ Finally: Returns component         │
└────────────┬──────────────────────┘
             │
             ↓
┌──────────────────────────────────────────────────┐
│ Module Component Rendered                        │
│ ├─ Gets PatientContextService (current patient) │
│ ├─ Calls PatientService.getVitals(patientId)    │
│ ├─ Displays formatted patient data              │
│ └─ Shows loading spinner, then content          │
└──────────────────────────────────────────────────┘
```

---

## Data Flow - Real-Time Patient Data

```
┌─────────────────────────────────────────────────────────────┐
│ Module Component (e.g., Vitals)                              │
│ ├─ OnInit lifecycle hook triggered                          │
│ ├─ Subscribe to PatientContextService.currentPatient$       │
│ ├─ Get patientId from subject                               │
│ └─ Call PatientService.getVitals(patientId)                 │
└────────┬────────────────────────────────────────────────────┘
         │
         ↓ Observable.pipe(takeUntil)
         │
┌─────────────────────────────────────────────────────────────┐
│ PatientService                                               │
│ ├─ Build URL: /api/patients/{patientId}/vitals              │
│ ├─ Add JWT token to headers (via JwtInterceptor)            │
│ ├─ Make HTTP GET request                                    │
│ └─ Return Observable<Vital[]>                               │
└────────┬────────────────────────────────────────────────────┘
         │
         ↓ HTTP GET
         │
┌─────────────────────────────────────────────────────────────┐
│ Backend API Server (Node.js/Express)                         │
│ ├─ Receive GET /api/patients/:id/vitals                     │
│ ├─ Verify JWT token valid                                   │
│ ├─ Extract patientId from URL                               │
│ ├─ Query MongoDB: db.patients.findOne({patientid: id})      │
│ ├─ Extract vitals array from document                       │
│ ├─ Filter out soft-deleted (deletedAt != null)              │
│ ├─ Sort by dateofobservation DESC                           │
│ └─ Return JSON response with vitals array                   │
└────────┬────────────────────────────────────────────────────┘
         │
         ↓ HTTP 200 + JSON
         │
┌─────────────────────────────────────────────────────────────┐
│ PatientService (Observable continues)                        │
│ ├─ Receive HTTP response                                    │
│ ├─ Map response to Vital[] interface                        │
│ ├─ Return mapped Observable                                 │
│ └─ Complete observable                                      │
└────────┬────────────────────────────────────────────────────┘
         │
         ↓ Subscribe() receives Vital[]
         │
┌─────────────────────────────────────────────────────────────┐
│ Module Component                                             │
│ ├─ Receive vitals: Vital[]                                  │
│ ├─ this.vitals = vitals                                     │
│ ├─ this.loading = false                                     │
│ ├─ Call *ngIf="!loading" to show content                    │
│ └─ Angular change detection updates view                    │
└────────┬────────────────────────────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────────────────────────────┐
│ HTML Template                                                │
│ ├─ *ngIf="!loading" shows content                           │
│ ├─ *ngFor="let vital of latestVitals" displays data         │
│ ├─ Renders cards: Temperature, BP, HR, O₂, etc.            │
│ ├─ Shows status: {{getStatus(vital)}}                       │
│ ├─ Shows trend: {{getTrend(vital)}}                         │
│ └─ Displays history table (last 10 readings)                │
└────────┬────────────────────────────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────────────────────────────┐
│ USER SEES:                                                   │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ 💓 Temperature: 98.6°C (Normal ✓)                     │  │
│ │ 💓 BP: 120/80 mmHg (Normal ✓)                         │  │
│ │ 💓 HR: 72 bpm (Normal ✓)                              │  │
│ │ 💓 O₂: 97% (Normal ✓)                                 │  │
│ │ 💓 RR: 16 breaths/min (Normal ✓)                      │  │
│ │                                                       │  │
│ │ History (Last 10):                                    │  │
│ │ ┌─────────┬────────┬──────────┬─────┬────┐          │  │
│ │ │Date     │Temp    │BP        │HR   │O₂  │          │  │
│ │ ├─────────┼────────┼──────────┼─────┼────┤          │  │
│ │ │1/22 2PM │98.6°C  │120/80    │72   │97% │          │  │
│ │ │1/22 10AM│98.4°C  │118/78    │70   │96% │          │  │
│ │ │1/21 6PM │98.8°C  │122/82    │75   │97% │          │  │
│ │ │...      │...     │...       │...  │... │          │  │
│ │ └─────────┴────────┴──────────┴─────┴────┘          │  │
│ │                                                       │  │
│ └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Responsive Design Breakpoints

```
┌─────────────────────────────────────────────────────────────┐
│               RESPONSIVE DESIGN LAYOUT                       │
└─────────────────────────────────────────────────────────────┘

MOBILE (< 480px)                TABLET (768px - 1024px)
┌──────────────────────────┐    ┌──────────────────────────────┐
│ [☰]  PatientRecords [↓] │    │ PatientRecords    [Search] ↓ │
├──────────────────────────┤    ├──────────────────────────────┤
│                          │    │ Patient: John Smith          │
│ Patient: John Smith      │    │ MRN: P-00001                 │
│ MRN: P-00001             │    │ Role: Clinician              │
│ Role: Clinician          │    │                              │
│                          │    │ [👤 Demographics]           │
│ [👤 Demographics]        │    │ [💓 Vitals]                 │
│ [💓 Vitals]              │    │ [🧬 Labs]                   │
│ [🧬 Labs]                │    │ [💊 Medications]            │
│ [💊 Medications]         │    │                              │
│                          │    │ ┌──────────────────────────┐ │
│ ┌────────────────────┐   │    │ │  Module Content Area   │ │
│ │ Module Content     │   │    │ │                        │ │
│ │ (Full Width)       │   │    │ │ Patient data displays │ │
│ │                    │   │    │ │ here when a module is  │ │
│ │ Stacked cards      │   │    │ │ selected (2 columns)   │ │
│ │ Single column      │   │    │ │                        │ │
│ │                    │   │    │ └──────────────────────────┘ │
│ │ Full width inputs  │   │    │                              │
│ │                    │   │    │ Status Panel (2 col grid)    │
│ └────────────────────┘   │    │ ┌────────────┬─────────────┐ │
│                          │    │ │ Demographics│Vitals       │ │
│ Status Panel             │    │ ├────────────┼─────────────┤ │
│ (Single column)          │    │ │ Labs       │ Medications │ │
│ ┌──────────────────────┐ │    │ └────────────┴─────────────┘ │
│ │ Demographics ✓       │ │    └──────────────────────────────┘
│ │ Vitals ✓             │ │
│ │ Labs ⟳               │ │    DESKTOP (> 1024px)
│ │ Medications ✓        │ │    ┌───────────────────────────────────┐
│ │ Visits ✗             │ │    │ PatientRecords [Search] User ▼    │
│ └──────────────────────┘ │    ├───────────────────────────────────┤
│                          │    │ Patient: John Smith | MRN P-00001 │
└──────────────────────────┘    │ Role: Clinician | Access: 4/5     │
                                │                                   │
Max-width: Auto (100%)          │ [👤 Demographics] [💓 Vitals]   │
Font: 14px                      │ [🧬 Labs] [💊 Medications]      │
Margins: 10px                   │                                   │
Padding: 10px                   │ ┌────────────────────────────────┐ │
                                │ │      Module Content Area      │ │
                                │ │                              │ │
                                │ │  Patient data with           │ │
                                │ │  3-column grid layout        │ │
                                │ │                              │ │
                                │ │  Side-by-side cards          │ │
                                │ │  Horizontal tables           │ │
                                │ │                              │ │
                                │ └────────────────────────────────┘ │
                                │                                   │
                                │ Status Panel (3-col grid)         │
                                │ ┌────────────┬────────────────┐   │
                                │ │Demographics│Vitals  │Labs   │   │
                                │ ├────────────┼────────────────┤   │
                                │ │Medications │Visits          │   │
                                │ └────────────┴────────────────┘   │
                                │                                   │
                                └───────────────────────────────────┘

Max-width: 1400px
Font: 16px
Margins: 20px
Padding: 20px
```

---

## Module Loading Performance

```
FIRST LOAD (Cold Cache)                SUBSEQUENT LOAD (Warm Cache)

User clicks [💓 Vitals]                User clicks [💓 Vitals]
         │                                      │
         ↓ ~0ms                                 ↓ ~0ms
    Check cache                             Check cache
    (Not found)                             (Found!)
         │                                      │
         ↓ ~100ms                               ↓ ~10ms
    Load webpack remote                    Return from cache
    (remoteEntry.js)                       
         │                                      │
         ↓ ~200ms                               ↓ ~0ms
    Load module bundle                    Module ready
         │
         ↓ ~150ms
    Share scopes negotiation
         │
         ↓ ~50ms
    Render component
         │
         ↓ ~0ms
    API call (PatientService)
         │
         ↓ ~100ms
    Database query (MongoDB)
         │
         ↓ ~0ms
    Format response
         │
         ↓ ~50ms (varies by data size)
    Display in browser


Total Time:                              Total Time:
First load: ~650ms                       Warm load: ~10-50ms
(Mostly network + parsing)               (Mostly API call)

Benefits:
✅ Modules cached after first load
✅ No duplicate downloads
✅ Can unload modules to free memory
✅ Each module is lightweight
✅ Fast navigation after initial load
```

---

## Module Component Lifecycle

```
┌─────────────────────────────────────────┐
│ Module Component Created                │
│ (constructor injection)                 │
└────────┬────────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────────┐
│ ngOnInit() Lifecycle Hook               │
│                                         │
│ 1. Subscribe to PatientContextService   │
│    this.currentPatient$ =               │
│      patientContextService.patient$     │
│                                         │
│ 2. Listen for patient changes           │
│    .pipe(takeUntil(this.destroy$))      │
│    .subscribe(patient => {              │
│      this.patientId = patient.patientid │
│      this.loadData()                    │
│    })                                   │
│                                         │
│ 3. Call API to fetch data               │
│    this.patientService                  │
│      .getVitals(patientId)              │
│      .subscribe(vitals => {             │
│        this.vitals = vitals             │
│      })                                 │
│                                         │
└────────┬────────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────────┐
│ Component Renders                       │
│ Data displays in template               │
└────────┬────────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────────┐
│ User Interacts                          │
│ - Clicks buttons                        │
│ - Changes filters                       │
│ - Scrolls table                         │
└────────┬────────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────────┐
│ Component Changes                       │
│ - New patient selected                  │
│ - Role changed                          │
│ - Unload module button clicked          │
└────────┬────────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────────┐
│ ngOnDestroy() Lifecycle Hook            │
│                                         │
│ 1. Complete destroy$ subject            │
│    this.destroy$.next(undefined)        │
│    this.destroy$.complete()             │
│                                         │
│ 2. All takeUntil subscriptions unsubscribe
│    (Prevents memory leaks)              │
│                                         │
│ 3. Clean up manual subscriptions        │
│    subscription.unsubscribe()           │
│                                         │
└────────┬────────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────────┐
│ Module Destroyed                        │
│ Memory freed, can be unloaded           │
└─────────────────────────────────────────┘

Memory Leak Prevention:
✅ Every subscribe() uses takeUntil()
✅ Destroy$ subject completes on destroy
✅ No dangling subscriptions
✅ Component can be garbage collected
```

---

## Authentication & Authorization Flow

```
LOGIN FLOW:
───────────

[User enters username/password]
         ↓
    AuthService.login(username, password)
         ↓
    POST /api/auth/login (backend)
         ↓
    Backend validates credentials
         ↓
    Returns JWT token + user role
         ↓
    Store token in localStorage
         ↓
    Emit authenticated$ = true
         ↓
    Navigate to /dashboard
         ↓
    Dashboard loads with:
    - Patient search
    - Module tabs (based on role)


AUTHORIZATION FLOW:
───────────────────

Every API Request:
    ↓
    JwtInterceptor.intercept()
    ├─ Get token from localStorage
    ├─ Add to Authorization header
    │  Authorization: Bearer <token>
    └─ Send request
    ↓
    Backend receives request
    ├─ Extract token from header
    ├─ Verify JWT signature
    ├─ Extract user role from token
    ├─ Process request (no 401 error)
    └─ Return data
    ↓
    Response received
    ├─ Status 200: Success
    └─ Status 401/403: Unauthorized


MODULE VISIBILITY FLOW:
───────────────────────

User logs in as: Clinician
         ↓
    Extract role: "clinician" (from JWT)
         ↓
    ModuleLoaderService.getVisibleModulesForRole("clinician")
         ↓
    Look up in AVAILABLE_MODULES array:
    
    {
      name: "demographics",
      requiredRoles: ["admin", "clinician", "nurse", "patient"]
      ✓ clinician IN requiredRoles → VISIBLE
    },
    {
      name: "vitals",
      requiredRoles: ["admin", "clinician", "nurse"]
      ✓ clinician IN requiredRoles → VISIBLE
    },
    {
      name: "labs",
      requiredRoles: ["admin", "clinician", "nurse", "patient"]
      ✓ clinician IN requiredRoles → VISIBLE
    },
    {
      name: "medications",
      requiredRoles: ["admin", "clinician", "nurse", "pharmacist"]
      ✓ clinician IN requiredRoles → VISIBLE
    },
    {
      name: "visits",
      requiredRoles: ["admin", "patient", "receptionist"]
      ✗ clinician NOT IN requiredRoles → HIDDEN
    }
         ↓
    Return filtered array:
    [demographics, vitals, labs, medications]
         ↓
    Dashboard renders tabs:
    [👤 Demographics] [💓 Vitals] [🧬 Labs] [💊 Medications]
    (Visits tab is not rendered)
```

---

**Complete System Documentation**  
*Generated: January 22, 2026*  
*PatientRecords Micro-Frontend System - Phase 4*
