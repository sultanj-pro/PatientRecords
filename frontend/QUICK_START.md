# Quick Start Guide - Shell App

## 🚀 Get Started in 3 Steps

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Start the Shell App
```bash
npm run start:shell
```
Access at: http://localhost:4200

### 3. Login
Use any username to login (demo mode):
- `physician`
- `nurse`
- `lab-tech`
- `radiology`
- `nutrition`
- `physical-therapy`

---

## 📂 Project Structure

```
frontend/
├── shell-app/           # Main host application (port 4200)
│   ├── src/app/
│   │   ├── components/  # UI components (login, dashboard, etc)
│   │   ├── core/        # Services, guards, interceptors
│   │   └── app.*        # Root component & config
├── modules/
│   ├── demographics/    # Patient info (port 4201) - coming soon
│   ├── vitals/          # Vital signs (port 4202) - coming soon
│   ├── labs/            # Lab results (port 4203) - coming soon
│   ├── medications/     # Medications (port 4204) - coming soon
│   └── visits/          # Visits & appointments (port 4205) - coming soon
├── shared/              # Shared library - coming soon
└── package.json         # Root monorepo config
```

---

## 🔐 Authentication

### Login Process
1. Navigate to `http://localhost:4200`
2. Enter any username
3. Token automatically stored in localStorage
4. Available in all HTTP requests

### Token Details
- **Key in localStorage:** `jwt_token`
- **Injected by:** `JwtInterceptor`
- **Automatically added to:** All API requests as `Authorization: Bearer {token}`

### Logout
- Click "Logout" button in top-right corner
- Token cleared from localStorage
- Redirects to login page

---

## 🔍 Patient Search

### How to Search
1. After login, use the search box
2. Type patient name or MRN
3. Results appear after 300ms (debounced)
4. Click a patient to view their records

### What You'll See
- Patient full name
- MRN (Medical Record Number)
- Date of birth
- Click to select

---

## 📊 Dashboard

### Patient Header
Shows selected patient:
- Full name
- MRN
- Date of birth

### Module Cards
Displays modules based on your role:
- **Physician:** All 5 modules
- **Nurse:** All 5 modules
- **Physical Therapy:** Demographics, Visits
- **Radiology:** Demographics, Labs, Visits
- **Nutrition:** Demographics, Vitals, Medications
- **Lab Tech:** Demographics, Labs

---

## 🛠️ Development Commands

```bash
# From frontend root directory

# Start shell app only
npm run start:shell

# Start all packages (shell + modules + shared)
npm run start:all

# Build all packages
npm run build

# Run tests
npm test

# Watch for changes
npm run watch

# Start specific workspace
npm --workspace=shell-app start
```

---

## 🎨 Styling

### Colors Used
- **Primary:** #667eea (Purple)
- **Secondary:** #764ba2 (Dark Purple)
- **Success:** #10b981 (Green)
- **Danger:** #ef4444 (Red)
- **Warning:** #f59e0b (Orange)

### Bootstrap 5
Included via CDN in `index.html`. Use Bootstrap classes:
```html
<div class="alert alert-danger">Error message</div>
<button class="btn btn-primary">Click me</button>
```

### Global Styles
`shell-app/src/styles.css` contains:
- Typography rules
- Button styles
- Form styling
- Grid utilities
- Responsive breakpoints

---

## 🔄 Component Overview

### LoginComponent
- **Path:** `/login`
- **File:** `components/login/`
- **Features:** Username input, demo user list, error handling
- **Logic:** Calls `AuthService.login()`, redirects to dashboard

### NavigationComponent
- **Always visible** when authenticated
- **Shows:** Username, role badge, logout button
- **File:** `components/navigation/`

### PatientSearchComponent
- **Always visible** when authenticated
- **Features:** Autocomplete search, debounced, click to select
- **File:** `components/patient-search/`

### DashboardComponent
- **Path:** `/dashboard/:patientId`
- **Shows:** Patient info + role-based module cards
- **File:** `components/dashboard/`

---

## 📱 Services

### AuthService
```typescript
// Login
authService.login('username').subscribe(response => {
  // Token automatically stored
});

// Logout
authService.logout();

// Check if authenticated
const isAuth = authService.isAuthenticatedSync();

// Get current user info
const token = authService.getToken();
const role = authService.getRole();
const username = authService.getUsername();
```

### PatientService
```typescript
// Search patients
patientService.searchPatients('john').subscribe(results => {
  // results: Patient[]
});

// Get specific patient
patientService.getPatientById(123).subscribe(patient => {
  // patient: Patient
});
```

### PatientContextService
```typescript
// Set selected patient
patientContextService.setSelectedPatient(patient);

// Subscribe to patient changes
patientContextService.getSelectedPatient().subscribe(patient => {
  // patient: Patient | null
});

// Get current patient synchronously
const patient = patientContextService.getCurrentPatient();

// Clear selection
patientContextService.clearPatient();
```

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests for shell-app only
npm test --workspace=shell-app

# Watch mode
npm test -- --watch

# Generate coverage report
npm test -- --code-coverage
```

### Writing Tests
```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
```

---

## 🐛 Debugging

### Check Authentication Status
```javascript
// In browser console
localStorage.getItem('jwt_token')
localStorage.getItem('user_role')
localStorage.getItem('username')
```

### View HTTP Requests
1. Open DevTools (F12)
2. Go to Network tab
3. Look for Authorization header in requests
4. Should see: `Authorization: Bearer {token}`

### Check Component State
```typescript
// In component class
console.log(this.authService.getUsername());
console.log(this.patientContextService.getCurrentPatient());
```

### View Errors
1. Check browser console (F12 → Console tab)
2. Look for red error messages
3. Check Network tab for failed requests
4. Verify backend is running on localhost:5001

---

## 🔗 API Endpoints

All calls include JWT token via `JwtInterceptor`.

```
POST   /auth/login
       Body: { username: string }
       Response: { accessToken, role, username }

GET    /api/patients?q={query}
       Response: Patient[]

GET    /api/patients/{id}
       Response: Patient
```

---

## 📋 Routes

| Path | Component | Auth Required | Description |
|------|-----------|:---:|---|
| `/` | Redirect | - | Redirects to login |
| `/login` | LoginComponent | No | Login form |
| `/dashboard/:patientId` | DashboardComponent | Yes | Patient records view |
| `**` | Not Found | - | Redirects to login |

---

## 🚨 Common Issues

### Port 4200 Already in Use
```bash
# Use different port
ng serve --port 4300
```

### Cannot Find Module Errors
```bash
# Reinstall dependencies
rm -rf node_modules
npm install
```

### Backend Not Responding
- Check backend is running: `http://localhost:5001`
- Check CORS is enabled in backend
- Look for errors in backend logs

### JWT Token Not Sent
- Verify `JwtInterceptor` is in `app.config.ts`
- Check token exists in localStorage
- Check HTTP request in Network tab

### Search Results Show 404
- Backend `/api/patients` endpoint must exist
- Check backend patients table has data
- Verify query parameter is correct

---

## 📚 Next Steps

1. **Setup Micro-Frontends** - Configure Webpack Module Federation
2. **Build Modules** - Create 5 micro-frontend modules
3. **Share Library** - Build shared component library
4. **Add Tests** - Unit and E2E tests
5. **Docker** - Containerize for deployment

---

## 📖 Documentation

- **SHELL_APP_SETUP.md** - Comprehensive setup guide
- **SHELL_APP_COMPLETE.md** - Complete implementation details
- **MICRO_FRONTEND_ARCHITECTURE.md** - Overall system design

---

## 💾 File Locations

| What | Where |
|------|-------|
| Auth Service | `shell-app/src/app/core/services/auth.service.ts` |
| Patient Service | `shell-app/src/app/core/services/patient.service.ts` |
| Patient Context | `shell-app/src/app/core/services/patient-context.service.ts` |
| JWT Interceptor | `shell-app/src/app/core/interceptors/jwt.interceptor.ts` |
| Auth Guard | `shell-app/src/app/core/guards/auth.guard.ts` |
| Login Component | `shell-app/src/app/components/login/` |
| Dashboard | `shell-app/src/app/components/dashboard/` |
| Navigation | `shell-app/src/app/components/navigation/` |
| Search | `shell-app/src/app/components/patient-search/` |
| Routes | `shell-app/src/app/app.routes.ts` |
| Config | `shell-app/src/app/app.config.ts` |
| Root Component | `shell-app/src/app/app.component.ts` |
| Global Styles | `shell-app/src/styles.css` |

---

## ✅ Status Checklist

- [x] Authentication working
- [x] Patient search functional
- [x] Dashboard displaying
- [x] Role-based visibility implemented
- [x] Responsive design complete
- [x] JWT token injection working
- [x] Route guards protecting routes
- [x] All services implemented
- [x] Error handling in place
- [ ] Micro-frontend modules (coming next)
- [ ] Module Federation setup (coming next)
- [ ] Docker deployment (coming later)

---

## 🎯 Quick Checklist

When starting development:

- [ ] Run `npm install` in frontend root
- [ ] Run `npm run start:shell` to start dev server
- [ ] Access http://localhost:4200
- [ ] Login with any username
- [ ] Search for a patient
- [ ] View dashboard with modules
- [ ] Check browser DevTools for errors
- [ ] Verify JWT token in localStorage

---

## 📞 Support

For issues or questions:

1. Check the **Troubleshooting** section above
2. Review **SHELL_APP_SETUP.md** for detailed docs
3. Check browser console for errors
4. Verify backend is running
5. Check network requests in DevTools

---

**Last Updated:** January 22, 2026  
**Status:** Ready for Development ✓
