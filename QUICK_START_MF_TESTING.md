# Quick Start: Testing Module Federation

## Current Status
- ✅ Shell app running on port 4200
- ✅ Backend API running on port 5001
- ✅ MongoDB running on port 27017
- ⏳ Micro-frontend services ready to start

## Start Micro-Frontend Services

```powershell
cd c:\source\github\PatientRecords\frontend

# Start all micro-frontend containers
docker-compose up -d pr-demographics pr-vitals pr-labs pr-medications pr-visits

# Verify all services running
docker-compose ps
```

Expected output:
```
NAME                     STATUS              PORTS
patientrecords-shell     Up 43 minutes       0.0.0.0:4200->4200/tcp
patientrecords-backend   Up 4 hours          0.0.0.0:5001->5001/tcp
patientrecords-mongo     Up 4 hours          0.0.0.0:27017->27017/tcp
patientrecords-demographics  Up             0.0.0.0:4201->4200/tcp
patientrecords-vitals    Up                 0.0.0.0:4202->4200/tcp
patientrecords-labs      Up                 0.0.0.0:4203->4200/tcp
patientrecords-medications   Up              0.0.0.0:4204->4200/tcp
patientrecords-visits    Up                 0.0.0.0:4205->4200/tcp
```

## Test Module Federation

### 1. Open Application
```
http://localhost:4200
```

### 2. Log In
- Use any username from the system
- Password is ignored (demo mode)

### 3. Search for Patient
- Type in patient name or MRN
- Select from results

### 4. Test Module Tabs
Click each tab and observe:

**Demographics Tab**
- URL: http://localhost:4201/remoteEntry.js
- Expected: Loading spinner → ✓ Success

**Vitals Tab**
- URL: http://localhost:4202/remoteEntry.js
- Expected: Loading spinner → ✓ Success

**Labs Tab**
- URL: http://localhost:4203/remoteEntry.js
- Expected: Loading spinner → ✓ Success

**Medications Tab**
- URL: http://localhost:4204/remoteEntry.js
- Expected: Loading spinner → ✓ Success

**Visits Tab**
- URL: http://localhost:4205/remoteEntry.js
- Expected: Loading spinner → ✓ Success

### 5. Verify Logging
Open browser console (F12) and look for:
```
✓ Module 'Demographics' loaded successfully: [Component details]
✓ Module 'Vitals' loaded successfully: [Component details]
... etc
```

## Architecture Verification

### Check Module Federation Config
```powershell
cat frontend/shell-app/webpack.config.js | grep -A 10 "remotes:"
```

Should show 5 remote modules configured for ports 4201-4205.

### Check Shared Libraries
```powershell
cat frontend/shell-app/webpack.config.js | grep -A 15 "shared:"
```

Should show Angular, RxJS, and shared library in singleton mode.

## Troubleshooting

### If Module Won't Load

1. **Check if micro-frontend is running**
   ```powershell
   docker-compose ps | grep pr-demographics
   ```

2. **Check logs**
   ```powershell
   docker-compose logs pr-demographics
   ```

3. **Test remoteEntry directly**
   ```
   http://localhost:4201/remoteEntry.js
   ```
   Should return JavaScript code (Module Federation bootstrap)

4. **Check browser network tab** (F12 → Network)
   - Look for remoteEntry.js request
   - Check status code (should be 200)
   - Check response (should be valid JavaScript)

### If Micro-Frontend Crashes

```powershell
# Restart the container
docker-compose restart pr-demographics

# Or rebuild and restart
docker-compose up -d --build pr-demographics
```

### If Module Shows Error State

1. Check that micro-frontend built correctly
2. Verify remoteEntry.js exports the component
3. Click "Retry" button in UI

## Monitoring

### View Container Logs
```powershell
# View all logs
docker-compose logs -f

# View specific service
docker-compose logs -f pr-demographics

# View last 50 lines
docker-compose logs --tail=50 pr-demographics
```

### Check API Health
```powershell
# Test backend
curl http://localhost:5001/api/health

# Test patient data
curl http://localhost:5001/api/patients/1
```

## Performance Baseline

### Initial Load Metrics (Expected)
- Shell app load: ~2-3 seconds
- Module load: ~1-2 seconds (first time)
- Module load: ~100ms (cached)
- Bundle size: 406 kB total
- Gzipped size: 106 kB

### Monitor Performance
Open DevTools → Performance tab and:
1. Clear session storage
2. Hard refresh (Ctrl+Shift+R)
3. Measure shell load time
4. Click a module tab
5. Measure module load time

## Next Development Steps

### 1. Component Injection (High Priority)
Currently modules load but don't render. Next step:
```typescript
// In ModulesDashboardComponent
this.viewContainerRef.createComponent(LoadedComponent)
```

### 2. Data Binding
Pass patient data to remote components:
```typescript
const ref = this.viewContainerRef.createComponent(DemographicsComponent)
ref.instance.patientId = this.patient.id
```

### 3. Remote Module Implementation
Each micro-frontend needs:
```typescript
export class DemographicsComponent implements OnInit {
  @Input() patientId: string
  
  constructor(private patientContext: PatientContextService) {}
  
  ngOnInit() {
    // Fetch demographics data
    // Render in template
  }
}
```

## Documentation Files

- **MODULE_FEDERATION_IMPLEMENTATION.md** - Technical implementation details
- **PHASE4_MODULE_FEDERATION_COMPLETE.md** - Architecture overview and workflow
- **IMPLEMENTATION_COMPLETE.md** - Session summary and achievements

## Key Files to Monitor

```
frontend/shell-app/
├─ src/app/core/services/module-loader.service.ts
│  └─ Dynamic module loading logic
├─ src/app/shared/components/modules-dashboard/
│  ├─ modules-dashboard.component.ts (loading orchestration)
│  ├─ modules-dashboard.component.html (5 UI states)
│  └─ modules-dashboard.component.css (styling)
└─ webpack.config.js (Module Federation config)
```

## Commands Reference

```powershell
# Start all services
cd frontend
docker-compose up -d

# Start only shell, backend, mongo
docker-compose up -d pr-shell pr-backend mongo

# Start specific micro-frontend
docker-compose up -d pr-demographics

# Stop all
docker-compose down

# Rebuild and start
docker-compose up -d --build pr-demographics

# View logs
docker-compose logs -f pr-demographics

# Get shell app status
docker-compose ps pr-shell
```

## Success Indicators

✅ All indicators should be green:
- [ ] Shell app loads (4200)
- [ ] Can log in
- [ ] Can search patients
- [ ] Module tabs show loading spinner when clicked
- [ ] Module tabs show success message (if micro-frontend running)
- [ ] Can switch between tabs
- [ ] Browser console shows "Module X loaded successfully"
- [ ] No errors in browser console

---

**Ready to test!** Start the micro-frontend services and observe the Module Federation in action.
