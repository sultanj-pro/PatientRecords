# Multi-Framework Micro-Frontend Architecture

## Executive Summary

PatientRecords demonstrates a **production-grade enterprise approach** to micro-frontend architecture by successfully running **Angular and React modules simultaneously** within a single shell application using Module Federation.

This showcases advantages that pure single-framework architectures cannot:
- True technology flexibility
- Real-world team autonomy scenarios
- Production-ready cross-framework communication
- Portfolio-grade architectural sophistication

---

## Why React for Procedures Module?

### Strategic Reasons

1. **Portfolio Impact**: Shows framework-agnostic thinking, not lock-in mentality
2. **Real-World Scenario**: Represents acquired teams or different tech choices
3. **Technical Excellence**: Demonstrates ability to integrate diverse technologies
4. **Hiring Narrative**: "We can work with any technology, anywhere"

### Technical Justification

Procedures module characteristics:
- Rich UI components (timeline, scheduling)
- Heavy client-side state management
- Potential for React ecosystem strengths (React Query, React Table, etc.)
- Lower complexity than existing modules (good first React integration)

### Why NOT Rebuild in Angular?

- ❌ No technical advantage (Angular could handle this equally)
- ❌ Missed portfolio opportunity
- ❌ Doesn't showcase multi-framework capability
- ❌ Real teams wouldn't force tech standardization

**Conclusion**: React choice is **strategic and intentional**, not technical necessity.

---

## Architecture: Dynamic Module Federation

### Component Model

```
┌─────────────────────────────────────────────────────────────┐
│                    Angular Shell (4200)                     │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ DashboardComponent                                   │  │
│  │ ├─ Current Patient Context (RxJS Observable)       │  │
│  │ ├─ PluginRegistryService (Module Discovery)        │  │
│  │ ├─ ModuleLoaderService (Dynamic Loading)           │  │
│  │ └─ Routing (Patient-aware URLs)                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────┐        ┌──────────────────────┐  │
│  │  Angular Modules    │        │  React Modules       │  │
│  │  (4201-4206)        │        │  (4207+)             │  │
│  │                     │        │                      │  │
│  │ • Vitals            │        │ • Procedures         │  │
│  │ • Labs              │        │ • (Future modules)   │  │
│  │ • Medications       │        │                      │  │
│  │ • Visits            │        │                      │  │
│  │ • Demographics      │        │                      │  │
│  │ • Care Team         │        │                      │  │
│  └─────────────────────┘        └──────────────────────┘  │
│         ↓                                ↓                   │
│    Angular Module                   React Module             │
│    Federation Runtime              Federation Runtime        │
│         ↓                                ↓                   │
│    Loads .component                Loads component           │
│         ↓                                ↓                   │
│    Renders in                      Mounts in                 │
│    Angular Template                DOM Container             │
└─────────────────────────────────────────────────────────────┘
         ↓                                ↓
    [All modules share]
    ├── Patient Context (localStorage + events)
    ├── Authentication (JWT tokens)
    ├── API Gateway (5000)
    └── Core patient data (MongoDB)
```

### Data Flow: Patient Context Synchronization

```
User clicks "Procedures" button in side navigation
        ↓
DashboardComponent.onModuleSelected(module)
        ↓
Router navigates to `/dashboard/procedures/20001`
        ↓
DashboardComponent.syncFromCurrentRoute()
  ├─ Extracts patientId: "20001"
  ├─ Updates currentPatientId property
  ├─ Updates PatientContextService
  ├─ Dispatches 'patient-context-changed' event
  └─ Updates localStorage.__PATIENT_CONTEXT__
        ↓
ModuleLoaderService detects module change
        ↓
If React module:
  ├─ Load remoteEntry.js from registry URL
  ├─ Initialize shared dependencies (React, React-DOM)
  ├─ Get exposed ProceduresModule
  ├─ Instantiate component with patientId prop
  └─ Mount in DOM container
        ↓
React Procedures Component
  ├─ Receives patientId as prop
  ├─ Calls usePatientContext() hook (listens to events)
  ├─ Calls useProcedures(patientId) hook
  ├─ Fetches data from BFF-Procedures
  │   └─ BFF forwards to Core API
  ├─ Renders procedure list
  └─ Subscribes to 'patient-context-changed' for updates
        ↓
If patient changes while on procedures:
  ├─ Event fires
  ├─ React hook updates state
  ├─ Component re-renders with new patient data
  └─ No page reload needed
```

---

## Loading Sequence: Step by Step

### 1. Application Startup

```typescript
// Shell App Init
1. AuthService.validateToken()
2. PluginRegistryService.loadRegistry()
   └─ GET /registry/registry.json
   └─ Returns all enabled/disabled modules
3. Dashboard renders
```

### 2. User Navigates to Module

```typescript
// User clicks "Procedures"
DashboardComponent {
  onModuleSelected(module) {
    // module = { id: 'procedures', path: 'procedures', framework: 'react', ... }
    
    router.navigateByUrl(`/dashboard/procedures/20001`)
  }
}
```

### 3. Route Resolution & Sync

```typescript
// Route change triggers sync
DashboardComponent {
  syncFromCurrentRoute() {
    const params = route.snapshot.params; // { modulePath: 'procedures', patientId: '20001' }
    
    this.currentPatientId = params.patientId;
    this.currentModule = registry.getModuleByPath('procedures');
    
    if (currentModule.framework === 'react') {
      this.loadReactModule(currentModule);
    }
  }
}
```

### 4. Dynamic Module Loading

```typescript
// ModuleLoaderService handles the complexity
async loadReactModule(module: ModuleMetadata) {
  // 1. Load remote entry
  const remoteContainer = await this.loadRemoteEntry(module.remoteEntry);
  
  // 2. Get exposed module
  const ModuleComponent = await remoteContainer.get(module.exposedModule);
  
  // 3. Render in container
  const container = document.querySelector('#module-container');
  const root = ReactDOM.createRoot(container);
  
  root.render(
    React.createElement(ModuleComponent.default, {
      patientId: this.currentPatientId
    })
  );
}
```

### 5. React Component Lifecycle

```javascript
// ProceduresModule.jsx
export default function ProceduresModule({ patientId }) {
  // Hook 1: Subscribe to patient context changes
  const currentPatientId = usePatientContext();
  
  // Hook 2: Fetch procedures data
  const { data, loading, error } = useProcedures(currentPatientId);
  
  // Hook 3: Listen to patient changes
  useEffect(() => {
    if (currentPatientId !== patientId) {
      // Re-render with new patient
      refetch();
    }
  }, [currentPatientId]);
  
  return (
    <ProceduresList procedures={data} />
  );
}
```

---

## Key Architecture Decisions

### 1. Why Module Federation Over iframes?

| Aspect | Module Federation | iframes |
|--------|------------------|---------|
| **Performance** | Shared dependencies, no duplication | Heavy, separate contexts |
| **Styling** | Shared CSS, consistent look | Isolated styles hard to sync |
| **Communication** | Direct JS references | Message passing complexity |
| **Dev Experience** | Hot reloading works | Difficult debugging |
| **Build Size** | Optimized sharing | Duplication bloat |

**Decision**: Module Federation provides production-grade performance and DX.

### 2. Why Shared Patient Context Instead of Router-Only?

| Approach | Router-Only | Shared Context |
|----------|-----------|-----------------|
| **Precision** | URL is source of truth | Context + URL = redundant |
| **Real-time** | Need navigation to sync | Event-driven sync (instant) |
| **Responsiveness** | Page reload/redirect | Local state updates (instant) |
| **Experience** | Clinician navigates = delay | Data updates = instant |

**Decision**: Shared context enables real-time cross-module updates required for clinical workflows.

### 3. Why Static registry.json vs Dynamic Backend Registry?

| Approach | Static JSON | Dynamic Backend |
|----------|-----------|-----------------|
| **Complexity** | Simple (file-based) | Complex (API+polling) |
| **Changes** | Redeploy to change | Hot-swap changes |
| **Scaling** | Fine for <20 modules | Better for 50+ modules |
| **Current Phase** | Perfect fit | Over-engineered |

**Decision**: Static JSON is appropriate for current scale. Can migrate to dynamic later.

### 4. Why Separate BFF Per Module?

| Approach | Single Core API | Separate BFFs |
|----------|---|---|
| **Independence** | Modules share backend | Module controls data shape |
| **Optimization** | Generic responses | Module-specific caching |
| **Scaling** | Single bottleneck | Scale what's needed |
| **Complexity** | Simpler | More services |

**Decision**: BFFs enable true module autonomy while core-api maintains data integrity.

---

## Portfolio Value Breakdown

### For Tech Leads / Architects

This demonstrates:
- ✅ Understanding of federation patterns
- ✅ Real-world scalability thinking
- ✅ Multi-team coordination models
- ✅ Technology flexibility within constraints
- ✅ Data consistency across loosely-coupled services

### For Senior Engineers

This demonstrates:
- ✅ Deep knowledge of micro-frontend tooling
- ✅ Cross-framework integration expertise
- ✅ Production-level thinking
- ✅ Performance optimization awareness
- ✅ Complex debugging/troubleshooting capability

### For Hiring Managers

This demonstrates:
- ✅ Can own end-to-end features
- ✅ Thinks about scalability early
- ✅ Understands real-world constraints
- ✅ Knows when/how to add complexity
- ✅ Communicates architectural decisions
- ✅ Can explain trade-offs clearly

### Interview Question Answers Enabled

**Q: "How would you structure a large frontend application?"**
A: [Walk through PatientRecords shell + module architecture]

**Q: "Can you use different frameworks in one app?"**
A: [Yes, demonstrated with Angular + React + Module Federation]

**Q: "How do you handle shared state across micro-frontends?"**
A: [Patient context pattern: localStorage + events + observables]

**Q: "What's your approach to performance at scale?"**
A: [Polyglot BFFs, per-module caching, lazy loading modules]

---

## Extension Points

### Adding More React Modules

1. Create new React app with Module Federation
2. Add entry to registry.json
3. Deploy new container
4. Enable in registry.json
5. **That's it** - shell automatically discovers and loads

### Adding Non-React Frameworks

Same pattern works for:
- Vue 3 with Module Federation
- Svelte with Module Federation
- Web Components
- jQuery-to-web-components wrappers

### Transitioning Modules

Old Angular module → New React module:
1. Update registry with new remoteEntry URL
2. Old module continues serving until switch-over
3. Users get new version automatically
4. No downtime required

---

## Deployment Topology

### Development (docker-compose)
```
localhost:4200    → Angular Shell
localhost:4201    → Demographics (Angular)
localhost:4207    → Procedures (React) ← NEW
localhost:5000    → Registry Service
localhost:5001    → Core API
localhost:5XXX    → BFF-Procedures ← NEW
localhost:27017   → MongoDB
```

### Production (Kubernetes)
```
Angular Shell (2 replicas)
├─ Pod 1
└─ Pod 2

Module Services (load balanced)
├─ Demographics (2)
├─ Vitals (3)
├─ Procedures (2) ← NEW
└─ etc

BFF Services (load balanced)
├─ BFF-Vitals (2)
├─ BFF-Labs (2)
├─ BFF-Procedures (2) ← NEW
└─ Core API (3)

Registry Service (1 - static config)
Database (managed)
```

---

## Monitoring & Observability

### What to Track

**Module Loading**
- Load time per module
- Success/failure rates
- remoteEntry.js availability

**Cross-Framework Communication**
- Patient context sync latency
- Event propagation time
- Storage access patterns

**API Performance**
- BFF response times per service
- Core API aggregate load
- Cache hit rates

**Error Tracking**
- Module load failures
- API errors by module
- Auth failures

### Metrics Example

```
procedures_module_load_duration_seconds: 1.2
procedures_bff_response_time_ms: 45 (p95)
procedures_api_errors_total: 2
procedures_patients_accessed: 1523
```

---

## Future Considerations

### Phase 9: Mobile App (React Native)
- Reuse React Procedures components
- Same BFF-Procedures backend
- Different shell (no Angular needed)

### Phase 10: Additional React Modules
- Imaging module (Viewer.js library)
- Notes module (Rich text editor)
- Analytics dashboard

### Phase 11: Micro-frontend Framework Migration
- Could migrate shell to React
- Angular modules continue working
- Gradual transition possible

---

## Troubleshooting Guide

### Module Fails to Load
```
Check:
1. registry.json has correct remoteEntry URL
2. Port 4207 container is running
3. remoteEntry.js is accessible at that URL
4. Browser console for CORS errors
5. Shared dependencies versions match
```

### Patient Context Not Syncing
```
Check:
1. localStorage.__PATIENT_CONTEXT__ is updating
2. 'patient-context-changed' event firing
3. React component listening to event
4. usePatientContext() hook implementation
```

### BFF Returns Wrong Data
```
Check:
1. Core API has correct data
2. BFF calling correct Core API endpoint
3. Patient ID extracted correctly
4. Auth header present in BFF request
5. Check BFF logs for errors
```

---

## Conclusion

The Procedures module implementation showcases a **production-ready, enterprise-grade micro-frontend architecture** that:

1. ✅ Scales to teams with different tech preferences
2. ✅ Maintains data consistency across frameworks
3. ✅ Optimizes performance per module
4. ✅ Enables independent deployment
5. ✅ Demonstrates architectural sophistication
6. ✅ Provides clear portfolio narrative

This is not "just another React app" - it's evidence of **systems thinking**, **architectural maturity**, and **production expertise**.
