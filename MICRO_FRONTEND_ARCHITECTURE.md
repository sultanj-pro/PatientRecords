# PatientRecords Micro-Frontend Architecture

**Date:** January 22, 2026  
**Framework:** Angular 17+ with TypeScript  
**Module Federation:** Webpack 5 Module Federation  
**Backend:** Node.js Express API (existing)

---

## 1. Architecture Overview

### High-Level Structure

```
User's Browser
    ↓
┌─────────────────────────────────────────────────┐
│  Angular Shell App (Host/Orchestrator)          │
│  - Port 4200                                    │
│  - Patient Search                               │
│  - Authentication/Login                         │
│  - Navigation & Layout                          │
│  - Role-based Module Loader                     │
└─────────────────────────────────────────────────┘
    ↓
    ├─ Demographics Module (Port 4201)
    ├─ Vitals Module (Port 4202)
    ├─ Labs Module (Port 4203)
    ├─ Medications Module (Port 4204)
    └─ Visits Module (Port 4205)
    
    All micro-frontends share:
    └─ Shared Library (Auth, Services, Models)
    
    ↓
Node.js Backend API (Port 5001)
    ↓
MongoDB Database
```

### Key Design Principles

1. **Independent Deployment**: Each micro-frontend builds and deploys independently
2. **Shared Authentication**: Single login, token shared via localStorage
3. **Shared State**: Patient context shared across modules via shared service
4. **Role-Based Loading**: Shell app loads only appropriate modules per user role
5. **Loose Coupling**: Modules communicate via event emitters, not direct imports

---

## 2. Project Structure

### Monorepo Layout (npm workspaces)

```
patient-records/
├── package.json (root, defines workspaces)
├── tsconfig.base.json
│
├── shell-app/                    # Host/Shell Application
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/
│   │   │   │   ├── login/
│   │   │   │   ├── patient-search/
│   │   │   │   ├── dashboard/
│   │   │   │   └── navigation/
│   │   │   ├── services/
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── patient.service.ts
│   │   │   │   └── module-loader.service.ts
│   │   │   └── app.module.ts
│   │   ├── main.ts
│   │   └── index.html
│   ├── webpack.config.js (Module Federation config)
│   └── package.json
│
├── modules/
│   ├── demographics/             # Demographics Micro-Frontend
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── components/
│   │   │   │   │   └── demographics-display/
│   │   │   │   └── demographics.module.ts
│   │   │   └── bootstrap.ts
│   │   ├── webpack.config.js
│   │   └── package.json
│   │
│   ├── vitals/                   # Vitals Micro-Frontend
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── components/
│   │   │   │   │   ├── vitals-list/
│   │   │   │   │   └── vitals-history/
│   │   │   │   └── vitals.module.ts
│   │   │   └── bootstrap.ts
│   │   ├── webpack.config.js
│   │   └── package.json
│   │
│   ├── labs/                     # Labs Micro-Frontend
│   ├── medications/              # Medications Micro-Frontend
│   └── visits/                   # Visits Micro-Frontend
│
├── shared/                       # Shared Library
│   ├── src/
│   │   ├── lib/
│   │   │   ├── auth/
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── jwt.interceptor.ts
│   │   │   │   └── auth.module.ts
│   │   │   ├── services/
│   │   │   │   ├── api.service.ts
│   │   │   │   └── patient-context.service.ts
│   │   │   ├── models/
│   │   │   │   ├── patient.model.ts
│   │   │   │   ├── vital.model.ts
│   │   │   │   └── user-config.model.ts
│   │   │   └── shared.module.ts
│   │   └── index.ts (public API)
│   └── package.json
│
└── MICRO_FRONTEND_ARCHITECTURE.md (this file)
```

---

## 3. Micro-Frontend Modules

### Module Definitions

#### Shell App (Host)
- **Purpose**: Load other modules, handle authentication, patient search
- **Port**: 4200
- **Key Components**:
  - Login page
  - Patient search & selection
  - Dashboard layout with module slots
  - Navigation bar
- **Routes**:
  - `/login` → Login form
  - `/dashboard/:patientId` → Main dashboard with loaded modules

#### Demographics Module
- **Purpose**: Display patient demographics (name, ID, DOB, etc.)
- **Port**: 4201
- **Visibility**: All roles
- **Read-only**: Yes (for most roles)

#### Vitals Module
- **Purpose**: Display vital signs with chronological history
- **Port**: 4202
- **Visibility**: Physician, Nurse, Physical Therapy
- **Features**:
  - Current vitals highlighted
  - Historical readings timeline
  - Sort by date (newest first)
- **Actions**: Add new vital (Physician, Nurse only)

#### Labs Module
- **Purpose**: Display lab results
- **Port**: 4203
- **Visibility**: Physician, Radiology, Labs
- **Features**:
  - Test results sorted by date
  - Results details on click
- **Actions**: Add new lab result (Radiology, Labs only)

#### Medications Module
- **Purpose**: Display current medications
- **Port**: 4204
- **Visibility**: Physician, Nurse, Nutrition
- **Features**:
  - Active medications list
  - Dosage, frequency, indication
- **Actions**: Add medication (Physician only)

#### Visits Module
- **Purpose**: Display visit records (hospital, clinic, office)
- **Port**: 4205
- **Visibility**: Physician, Physical Therapy, Radiology
- **Features**:
  - Visits sorted by date (newest first)
  - Visit type badge (hospital, clinic, office)
  - Provider/facility information
- **Actions**: Add visit (Physician only)

---

## 4. Authentication & Authorization

### Login Flow
1. User navigates to Shell App (`http://localhost:4200`)
2. Angular redirects to `/login` if not authenticated
3. User enters username, submits
4. Shell App calls `POST /auth/login` (Node.js backend)
5. Backend returns JWT token + user role
6. Shell App stores:
   - Token in `localStorage` (key: `jwt_token`)
   - Role in `localStorage` (key: `user_role`)
7. Shell App redirects to `/dashboard`

### Token Sharing
- **All micro-frontends read from same localStorage** (same domain)
- **Shared HTTP Interceptor** (in shared library) adds token to all requests:
  ```
  Authorization: Bearer <jwt_token>
  ```

### Role-Based Module Loading
1. Shell App reads `user_role` from localStorage
2. Calls backend `/api/config/dashboard?role={role}`
3. Backend returns allowed modules for role
4. Shell App dynamically loads only those modules
5. Each module enforces its own access control

### User Roles & Permissions

| Role | Demographics | Vitals | Labs | Medications | Visits | Add Data |
|------|---|---|---|---|---|---|
| Physician | View | View + Add | View + Add | View + Add | View + Add | Yes |
| Nurse | View | View + Add | View | View | View | Vitals only |
| Physical Therapy | View | View | - | - | View | Notes only |
| Radiology | View | - | View + Add | - | View | Reports only |
| Nutrition | View | View | - | View | - | Plans only |
| Lab Tech | View | - | View + Add | - | - | Results only |

---

## 5. Webpack Module Federation Configuration

### Shell App webpack.config.js

```javascript
const ModuleFederationPlugin = require('webpack').container.ModuleFederationPlugin;

module.exports = {
  output: {
    publicPath: 'http://localhost:4200/',
  },
  plugins: [
    new ModuleFederationPlugin({
      name: 'shell',
      filename: 'remoteEntry.js',
      remotes: {
        '@demographics': 'demographics@http://localhost:4201/remoteEntry.js',
        '@vitals': 'vitals@http://localhost:4202/remoteEntry.js',
        '@labs': 'labs@http://localhost:4203/remoteEntry.js',
        '@medications': 'medications@http://localhost:4204/remoteEntry.js',
        '@visits': 'visits@http://localhost:4205/remoteEntry.js',
      },
      shared: ['@angular/core', '@angular/common', 'rxjs'],
    }),
  ],
};
```

### Micro-Frontend webpack.config.js (example: Vitals)

```javascript
const ModuleFederationPlugin = require('webpack').container.ModuleFederationPlugin;

module.exports = {
  output: {
    publicPath: 'http://localhost:4202/',
  },
  plugins: [
    new ModuleFederationPlugin({
      name: 'vitals',
      filename: 'remoteEntry.js',
      exposes: {
        './VitalsModule': 'src/app/vitals.module.ts',
      },
      shared: ['@angular/core', '@angular/common', 'rxjs'],
    }),
  ],
};
```

---

## 6. Data Flow & Shared Services

### Patient Context Service (Shared Library)

```typescript
// shared/src/lib/services/patient-context.service.ts

export class PatientContextService {
  private selectedPatient$ = new BehaviorSubject<Patient | null>(null);
  
  getSelectedPatient() {
    return this.selectedPatient$.asObservable();
  }
  
  setSelectedPatient(patient: Patient) {
    this.selectedPatient$.next(patient);
  }
}
```

### Flow
1. **Shell App**: User searches and selects patient
2. **Shell App**: Calls `PatientContextService.setSelectedPatient(patient)`
3. **All Micro-frontends**: Subscribe to `PatientContextService.getSelectedPatient()`
4. **Each Module**: Loads its data for selected patient when context changes

### API Service (Shared Library)

All micro-frontends use shared `ApiService`:
- Centralized HTTP calls with JWT token
- Consistent error handling
- Base URL management

---

## 7. Backend Enhancements Needed

### 1. CORS Configuration
Already exists but verify:
```javascript
// backend/server.js
app.use(cors({
  origin: ['http://localhost:4200', 'http://localhost:4201', 'http://localhost:4202', 'http://localhost:4203', 'http://localhost:4204', 'http://localhost:4205'],
  credentials: true
}));
```

### 2. Role-Based Access Control (New)
Add middleware to check role before returning data:
```javascript
// Example: Only Physician can add vitals
app.post('/api/patients/:id/vitals', authenticate, roleRequired('physician'), createVital);
```

### 3. Dashboard Config Endpoint (New)
```
GET /api/config/dashboard?role={role}

Response:
{
  "modules": ["demographics", "vitals", "labs", "medications", "visits"],
  "features": {
    "vitals": { "canAdd": true, "canEdit": false, "canDelete": false },
    "labs": { "canAdd": false, "canEdit": false, "canDelete": false }
  }
}
```

---

## 8. Module Communication

### Inter-Module Communication
- **SharedService with RxJS**: Micro-frontends communicate via event emitters
- **Example**: Vitals module emits "vital-added" event, shell app triggers refresh
- **No Direct Imports**: Modules never import from each other

### Pattern
```typescript
// Vitals Module
private vitalAdded$ = new Subject<Vital>();

addVital(vital: Vital) {
  this.vitalAdded$.next(vital);  // Broadcast event
}

// Shell App
ngOnInit() {
  this.sharedService.onVitalAdded$.subscribe(vital => {
    console.log('Vital added:', vital);  // React to event
  });
}
```

---

## 9. Development & Build Process

### Development (Local)
Each module runs independently:
```bash
# Terminal 1: Shell App
cd shell-app && npm start  # Port 4200

# Terminal 2: Vitals Module
cd modules/vitals && npm start  # Port 4202

# Terminal 3: Demographics Module
cd modules/demographics && npm start  # Port 4201

# ... etc for other modules
```

### Production Build
- Each module builds independently
- Shell app references production URLs of micro-frontends
- Micro-frontends deployed to CDN or separate servers
- Shell app points to production endpoints

---

## 10. Docker Deployment

### Development docker-compose.yml

```yaml
services:
  # Backend API (existing)
  backend:
    build: ./backend
    ports:
      - "5001:5001"
    environment:
      - MONGODB_URI=mongodb://mongo:27017/patient-records

  # MongoDB (existing)
  mongo:
    image: mongo:7.0
    ports:
      - "27017:27017"

  # Shell App (new)
  shell-app:
    build:
      context: .
      dockerfile: ./shell-app/Dockerfile
    ports:
      - "4200:4200"
    environment:
      - API_URL=http://localhost:5001

  # Micro-frontends (new - one per module)
  vitals-module:
    build:
      context: .
      dockerfile: ./modules/vitals/Dockerfile
    ports:
      - "4202:4202"
    environment:
      - API_URL=http://localhost:5001

  # ... similar for other modules
```

---

## 11. Security Considerations

1. **CORS**: Restrict to known origins
2. **JWT Tokens**: Use HttpOnly cookies in production
3. **Token Expiration**: Implement refresh token flow
4. **XSS Protection**: Content Security Policy headers
5. **CSRF Protection**: SameSite cookie attribute
6. **Rate Limiting**: Implement on backend

---

## 12. Testing Strategy

### Unit Tests
- Each module tests in isolation
- Shared library tests (services, interceptors)
- Mock API responses

### Integration Tests
- Test module loading in shell
- Test shared service communication
- Test authentication flow

### E2E Tests
- Test complete user workflow
- Login → Search → View patient → Interact with modules

---

## 13. Deployment Checklist

- [ ] All modules build successfully
- [ ] No console errors in browsers
- [ ] Module Federation remotes load correctly
- [ ] Shared services work across modules
- [ ] Authentication token flows properly
- [ ] Role-based loading works
- [ ] API calls include JWT token
- [ ] CORS headers correct
- [ ] All 5 micro-frontends accessible
- [ ] Backend role-based access works
- [ ] Docker containers start/stop cleanly

---

## 14. Future Enhancements

1. **Service Workers**: PWA support for offline capability
2. **Analytics**: Track module usage per role
3. **Feature Flags**: Gradually rollout new modules
4. **A/B Testing**: Test UI changes per module
5. **Micro-services Backend**: Gradually migrate to Go if needed
6. **GraphQL**: Replace REST API for better data fetching

---

## Appendix: Key Technologies

- **Angular 17+**: Framework
- **TypeScript**: Language
- **RxJS**: Reactive programming
- **Webpack 5**: Module Federation
- **npm Workspaces**: Monorepo management
- **Node.js Express**: Backend API
- **MongoDB**: Database
- **Docker**: Containerization
- **JWT**: Authentication

---

**Created:** January 22, 2026  
**Last Updated:** January 22, 2026
