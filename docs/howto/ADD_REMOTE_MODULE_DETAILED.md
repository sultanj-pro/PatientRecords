# Complete Guide: Adding a Remote Module to PatientRecords

**Audience:** Frontend developers, DevOps engineers  
**Last Updated:** March 17, 2026  
**Difficulty:** Intermediate  

This guide walks through every file that needs to be created or modified to add a new remote module to the PatientRecords system. We'll use a concrete example: adding a **"Care Coordination"** module on port 4010.

---

## Table of Contents

1. [Overview & Architecture](#overview--architecture)
2. [Module File Structure](#module-file-structure)
3. [Step 1: Create the Module App](#step-1-create-the-module-app)
4. [Step 2: Docker Configuration](#step-2-docker-configuration)
5. [Step 3: Docker Compose Integration](#step-3-docker-compose-integration)
6. [Step 4: Module Registry](#step-4-module-registry)
7. [Step 5: Shell App Integration](#step-5-shell-app-integration)
8. [Step 6: Build & Deploy](#step-6-build--deploy)
9. [Validation Checklist](#validation-checklist)
10. [Troubleshooting](#troubleshooting)

---

## Overview & Architecture

### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                    Shell App (Port 4200)                    │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ bootstrap.ts (hardcoded routes)                       │  │
│  │ - Imports from Module Federation                      │  │
│  │ - Defines routing to each module                      │  │
│  └───────────────────────────────────────────────────────┘  │
│                          │                                   │
│                          ├─ webpack.config.js               │
│                          │  (declares all remotes)          │
│                          │                                  │
│  ┌───────────────────────┴──────────────────────────────┐  │
│  │            Registry (from Backend API)               │  │
│  │  - Module list (visible, order, roles)              │  │
│  │  - Displayed in sidebar dynamically                 │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
  │Demographics  │    │Care Coord    │    │Vitals        │
  │(Port 4201)   │    │(Port 4010)   │    │(Port 4202)   │
  │remoteEntry.js│    │remoteEntry.js│    │remoteEntry.js│
  └──────────────┘    └──────────────┘    └──────────────┘
```

### Key Concepts

- **Shell App**: Main Angular app that orchestrates everything
- **Remote Module**: Independent Angular app built separately
- **Module Federation**: Webpack plugin that allows shell to load modules at runtime
- **Registry**: JSON document listing all modules (visibility, roles, order)
- **remoteEntry.js**: Bootstrap file served by each module that Module Federation loads

---

## Module File Structure

Here's the complete file structure for a new module:

```
frontend/modules/care-coordination/
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   └── care-coordination/
│   │   │       ├── care-coordination.component.ts
│   │   │       ├── care-coordination.component.html
│   │   │       └── care-coordination.component.css
│   │   ├── services/
│   │   │   └── care-coordination.service.ts
│   │   ├── models/
│   │   │   └── care-coordination.model.ts
│   │   ├── care-coordination.routes.ts          ← Routes definition
│   │   └── care-coordination.module.ts          ← Module + re-exports
│   ├── main.ts                                   ← Bootstrap
│   └── index.html
├── webpack.config.js                            ← Module Federation config
├── Dockerfile                                    ← Container definition
├── package.json                                  ← Dependencies
├── angular.json                                  ← Angular build config
├── tsconfig.json                                 ← TypeScript config
└── tsconfig.app.json                            ← App-specific TS config
```

---

## Step 1: Create the Module App

### 1.1 Create Directory Structure

```bash
mkdir -p frontend/modules/care-coordination/src/app/{components,services,models}
cd frontend/modules/care-coordination
```

### 1.2 Create `package.json`

Copy and modify from an existing module (e.g., `demographics`):

```json
{
  "name": "patient-records-care-coordination",
  "version": "0.1.0",
  "description": "PatientRecords Care Coordination Micro-Frontend",
  "scripts": {
    "ng": "ng",
    "start": "ng serve --port 4010",
    "build": "ng build",
    "watch": "ng build --watch --configuration development",
    "test": "ng test"
  },
  "private": true,
  "dependencies": {
    "@angular/animations": "^17.0.0",
    "@angular/common": "^17.0.0",
    "@angular/compiler": "^17.0.0",
    "@angular/core": "^17.0.0",
    "@angular/forms": "^17.0.0",
    "@angular/platform-browser": "^17.0.0",
    "@angular/platform-browser-dynamic": "^17.0.0",
    "@angular/router": "^17.0.0",
    "rxjs": "^7.8.0",
    "tslib": "^2.6.0",
    "zone.js": "^0.14.0"
  },
  "devDependencies": {
    "@angular-devkit/build-angular": "^17.0.0",
    "@angular/cli": "^17.0.0",
    "@angular/compiler-cli": "^17.0.0",
    "@angular-builders/custom-webpack": "^17.0.0",
    "@angular-architects/module-federation": "^17.0.0",
    "@angular-architects/module-federation-tools": "^17.0.0",
    "typescript": "~5.2.0",
    "webpack": "^5.88.0"
  }
}
```

### 1.3 Create `webpack.config.js` (Module Federation Config)

This is **critical**—Module Federation won't work without this:

```javascript
// frontend/modules/care-coordination/webpack.config.js
const { shareAll, withModuleFederationPlugin } = require('@angular-architects/module-federation/webpack');

const mfConfig = {
  // THIS NAME MUST MATCH what you reference in shell app
  // If you use 'import("careCoordinationApp/...")', 
  // then name must be 'careCoordinationApp'
  name: 'careCoordinationApp',
  
  // Standard filename for Module Federation bootstrap
  filename: 'remoteEntry.js',
  
  // What this module exposes to other apps
  exposes: {
    // Key: relative path that imports will use
    // Value: path to the actual file
    './CareCoordinationModule': './src/app/care-coordination.module.ts',
  },
  
  // Shared dependencies with shell app
  // These versions are negotiated with shell app at runtime
  shared: shareAll({
    singleton: true,        // Only one instance across all apps
    strictVersion: false,   // Allow minor version mismatches
    requiredVersion: false, // Don't require specific version
  }),
};

let config = withModuleFederationPlugin(mfConfig);

// Set publicPath for module loading
config.output = config.output || {};
config.output.publicPath = 'auto'; // Dynamically determine public path

module.exports = config;
```

**Important Names to Match:**
- `name: 'careCoordinationApp'` → Referenced in shell as `careCoordinationApp/...`
- `exposes: './CareCoordinationModule'` → Referenced in shell as `.../CareCoordinationModule`

### 1.4 Create `src/app/care-coordination.routes.ts`

Define the routing for this module. **Must have empty path** as the base:

```typescript
// frontend/modules/care-coordination/src/app/care-coordination.routes.ts
import { Routes } from '@angular/router';
import { CareCoordinationComponent } from './components/care-coordination/care-coordination.component';

/**
 * Routes for Care Coordination module
 * 
 * These are exposed via Module Federation and lazy-loaded by shell app
 * The empty path '' means this component loads at:
 *   /dashboard/care-coordination
 *   /dashboard/care-coordination/:patientId
 */
export const CARE_COORDINATION_ROUTES: Routes = [
  {
    path: '',
    component: CareCoordinationComponent
  }
];
```

### 1.5 Create `src/app/care-coordination.module.ts`

This file must **re-export the routes** so Module Federation can find them:

```typescript
// frontend/modules/care-coordination/src/app/care-coordination.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CareCoordinationComponent } from './components/care-coordination/care-coordination.component';
import { CARE_COORDINATION_ROUTES } from './care-coordination.routes';

/**
 * Care Coordination Module
 * 
 * This module is exposed via Webpack Module Federation.
 * It must:
 * 1. Declare all its components
 * 2. Re-export the CARE_COORDINATION_ROUTES constant (for remote loading)
 * 3. Set up RouterModule with the routes
 */
@NgModule({
  declarations: [CareCoordinationComponent],
  imports: [CommonModule, RouterModule.forChild(CARE_COORDINATION_ROUTES)],
})
export class CareCoordinationModule {}

// CRITICAL: Re-export routes for Module Federation
export { CARE_COORDINATION_ROUTES };
export { CareCoordinationComponent };
```

### 1.6 Create `src/app/components/care-coordination/care-coordination.component.ts`

The main component for this module. **Must subscribe to route params** to receive `patientId`:

```typescript
// frontend/modules/care-coordination/src/app/components/care-coordination/care-coordination.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CareCoordinationService } from '../../services/care-coordination.service';

@Component({
  selector: 'app-care-coordination',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './care-coordination.component.html',
  styleUrls: ['./care-coordination.component.css']
})
export class CareCoordinationComponent implements OnInit, OnDestroy {
  patientId: string | null = null;
  coordinationData: any = null;
  loading = false;
  error: string | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private service: CareCoordinationService
  ) {}

  ngOnInit(): void {
    // IMPORTANT: Subscribe to route params to get patientId
    // This fires when:
    //   /dashboard/care-coordination/:patientId
    // Shell app passes patientId as route parameter
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        this.patientId = params['patientId'] || null;
        console.log('[CareCoordination] Patient ID:', this.patientId);
        
        if (this.patientId) {
          this.loadCoordinationData();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadCoordinationData(): void {
    if (!this.patientId) return;
    
    this.loading = true;
    this.error = null;
    
    this.service.getCoordinationData(this.patientId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.coordinationData = data;
          this.loading = false;
        },
        error: (err) => {
          this.error = 'Failed to load coordination data';
          this.loading = false;
          console.error('[CareCoordination] Error loading data:', err);
        }
      });
  }
}
```

### 1.7 Create `src/app/components/care-coordination/care-coordination.component.html`

```html
<!-- frontend/modules/care-coordination/src/app/components/care-coordination/care-coordination.component.html -->
<div class="care-coordination-container">
  <h2>Care Coordination</h2>
  
  <div *ngIf="loading" class="loading">
    Loading care coordination data...
  </div>
  
  <div *ngIf="error" class="error">
    {{ error }}
  </div>
  
  <div *ngIf="coordinationData && !loading" class="coordination-data">
    <div class="patient-info">
      <p><strong>Patient ID:</strong> {{ patientId }}</p>
    </div>
    
    <!-- Render your coordination data here -->
    <div class="coordination-items">
      <pre>{{ coordinationData | json }}</pre>
    </div>
  </div>
</div>
```

### 1.8 Create `src/app/components/care-coordination/care-coordination.component.css`

```css
/* frontend/modules/care-coordination/src/app/components/care-coordination/care-coordination.component.css */
.care-coordination-container {
  padding: 20px;
  font-family: Arial, sans-serif;
}

.loading, .error {
  margin: 20px 0;
  padding: 15px;
  border-radius: 4px;
}

.loading {
  background-color: #f0f0f0;
  color: #333;
}

.error {
  background-color: #ffebee;
  color: #c62828;
  border: 1px solid #c62828;
}

.coordination-data {
  margin-top: 20px;
}

.patient-info {
  background-color: #f5f5f5;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.coordination-items {
  background-color: #fafafa;
  padding: 15px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  max-height: 400px;
  overflow-y: auto;
}
```

### 1.9 Create `src/app/services/care-coordination.service.ts`

```typescript
// frontend/modules/care-coordination/src/app/services/care-coordination.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CareCoordinationService {
  private apiUrl = '/api/patients'; // Backend API base URL

  constructor(private http: HttpClient) {}

  /**
   * Get care coordination data for a patient
   * Calls: GET /api/patients/:patientId/care-coordination
   */
  getCoordinationData(patientId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${patientId}/care-coordination`);
  }
}
```

### 1.10 Create `src/app/models/care-coordination.model.ts`

```typescript
// frontend/modules/care-coordination/src/app/models/care-coordination.model.ts
export interface CoordinationMember {
  id: string;
  name: string;
  role: string;
  specialty: string;
  contact: string;
}

export interface CareCoordinationData {
  patientId: string;
  coordinationNeeds: string[];
  members: CoordinationMember[];
  lastUpdated: Date;
}
```

### 1.11 Create `src/main.ts`

```typescript
// frontend/modules/care-coordination/src/main.ts
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { CareCoordinationModule } from './app/care-coordination.module';

platformBrowserDynamic()
  .bootstrapModule(CareCoordinationModule)
  .catch(err => console.error(err));
```

### 1.12 Create `src/index.html`

```html
<!-- frontend/modules/care-coordination/src/index.html -->
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Care Coordination Module</title>
  <base href="/">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
  <div></div>
</body>
</html>
```

### 1.13 Create TypeScript Config Files

**`tsconfig.json`**: Copy from existing module

**`tsconfig.app.json`**: Copy from existing module

**`angular.json`**: Copy from existing module and update paths to `care-coordination`

---

## Step 2: Docker Configuration

### 2.1 Create `Dockerfile`

```dockerfile
# frontend/modules/care-coordination/Dockerfile

# Build stage
FROM node:24-alpine AS builder
WORKDIR /app

# Copy shared library and install its dependencies
COPY shared ../shared
RUN cd ../shared && npm install --no-audit --no-fund

# Copy workspace config
COPY tsconfig.base.json ../tsconfig.base.json

# Copy package files and module source
COPY modules/care-coordination/package*.json ./
COPY modules/care-coordination/src ./src
COPY modules/care-coordination/angular.json ./
COPY modules/care-coordination/webpack.config.js ./
COPY modules/care-coordination/tsconfig*.json ./

# Install dependencies and build
RUN npm install --no-audit --no-fund
RUN npm run build

# Serve stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY ../nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 4200
CMD ["nginx", "-g", "daemon off;"]
```

This Dockerfile:
1. Builds the module using Angular CLI and webpack
2. Outputs to `dist/` directory
3. Serves via nginx

---

## Step 3: Docker Compose Integration

### 3.1 Update `docker-compose.yml`

Add this service alongside existing modules:

```yaml
# docker-compose.yml

# ... existing services ...

  patientrecord-care-coordination:
    build:
      context: ./frontend
      dockerfile: modules/care-coordination/Dockerfile
    image: patientrecord-care-coordination
    container_name: patientrecord-care-coordination
    ports:
      - "4010:4200"  # Host port 4010 → Container port 4200
    depends_on:
      patientrecord-backend:
        condition: service_started
    networks:
      - patientrecords
    environment:
      - ANGULAR_ENVIRONMENT=production
```

**Port Convention:**

| Module                | Port |
|----------------------|------|
| Shell App            | 4200 |
| Demographics         | 4201 |
| Vitals               | 4202 |
| Labs                 | 4203 |
| Medications          | 4204 |
| Visits               | 4205 |
| Care Team            | 4206 |
| Procedures (React)   | 4207 |
| **Care Coordination**| **4010** |

---

## Step 4: Module Registry

The registry controls **which modules appear in the sidebar** and **their visibility to different roles**.

### 4.1 Add to `backend/registry.json`

```json
{
  "version": "1.0.0",
  "modules": [
    // ... existing modules ...
    {
      "id": "care-coordination",
      "name": "Care Coordination",
      "description": "Manage patient care coordination and team assignments",
      "icon": "👥",
      "path": "care-coordination",
      "enabled": true,
      "roles": ["admin", "physician"],
      "order": 9,
      "version": "1.0.0",
      "framework": "angular",
      "remoteEntry": "http://localhost:4010/remoteEntry.js",
      "remoteName": "careCoordinationApp",
      "exposedModule": "./CareCoordinationModule"
    }
  ]
}
```

**Field Breakdown:**

| Field | Purpose | Example |
|-------|---------|---------|
| `id` | Unique identifier (used in routes) | `care-coordination` |
| `name` | Display name in sidebar | `Care Coordination` |
| `description` | Module description | `Manage patient care...` |
| `icon` | Emoji or icon character | `👥` |
| `path` | URL path segment | `care-coordination` |
| `enabled` | Show in sidebar? `true`/`false` | `true` |
| `roles` | Which user roles see this | `["admin", "physician"]` |
| `order` | Position in sidebar (lower = higher) | `9` |
| `version` | Semantic version | `1.0.0` |
| `framework` | `angular` or `react` | `angular` |
| `remoteEntry` | Full URL to remoteEntry.js | `http://localhost:4010/remoteEntry.js` |
| `remoteName` | Webpack federation name | `careCoordinationApp` |
| `exposedModule` | Exposed key from webpack | `./CareCoordinationModule` |

### 4.2 Mirror in `frontend/modules/registry.json`

Copy the same module entry to the frontend registry (serves as fallback):

```json
{
  "version": "1.0.0",
  "modules": [
    // ... existing modules ...
    {
      "id": "care-coordination",
      "name": "Care Coordination",
      "description": "Manage patient care coordination and team assignments",
      "icon": "👥",
      "path": "care-coordination",
      "enabled": true,
      "roles": ["admin", "physician"],
      "order": 9,
      "version": "1.0.0",
      "framework": "angular",
      "remoteEntry": "http://localhost:4010/remoteEntry.js",
      "remoteName": "careCoordinationApp",
      "exposedModule": "./CareCoordinationModule"
    }
  ]
}
```

---

## Step 5: Shell App Integration

The shell app must know how to route to your module and how to load it via Module Federation.

### 5.1 Update `frontend/shell-app/webpack.config.js`

Add your module as a webpack remote. This tells webpack that `careCoordinationApp` exists:

```js
// frontend/shell-app/webpack.config.js
const { shareAll, withModuleFederationPlugin } = require('@angular-architects/module-federation/webpack');

const mfConfig = {
  name: 'shell',
  filename: 'remoteEntry.js',
  remotes: {
    demographicsApp: 'http://localhost:4201/remoteEntry.js',
    vitalsApp: 'http://localhost:4202/remoteEntry.js',
    labsApp: 'http://localhost:4203/remoteEntry.js',
    medicationsApp: 'http://localhost:4204/remoteEntry.js',
    visitsApp: 'http://localhost:4205/remoteEntry.js',
    // ADD YOUR NEW MODULE HERE:
    careCoordinationApp: 'http://localhost:4010/remoteEntry.js',
  },
  exposes: {
    './AuthService': 'src/app/core/services/auth.service.ts',
    './PatientContextService': 'src/app/core/services/patient-context.service.ts',
  },
  shared: shareAll({
    singleton: true,
    strictVersion: false,
    requiredVersion: false,
  }),
};

let config = withModuleFederationPlugin(mfConfig);
config.output.publicPath = 'auto';
module.exports = config;
```

**Critical:** The key (`careCoordinationApp`) must exactly match:
- The `name` field in your module's webpack.config.js
- The value you use in bootstrap.ts routes

### 5.2 Update `frontend/shell-app/src/bootstrap.ts`

Add routes to your module. You need **two route entries**: one with patient ID, one without.

```typescript
// frontend/shell-app/src/bootstrap.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, Routes } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';
import { AppComponent } from './app/app.component';
import { JwtInterceptor } from './app/core/interceptors/jwt.interceptor';
import { authGuard } from './app/core/guards/auth.guard';

const baseRoutes: Routes = [
  { path: 'login', loadComponent: () => import('./app/components/login/login.component').then(m => m.LoginComponent) },
  {
    path: 'dashboard',
    loadComponent: () => import('./app/components/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard],
    children: [
      // ... existing module routes ...
      
      // ADD YOUR NEW MODULE HERE (two entries):
      
      // Route WITHOUT patient ID
      // Accessed: /dashboard/care-coordination
      {
        path: 'care-coordination',
        loadChildren: () => 
          (import('careCoordinationApp/CareCoordinationModule') as any)
            .then((m: any) => m.CARE_COORDINATION_ROUTES)
      },
      
      // Route WITH patient ID parameter
      // Accessed: /dashboard/care-coordination/:patientId
      {
        path: 'care-coordination/:patientId',
        loadChildren: () =>
          (import('careCoordinationApp/CareCoordinationModule') as any)
            .then((m: any) => m.CARE_COORDINATION_ROUTES)
      },
    ]
  }
];

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(baseRoutes),
    provideHttpClient(withInterceptorsFromDi()),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: JwtInterceptor,
      multi: true
    }
  ]
});
```

**Key Points:**
- Import path: `'careCoordinationApp/CareCoordinationModule'`
  - `careCoordinationApp` = remote name from webpack
  - `CareCoordinationModule` = exposed key from module's webpack.config
- Export name: `.then((m: any) => m.CARE_COORDINATION_ROUTES)`
  - Must match what the module exports in its `.module.ts`

### 5.3 Add TypeScript Declarations

TypeScript needs to know these modules exist. This prevents build errors:

```typescript
// frontend/shell-app/src/remote-modules.d.ts

declare module 'careCoordinationApp/CareCoordinationModule' {
  export const CARE_COORDINATION_ROUTES: any[];
}
```

Add this to the existing file if it already has other declarations.

---

## Step 6: Build & Deploy

### 6.1 Build the Module

```bash
# Build just the care-coordination module
cd frontend/modules/care-coordination
npm install
npm run build
```

### 6.2 Rebuild Shell App

You **must** rebuild the shell app because webpack needs to know about the new remote:

```bash
cd frontend/shell-app
npm install
npm run build
```

### 6.3 Build Docker Images

```bash
# Build the new module's Docker image
docker-compose build patientrecord-care-coordination

# Rebuild shell to include new webpack config
docker-compose build patientrecord-shell

# Optionally rebuild backend if registry changed
docker-compose build patientrecord-backend
```

### 6.4 Start Services

```bash
# Start all services
docker-compose up -d

# Or start just the new ones
docker-compose up -d patientrecord-care-coordination patientrecord-shell
```

### 6.5 Verify

```bash
# Check that all containers are running
docker-compose ps

# Check logs for errors
docker-compose logs patientrecord-care-coordination
docker-compose logs patientrecord-shell
```

---

## Validation Checklist

### Module App
- [ ] `webpack.config.js` has correct `name: 'careCoordinationApp'`
- [ ] `webpack.config.js` has `exposes: { './CareCoordinationModule': ... }`
- [ ] `care-coordination.module.ts` exists and exports `CARE_COORDINATION_ROUTES`
- [ ] `care-coordination.routes.ts` exports routes with empty path
- [ ] Component subscribes to `ActivatedRoute.params` for `patientId`
- [ ] `package.json` has all dependencies
- [ ] Runs locally: `npm start` → port 4010 ✅

### Docker
- [ ] `Dockerfile` exists and builds successfully
- [ ] `docker build .` runs without errors
- [ ] Built image runs: `docker run -p 4010:4200 <image>`

### Docker Compose
- [ ] `docker-compose.yml` has new service entry
- [ ] Port mapping: `"4010:4200"`
- [ ] Service depends on backend
- [ ] Service on same network

### Registry
- [ ] Entry in `backend/registry.json` with all required fields
- [ ] Entry in `frontend/modules/registry.json` (mirrors backend)
- [ ] `remoteEntry` URL correct
- [ ] `remoteName` matches webpack name
- [ ] `exposedModule` matches webpack expose key

### Shell App
- [ ] `webpack.config.js` lists new remote
- [ ] `bootstrap.ts` has TWO routes (with and without `:patientId`)
- [ ] Routes use correct import path and constant name
- [ ] `remote-modules.d.ts` declares the new type

### Integration
- [ ] Module appears in sidebar when logged in ✅
- [ ] Module is visible for correct roles ✅
- [ ] Module hides for users without role ✅
- [ ] Clicking module navigates to `/dashboard/care-coordination` ✅
- [ ] Module loads (no console errors) ✅
- [ ] Selecting patient navigates to `/dashboard/care-coordination/:patientId` ✅
- [ ] Patient data loads ✅

---

## Troubleshooting

### Module Not Appearing in Sidebar

**Symptoms:**
- Module shows in registry but not in UI sidebar

**Check:**
1. Is `enabled: true` in registry?
2. Is current user role in `roles` array? (default test user is usually `admin` or `nurse`)
3. Did you restart backend after changing registry? (MongoDB is seeded on startup)
4. Check browser console for errors loading registry

**Solution:**
```bash
# Restart backend to reseed registry
docker-compose restart patientrecord-backend

# Or manually update via API
curl -X PUT http://localhost:5001/api/admin/registry/modules/care-coordination \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'
```

### "Cannot find module" / "remoteEntry not found"

**Symptoms:**
```
Error: Cannot resolve module 'careCoordinationApp/CareCoordinationModule'
Error: careCoordinationApp container not found
```

**Check:**
1. Is module listed in shell's `webpack.config.js` remotes?
2. Is module container running? `docker ps | grep care`
3. Is `remoteEntry.js` accessible? `curl http://localhost:4010/remoteEntry.js`
4. Did you rebuild shell after updating webpack? `npm run build`

**Solution:**
```bash
# Verify module is running
curl http://localhost:4010/remoteEntry.js

# Should return JavaScript code starting with: (window)=>({...})

# If 404, rebuild and restart
docker-compose down
docker-compose build patientrecord-care-coordination patientrecord-shell
docker-compose up -d
```

### "NullInjectorError" or Blank Page

**Symptoms:**
- Module loads but shows blank page
- Console: `NullInjectorError: No provider for HttpClient`

**Check:**
1. Routes missing from `bootstrap.ts`?
2. Component not using standalone pattern?
3. HttpClient not provided in module?

**Solution:**
```typescript
// Make sure module provides HttpClient
@NgModule({
  imports: [
    CommonModule,
    HttpClientModule,  // ADD THIS
    RouterModule.forChild(CARE_COORDINATION_ROUTES)
  ]
})
export class CareCoordinationModule {}
```

### Module Loads But Shows Wrong Data

**Symptoms:**
- Module shows, but data doesn't load or loads incorrectly
- API calls fail silently

**Check:**
1. Component actually subscribed to `ActivatedRoute.params`?
2. Service URL correct? (should use `/api/patients/...`)
3. JWT token being sent with requests?
4. Backend has the endpoint implemented?

**Solution:**
```typescript
// Verify subscription
ngOnInit() {
  // Add logging
  this.route.params.subscribe(params => {
    console.log('[MyModule] Params received:', params);  // ← Should log patientId
    this.loadData(params['patientId']);
  });
}
```

### Build Fails: "Cannot resolve shared library"

**Symptoms:**
```
error: Cannot resolve 'x' (as external from /app/src/index.ts)
```

**Check:**
1. Dependency version mismatch?
2. Missing from `webpack.config.js` shared section?

**Solution:**
```js
// Make sure shared has this dependency
shared: shareAll({
  singleton: true,
  strictVersion: false,  // Allow version mismatch
  requiredVersion: false // Don't require specific version
})
```

### "Patient data doesn't load" but navigation works

**Symptoms:**
- Module loads, page shows, but no data appears
- `patientId` appears to be null in component

**Check:**
1. Component logs showing patientId?
2. Route parameter name matches? (should be `patientId`)
3. API endpoint exists on backend?

**Debug:**
```typescript
ngOnInit() {
  this.route.params.subscribe(params => {
    console.log('[Module] All params:', params);
    console.log('[Module] patientId specifically:', params['patientId']);
    
    // Also log from dashboard navigation
    const urlSegments = this.route.snapshot.url;
    console.log('[Module] URL segments:', urlSegments);
  });
}
```

---

## Common File Reference Summary

When adding a new module, you need to modify or create these files:

### Create (New Module)
- `frontend/modules/care-coordination/webpack.config.js`
- `frontend/modules/care-coordination/src/app/care-coordination.module.ts`
- `frontend/modules/care-coordination/src/app/care-coordination.routes.ts`
- `frontend/modules/care-coordination/src/app/components/care-coordination/`
- `frontend/modules/care-coordination/Dockerfile`
- `frontend/modules/care-coordination/package.json`
- `frontend/modules/care-coordination/angular.json`
- `frontend/modules/care-coordination/tsconfig.json`

### Modify (Shell App)
- `frontend/shell-app/webpack.config.js` → add remote
- `frontend/shell-app/src/bootstrap.ts` → add 2 routes
- `frontend/shell-app/src/remote-modules.d.ts` → add TypeScript declaration

### Modify (Backend/DevOps)
- `backend/registry.json` → add module entry
- `frontend/modules/registry.json` → mirror entry
- `docker-compose.yml` → add service

---

## Summary

1. **Module App** (4-5 hours): Build Angular app with Module Federation config
2. **Docker** (30 min): Create Dockerfile
3. **Registry** (15 min): Add module metadata to both registries
4. **Shell Integration** (30 min): Add webpack remote + routes
5. **Build & Deploy** (15 min): Docker build and start
6. **Testing** (30 min): Verify all integration points

**Total: ~6-7 hours for experienced developer, ~10 hours for first timer**

