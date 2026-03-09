# Plugin Architecture for PatientRecords V2

## Overview

PatientRecords V2 introduces a **runtime plugin/registry-based architecture** that enables true extensibility without requiring code changes to the shell application. Micro-frontends are dynamically discovered, loaded, and integrated based on a central registry.

## Vision

**From:** Compile-time composition (webpack module federation) + hard-coded tabs
**To:** Runtime composition (dynamic module discovery) + registry-driven navigation

This shift enables:
- ✅ **Zero rebuild** to add a new module
- ✅ **Non-technical configuration** of UI layout and visibility
- ✅ **True plugin ecosystem** where modules are independent deployables
- ✅ **Easy rollback** by removing from registry
- ✅ **A/B testing** and role-based module visibility
- ✅ **Scalability** as number of clinical domains grows

## Architecture

### 1. Module Registry

The registry is the source of truth for which modules are available and how to load them.

**Location:** `frontend/modules/registry.json`

**Format:**
```json
{
  "version": "1.0.0",
  "modules": [
    {
      "id": "demographics",
      "name": "Demographics",
      "description": "Patient demographics and identity information",
      "icon": "person",
      "path": "demographics",
      "url": "/modules/demographics/index.js",
      "version": "1.0.0",
      "enabled": true,
      "roles": ["admin", "physician", "nurse"],
      "order": 1
    },
    {
      "id": "vitals",
      "name": "Vital Signs",
      "description": "Patient vital signs and measurements",
      "icon": "favorite",
      "path": "vitals",
      "url": "/modules/vitals/index.js",
      "version": "1.0.0",
      "enabled": true,
      "roles": ["admin", "physician", "nurse"],
      "order": 2
    },
    {
      "id": "labs",
      "name": "Labs",
      "description": "Laboratory test results",
      "icon": "science",
      "path": "labs",
      "url": "/modules/labs/index.js",
      "version": "1.0.0",
      "enabled": true,
      "roles": ["admin", "physician"],
      "order": 3
    },
    {
      "id": "medications",
      "name": "Medications",
      "description": "Current and historical medications",
      "icon": "medication",
      "path": "medications",
      "url": "/modules/medications/index.js",
      "version": "1.0.0",
      "enabled": true,
      "roles": ["admin", "physician"],
      "order": 4
    },
    {
      "id": "visits",
      "name": "Visits",
      "description": "Clinical visit records",
      "icon": "event",
      "path": "visits",
      "url": "/modules/visits/index.js",
      "version": "1.0.0",
      "enabled": true,
      "roles": ["admin", "physician"],
      "order": 5
    },
    {
      "id": "care-team",
      "name": "Care Team",
      "description": "Care team members and assignments",
      "icon": "people",
      "path": "care-team",
      "url": "/modules/care-team/index.js",
      "version": "1.0.0",
      "enabled": false,
      "roles": ["admin", "physician"],
      "order": 6
    },
    {
      "id": "procedures",
      "name": "Procedures",
      "description": "Surgical and clinical procedures",
      "icon": "healing",
      "path": "procedures",
      "url": "/modules/procedures/index.js",
      "version": "1.0.0",
      "enabled": false,
      "roles": ["admin", "physician"],
      "order": 7
    }
  ]
}
```

### 2. Shell Application Changes

#### Navigation Structure

Replace tab-based navigation with dynamic side navigation driven by registry.

**Shell Layout (High-Level):**
```
┌─────────────────────────────────┐
│ PatientRecords                  │
├─────────────┬───────────────────┤
│ Dashboard   │                   │
├─────────────┤                   │
│ Patient:    │                   │
│ [Search]    │   Dynamic Module  │
│             │   Content Area    │
│ Side Nav:   │                   │
│ ✓ Demographics │                   │
│ ✓ Vitals    │                   │
│ ✓ Labs      │                   │
│ ✓ Meds      │                   │
│ ✓ Visits    │                   │
│ ✓ Care Team │                   │
│ ✓ Procedures│                   │
│             │                   │
└─────────────┴───────────────────┘
```

#### Module Loader Service

**Purpose:** Dynamically load and instantiate modules from registry

**Pseudocode:**
```typescript
// src/app/services/module-loader.service.ts

export class ModuleLoaderService {
  private registry: ModuleRegistry;
  private loadedModules = new Map();
  
  async loadRegistry(): Promise<ModuleRegistry> {
    const response = await fetch('/modules/registry.json');
    this.registry = await response.json();
    return this.registry;
  }
  
  async loadModule(moduleId: string): Promise<any> {
    const moduleMeta = this.registry.modules.find(m => m.id === moduleId);
    
    if (!moduleMeta) {
      throw new Error(`Module ${moduleId} not found in registry`);
    }
    
    if (this.loadedModules.has(moduleId)) {
      return this.loadedModules.get(moduleId);
    }
    
    // Dynamic script loading
    const module = await this.loadScript(moduleMeta.url);
    this.loadedModules.set(moduleId, module);
    
    return module;
  }
  
  private loadScript(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.onload = () => resolve(window[this.extractModuleName(url)]);
      script.onerror = () => reject(new Error(`Failed to load ${url}`));
      document.head.appendChild(script);
    });
  }
  
  getAvailableModules(userRole: string): ModuleMetadata[] {
    return this.registry.modules
      .filter(m => m.enabled && m.roles.includes(userRole))
      .sort((a, b) => a.order - b.order);
  }
}
```

#### Navigation Component

**Purpose:** Render dynamic navigation based on registry

```typescript
// src/app/shell/navigation/navigation.component.ts

export class NavigationComponent implements OnInit {
  modules: ModuleMetadata[] = [];
  selectedModule: ModuleMetadata;
  
  constructor(
    private moduleLoader: ModuleLoaderService,
    private authService: AuthService
  ) {}
  
  ngOnInit() {
    this.loadNavigation();
  }
  
  async loadNavigation() {
    await this.moduleLoader.loadRegistry();
    const userRole = this.authService.getUserRole();
    this.modules = this.moduleLoader.getAvailableModules(userRole);
    
    // Auto-select first module
    if (this.modules.length > 0) {
      this.selectModule(this.modules[0]);
    }
  }
  
  async selectModule(module: ModuleMetadata) {
    this.selectedModule = module;
    const loadedModule = await this.moduleLoader.loadModule(module.id);
    this.renderModule(loadedModule);
  }
  
  private renderModule(module: any) {
    // Route to module component or dynamically instantiate
    // Details depend on module interface
  }
}
```

### 3. Module Interface/Contract

Every micro-frontend module must implement a standard interface.

**Module Manifest (in package.json):**
```json
{
  "name": "care-team-module",
  "version": "1.0.0",
  "microFrontend": {
    "exposedComponent": "CareTeamComponent",
    "exposedModule": "./src/app/care-team/care-team.module.ts",
    "apiEndpoints": [
      "GET /api/patients/:id/care-team",
      "POST /api/patients/:id/care-team",
      "PUT /api/patients/:id/care-team/:memberId",
      "DELETE /api/patients/:id/care-team/:memberId"
    ],
    "requiredServices": ["AuthService", "PatientService"],
    "dataModel": "care-team.schema.json"
  }
}
```

**Module Entry Point (index.js):**
```javascript
// Each module exports a standardized interface
export const ModuleExports = {
  // Component to render
  component: CareTeamComponent,
  
  // Module definition (if using Angular modules)
  module: CareTeamModule,
  
  // API service interface
  api: {
    getTeam: (patientId) => fetch(`/api/patients/${patientId}/care-team`),
    addMember: (patientId, member) => fetch(...),
    removeMember: (patientId, memberId) => fetch(...)
  },
  
  // Module metadata
  metadata: {
    id: 'care-team',
    version: '1.0.0',
    apiVersion: 'v1'
  }
};
```

### 4. Development Workflow for New Modules

**Adding a Care Team Module (Example):**

1. **Create independent project:**
   ```bash
   ng new care-team-module
   cd care-team-module
   ```

2. **Scaffold module structure:**
   ```
   care-team-module/
     src/
       app/
         care-team/
           care-team.component.ts
           care-team.component.html
           care-team.service.ts
           care-team.module.ts
           models/
             care-team.model.ts
       index.ts (entry point)
     webpack.config.js
     package.json
   ```

3. **Build independently:**
   ```bash
   npm run build
   # Output: dist/care-team-module.js
   ```

4. **Deploy to modules directory:**
   ```bash
   cp dist/care-team-module.js ../PatientRecords/frontend/modules/care-team/
   ```

5. **Register in registry:**
   ```json
   // frontend/modules/registry.json
   {
     "id": "care-team",
     "name": "Care Team",
     "icon": "people",
     "path": "care-team",
     "url": "/modules/care-team/care-team-module.js",
     "enabled": true,
     "roles": ["admin", "physician"],
     "order": 6
   }
   ```

6. **Done!** Shell app automatically loads and displays the new module

### 5. Backend Extension Points

**New Module Endpoints Pattern:**

Each module maps to backend endpoints following RESTful conventions.

**Care Team Example:**
```
GET    /api/patients/:id/care-team              → List team members
POST   /api/patients/:id/care-team              → Add member
PUT    /api/patients/:id/care-team/:memberId   → Update member
DELETE /api/patients/:id/care-team/:memberId   → Remove member
```

**Procedures Example:**
```
GET    /api/patients/:id/procedures             → List procedures
POST   /api/patients/:id/procedures             → Add procedure
GET    /api/patients/:id/procedures/:procId    → Get procedure detail
PUT    /api/patients/:id/procedures/:procId    → Update procedure
DELETE /api/patients/:id/procedures/:procId    → Remove procedure
```

Backend remains a single monolith but organized by domain:
```
backend/
  routes/
    auth.js
    patients.js
    vitals.js
    labs.js
    medications.js
    visits.js
    care-team.js      (NEW)
    procedures.js     (NEW)
  models/
    patient.js
    vital.js
    lab.js
    medication.js
    visit.js
    careTeam.js       (NEW)
    procedure.js      (NEW)
```

### 6. Configuration & Customization

**UI Configuration File:**
```json
// frontend/modules/ui-config.json
{
  "layout": "side-navigation",
  "theme": {
    "primaryColor": "#1976d2",
    "accentColor": "#ff4081"
  },
  "moduleVisibility": {
    "demographics": {
      "visible": true,
      "editable": ["admin", "physician"]
    },
    "vitals": {
      "visible": true,
      "editable": ["admin", "physician"]
    },
    "care-team": {
      "visible": true,
      "editable": ["admin"]
    }
  },
  "moduleSettings": {
    "vitals": {
      "defaultView": "chart",
      "chartType": "line",
      "refreshInterval": 300000
    },
    "labs": {
      "defaultView": "table",
      "showReferenceRanges": true
    }
  }
}
```

## Migration Path (Current → V2)

### Phase 1: Prepare Shell App (Sprint 1)
- ✅ Create module registry structure
- ✅ Implement ModuleLoaderService
- ✅ Build dynamic navigation component
- ✅ Add routing for module switching

### Phase 2: Refactor Existing Modules (Sprint 2-3)
- ✅ Demographics → standalone module + registry entry
- ✅ Vitals → standalone module + registry entry
- ✅ Labs → standalone module + registry entry
- ✅ Medications → standalone module + registry entry
- ✅ Visits → standalone module + registry entry

### Phase 3: Build New Modules (Sprint 4+)
- ✅ Care Team module (new)
- ✅ Procedures module (new)
- ✅ Future domains...

### Phase 4: Testing & Rollout
- ✅ Registry loading and validation
- ✅ Module isolation testing
- ✅ Role-based visibility testing
- ✅ Cross-module data consistency

## Benefits Summary

| Aspect | Current | V2 |
|--------|---------|-----|
| **Adding Module** | Code change + rebuild | Registry entry |
| **Time to Launch** | Days | Hours |
| **Module Dependencies** | Compile-time | Runtime |
| **Rollback** | Redeploy app | Remove from registry |
| **A/B Testing** | Complex | Config-based |
| **User Customization** | Code | Configuration |
| **Scaling Modules** | Linear complexity | Constant complexity |

## Technical Stack

- **Frontend Shell:** Angular
- **Modules:** Angular (or framework-agnostic via web components)
- **Module Loading:** Web Components + dynamic script loading
- **Registry:** JSON file (or REST API)
- **Backend:** Node.js/Express (monolithic)
- **Database:** MongoDB

## Future Enhancements

1. **Module Marketplace:** Central repository of available modules
2. **Versioning:** Multiple versions of same module running
3. **Module Dependencies:** Declare dependencies between modules
4. **Sandboxing:** Isolate modules in iframes
5. **Hot Reload:** Update modules without full app restart
6. **Module Signing:** Verify module authenticity before loading
7. **Usage Analytics:** Track which modules are used by whom
8. **A/B Testing Framework:** Built-in experiment management

## Conclusion

V2 transforms PatientRecords from a monolithic frontend with module federation into a true plugin ecosystem. This enables:
- Healthcare organizations to customize and extend without code changes
- Developer teams to work independently on modules
- Non-technical staff to configure the system via files
- The product to scale with new clinical domains easily

This is the next evolution toward a truly extensible healthcare platform.
