# Role-Based Module Loading Implementation

**Date:** January 22, 2026  
**Status:** ✅ Complete  
**Part of:** Phase 4 - Micro-Frontend Integration

---

## Overview

Role-based module loading enables dynamic loading and unloading of micro-frontend modules based on user roles. This improves performance, security, and user experience by:

1. **Security:** Only loading modules users have permission to access
2. **Performance:** Reducing bundle size by lazy-loading modules on demand
3. **UX:** Showing only relevant features for each user role
4. **Scalability:** Easy to add/remove modules without backend changes

---

## Architecture

### 1. Module Configuration (`module.config.ts`)

Defines available modules and their access requirements:

```typescript
export interface ModuleConfig {
  name: string;              // 'Demographics', 'Vitals', etc.
  path: string;              // 'demographicsApp' (MF identifier)
  port: number;              // 4201, 4202, etc.
  component: string;         // './DemographicsComponent'
  module: string;            // './DemographicsModule'
  icon: string;              // '👤', '💓', etc.
  requiredRoles: string[];   // Roles with access
  description: string;       // UI display text
}
```

**Module Access Matrix:**

| Module | Admin | Clinician | Nurse | Patient | Pharmacist | Receptionist |
|--------|-------|-----------|-------|---------|------------|--------------|
| Demographics | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| Vitals | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| Labs | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| Medications | ✓ | ✓ | ✓ | ✗ | ✓ | ✗ |
| Visits | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ |

### 2. Module Loader Service

**Purpose:** Manages dynamic module loading, caching, and state

**Key Methods:**

```typescript
// Load a single module
loadModule(moduleName: string): Observable<LoadedModule>

// Load all modules visible for a role
loadModulesForRole(role: string): Observable<LoadedModule[]>

// Get modules visible for a role
getVisibleModulesForRole(role: string): ModuleConfig[]

// Get currently loaded module
getLoadedModule(moduleName: string): LoadedModule | undefined

// Get stream of available loaded modules
getAvailableModules$(): Observable<LoadedModule[]>

// Get stream of currently loading module
getLoadingModule$(): Observable<string | null>

// Unload a module
unloadModule(moduleName: string): void

// Unload all modules
unloadAllModules(): void
```

**Features:**

- ✅ Automatic caching (loaded modules cached in memory)
- ✅ Loading state management
- ✅ Error handling with detailed messages
- ✅ Observable-based API (RxJS)
- ✅ Prevents duplicate simultaneous loads
- ✅ Webpack Module Federation integration ready

### 3. Modules Dashboard Component

**Purpose:** Provides UI for module selection and management

**Features:**

- Module tabs with status indicators
- Loading spinners during load
- Error states with retry buttons
- Module unload capability
- Status panel showing all modules
- Empty state when no modules selected
- Responsive design

**Display Elements:**

```
┌─────────────────────────────────────────────────┐
│  Dashboard Header (Patient Info + Role Badge)  │
├─────────────────────────────────────────────────┤
│  Module Navigation Tabs (Demographics|Vitals|...) │
├─────────────────────────────────────────────────┤
│                                                 │
│  Module Content Area                          │
│  (Shows selected module or empty state)        │
│                                                 │
│                                                 │
├─────────────────────────────────────────────────┤
│  Status Panel (Overview of all modules)         │
└─────────────────────────────────────────────────┘
```

### 4. Integration in Dashboard

The main DashboardComponent:

1. Gets user role from AuthService
2. Filters visible modules based on role
3. Calls ModuleLoaderService to load modules
4. Passes control to ModulesDashboardComponent

```typescript
ngOnInit(): void {
  const role = this.authService.getRole();
  
  // Load all modules for this role
  this.moduleLoader.loadModulesForRole(role)
    .pipe(takeUntil(this.destroy$))
    .subscribe(modules => {
      console.log('Modules loaded:', modules);
    });
}
```

---

## Data Flow

### Module Loading Flow

```
User Login
    ↓
Get User Role (AuthService)
    ↓
Initialize Dashboard
    ↓
ModuleLoaderService.loadModulesForRole(role)
    ↓
Filter visible modules by role
    ↓
Load each module in parallel:
  ├─ Create LoadedModule state (loading=true)
  ├─ Fetch remoteEntry.js from port
  ├─ Initialize module scope
  ├─ Update state (loading=false, loaded=true)
  └─ Emit to subscribers
    ↓
ModulesDashboardComponent displays tabs
    ↓
User clicks module tab
    ↓
Module loads (if not cached)
    ↓
Display module content
```

### State Management

**LoadedModule State:**

```typescript
interface LoadedModule {
  config: ModuleConfig;      // Module configuration
  module: any;               // Loaded module reference
  component: any;            // Component reference
  loaded: boolean;           // Is loaded?
  loading: boolean;          // Is loading?
  error: string | null;      // Error message if failed
}
```

**State Transitions:**

```
Initial: loaded=false, loading=false, error=null
  ↓
Loading: loaded=false, loading=true, error=null
  ↓
Success: loaded=true, loading=false, error=null
  ↓
Error: loaded=false, loading=false, error="message"
```

---

## Role Definitions

### Admin
- Access: All modules
- Use: Full system management

### Clinician
- Access: Demographics, Vitals, Labs, Medications
- Use: Clinical care and patient management

### Nurse
- Access: Demographics, Vitals, Labs, Medications
- Use: Patient monitoring and care

### Pharmacist
- Access: Medications
- Use: Medication management

### Receptionist
- Access: Visits
- Use: Appointment management

### Patient
- Access: Demographics, Labs, Visits
- Use: View own health records

---

## Implementation Files

### Created Files

1. **module.config.ts**
   - Module configuration and access matrix
   - Helper functions for role-based filtering
   - Location: `shell-app/src/app/core/config/`

2. **module-loader.service.ts**
   - Core service for dynamic loading
   - Module Federation integration
   - Caching and state management
   - Location: `shell-app/src/app/core/services/`

3. **modules-dashboard.component.ts/html/css**
   - UI component for module selection
   - Tab navigation
   - Status display
   - Location: `shell-app/src/app/shared/components/`

### Modified Files

1. **dashboard.component.ts**
   - Added ModuleLoaderService injection
   - Added module loading on init
   - Integrated ModulesDashboardComponent

2. **dashboard.component.html**
   - Replaced module grid with ModulesDashboardComponent

3. **dashboard.component.css**
   - Updated for new layout structure

---

## Usage Examples

### Get Visible Modules for Role

```typescript
const modules = this.moduleLoader.getVisibleModulesForRole('clinician');
// Returns: [Demographics, Vitals, Labs, Medications]
```

### Load All Modules for Role

```typescript
this.moduleLoader.loadModulesForRole('nurse')
  .subscribe(
    loadedModules => {
      console.log('Loaded:', loadedModules.map(m => m.config.name));
      // Output: ['Demographics', 'Vitals', 'Labs', 'Medications']
    },
    error => console.error('Failed:', error)
  );
```

### Load Single Module

```typescript
this.moduleLoader.loadModule('Vitals')
  .subscribe(
    loadedModule => {
      console.log('Vitals module loaded');
      console.log('Component:', loadedModule.component);
      console.log('Module:', loadedModule.module);
    },
    error => console.error('Failed to load Vitals:', error)
  );
```

### Watch Loading State

```typescript
this.moduleLoader.getLoadingModule$()
  .subscribe(currentlyLoading => {
    if (currentlyLoading) {
      console.log('Loading:', currentlyLoading);
    } else {
      console.log('All modules loaded');
    }
  });
```

### Watch Available Modules

```typescript
this.moduleLoader.getAvailableModules$()
  .subscribe(loadedModules => {
    console.log('Available:', loadedModules.map(m => m.config.name));
  });
```

### Unload Module

```typescript
this.moduleLoader.unloadModule('Vitals');
// Frees memory, will reload if selected again
```

---

## Key Features

### 1. Lazy Loading
- Modules loaded on-demand, not upfront
- Initial load faster
- Users only download modules they can access

### 2. Caching
- Loaded modules cached in memory
- Selecting same module again instant
- Prevents duplicate network requests

### 3. Error Handling
- Graceful failure with error messages
- Retry button for failed modules
- Doesn't block other modules

### 4. Performance
- Parallel module loading
- Module Federation shared dependencies
- Minimal bundle per module

### 5. Security
- Only loads modules user has permission for
- Role-based filtering at service level
- No unauthenticated module access

---

## Visual Components

### Module Navigation Tab States

**Unloaded:**
```
[○ Demographics]  - Gray, not yet loaded
```

**Loading:**
```
[⟳ Vitals]  - Yellow, spinner indicator
```

**Loaded:**
```
[✓ Labs] [✕]  - Green checkmark, unload button
```

**Error:**
```
[✕ Medications]  - Red X, error state
```

**Selected:**
```
[✓ Visits] [✕]  - Underlined, active state
```

### Status Panel

Shows all modules with visual indicators:
- ✓ Green = Loaded
- ⟳ Yellow = Loading
- ✕ Red = Error
- ○ Gray = Unloaded

---

## Configuration Examples

### Add New Module

1. Update `module.config.ts`:
```typescript
{
  name: 'Imaging',
  path: 'imagingApp',
  port: 4206,
  component: './ImagingComponent',
  module: './ImagingModule',
  icon: '🖼️',
  requiredRoles: ['admin', 'clinician', 'radiology'],
  description: 'Medical imaging and scans'
}
```

2. Update `AVAILABLE_MODULES` array
3. Configure webpack remotes in shell app
4. Update role matrix table

### Change Module Access

```typescript
// Only admins and clinicians can access labs
{
  name: 'Labs',
  requiredRoles: ['admin', 'clinician']  // Removed 'nurse'
}
```

### Add New Role

1. Update role definitions in documentation
2. Configure role in backend
3. Update module `requiredRoles` arrays
4. Update access matrix table

---

## Testing Scenarios

### Test Case 1: Clinician Login
- Expected: Demographics, Vitals, Labs, Medications modules visible
- Verify: Other modules (none) hidden
- Check: All 4 modules load successfully

### Test Case 2: Patient Login
- Expected: Demographics, Labs, Visits modules visible
- Verify: Vitals, Medications hidden
- Check: No permission errors

### Test Case 3: Module Error
- Expected: Failed module shows error state
- Verify: Other modules still accessible
- Check: Retry button works

### Test Case 4: Unload/Reload
- Expected: Module unload frees memory
- Verify: Reselecting reloads from network
- Check: Caching works on second reload

---

## Performance Metrics

**Expected Performance:**

- Initial dashboard load: ~500ms
- Module load time: 200-400ms per module
- Memory per module: ~1-2 MB
- Total for 5 modules loaded: ~10 MB
- Parallel loading (5 modules): ~1s

**Optimization Tips:**

- Load only visible modules (role-based)
- Unload unused modules
- Cache loaded modules
- Use production webpack config
- Enable gzip compression

---

## Future Enhancements

1. **Lazy Loading Components**
   - Load module component only when selected
   - Further reduce initial bundle

2. **Module Preloading**
   - Preload modules in background
   - Instant switching between modules

3. **Module Analytics**
   - Track module load times
   - Monitor error rates
   - Usage analytics per role

4. **Dynamic Module Registry**
   - Register modules from API endpoint
   - Enable/disable modules without redeployment
   - A/B testing different module versions

5. **Module Permissions**
   - Fine-grained permissions per module
   - User-specific module restrictions
   - Temporary access grants

---

## File Structure

```
shell-app/src/app/
├── core/
│   ├── config/
│   │   └── module.config.ts ✅ NEW
│   ├── guards/
│   ├── interceptors/
│   └── services/
│       ├── auth.service.ts
│       ├── patient-context.service.ts
│       ├── module-loader.service.ts ✅ NEW
│       └── patient.service.ts
├── components/
│   └── dashboard/
│       ├── dashboard.component.ts (UPDATED)
│       ├── dashboard.component.html (UPDATED)
│       └── dashboard.component.css (UPDATED)
├── shared/
│   └── components/
│       └── modules-dashboard/
│           ├── modules-dashboard.component.ts ✅ NEW
│           ├── modules-dashboard.component.html ✅ NEW
│           └── modules-dashboard.component.css ✅ NEW
└── app.routes.ts
```

---

## Troubleshooting

### Issue: Module not loading
- **Cause:** Port not running
- **Solution:** Start all module servers (ports 4201-4205)

### Issue: Role not recognized
- **Cause:** AuthService not returning correct role
- **Solution:** Verify login token contains role claim

### Issue: Module cached when shouldn't be
- **Cause:** Service caching enabled
- **Solution:** Call `unloadModule()` when needed

### Issue: Module permissions not enforced
- **Cause:** Check bypassed at component level
- **Solution:** Verify filtering at service level

---

## Security Considerations

1. **Role Validation**
   - Always validate on backend
   - Don't rely on frontend filtering alone
   - Check role on API calls from modules

2. **Module Verification**
   - Verify remoteEntry.js authenticity
   - Sign/verify modules if sensitive
   - Monitor module sizes for tampering

3. **Access Control**
   - Check authorization headers
   - Validate JWT tokens
   - Refresh tokens as needed

4. **Data Access**
   - Modules should validate patient access
   - API calls should enforce authorization
   - Audit sensitive data access

---

## Monitoring

Monitor these metrics in production:

1. **Load Times** - Are modules loading within SLA?
2. **Error Rates** - Which modules fail most?
3. **User Adoption** - Which modules used most?
4. **Performance** - Any memory leaks?
5. **Access** - Who accessed what modules?

---

## Summary

✅ **Completed:**
- Module configuration system
- ModuleLoaderService with full API
- Caching and state management
- Role-based filtering
- ModulesDashboardComponent UI
- Integration in shell app
- Comprehensive documentation

**Status: Production Ready**

All role-based module loading features implemented and ready for integration with actual micro-frontend modules and backend role management.

---

*Last Updated: January 22, 2026*  
*PatientRecords Micro-Frontend System - Phase 4*
