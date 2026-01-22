# Shell App Setup Guide

## Overview

The Shell App (Host Application) is the main orchestrator for the Patient Records micro-frontend system. It runs on **port 4200** and provides:

- **Authentication**: Login page with JWT token management
- **Navigation**: User info and logout functionality
- **Patient Search**: Find and select patients
- **Dashboard**: Role-based display of micro-frontend modules
- **Module Federation**: Hosts and dynamically loads 5 micro-frontend modules

## Architecture

### Directory Structure

```
shell-app/
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   ├── dashboard/           # Patient record dashboard
│   │   │   ├── login/               # Login form
│   │   │   ├── navigation/          # Top navbar
│   │   │   └── patient-search/      # Patient search interface
│   │   ├── core/
│   │   │   ├── guards/
│   │   │   │   └── auth.guard.ts   # Route protection
│   │   │   ├── interceptors/
│   │   │   │   └── jwt.interceptor.ts  # JWT injection
│   │   │   └── services/
│   │   │       ├── auth.service.ts      # Authentication
│   │   │       ├── patient.service.ts   # Patient API
│   │   │       └── patient-context.service.ts  # Shared state
│   │   ├── app.component.ts         # Root component
│   │   ├── app.component.html
│   │   ├── app.component.css
│   │   ├── app.config.ts            # App configuration
│   │   └── app.routes.ts            # Routing
│   ├── main.ts                      # Bootstrap
│   ├── index.html                   # Entry point
│   ├── styles.css                   # Global styles
│   └── assets/
├── angular.json
├── tsconfig.json
└── package.json
```

### Core Services

#### 1. **AuthService** (`core/services/auth.service.ts`)

Handles authentication and token management.

**Methods:**
- `login(username: string): Observable<AuthResponse>` - Authenticate user
- `logout(): void` - Clear session
- `getToken(): string | null` - Get JWT token
- `getRole(): string | null` - Get user role
- `getUsername(): string | null` - Get username
- `isAuthenticatedSync(): boolean` - Check auth status synchronously
- `isAuthenticated(): Observable<boolean>` - Observable auth status
- `getCurrentRole(): Observable<string | null>` - Observable role stream
- `getCurrentUsername(): Observable<string | null>` - Observable username stream

**Storage:**
- `jwt_token` - Bearer token for API calls
- `user_role` - User's role (physician, nurse, etc.)
- `username` - Display name

**API Endpoint:**
```
POST http://localhost:5001/auth/login
Body: { username: string }
Response: { accessToken: string, role: string, username: string }
```

#### 2. **PatientService** (`core/services/patient.service.ts`)

Handles patient API communication.

**Methods:**
- `searchPatients(query: string): Observable<Patient[]>` - Search patients
- `getPatientById(id: number): Observable<Patient>` - Get patient details

**API Endpoints:**
```
GET http://localhost:5001/api/patients?q={query}
GET http://localhost:5001/api/patients/{id}
```

#### 3. **PatientContextService** (`core/services/patient-context.service.ts`)

Shared state across all modules.

**Methods:**
- `setSelectedPatient(patient: Patient): void` - Set active patient
- `getSelectedPatient(): Observable<Patient>` - Observable patient stream
- `getCurrentPatient(): Patient | null` - Sync access
- `clearPatient(): void` - Reset selection

### Core Components

#### 1. **LoginComponent** (`components/login/`)

Authentication form. Features:
- Username input
- Error handling
- Demo user list
- Automatic redirect if already authenticated

**Route:** `/login`

#### 2. **DashboardComponent** (`components/dashboard/`)

Patient record display with role-based module visibility.

**Features:**
- Patient information header (name, MRN, DOB)
- Module grid based on user role
- Micro-frontend module slots

**Route:** `/dashboard/:patientId`

#### 3. **NavigationComponent** (`components/navigation/`)

Top navigation bar with:
- Application title
- Current username
- Current role (color-coded by role)
- Logout button

#### 4. **PatientSearchComponent** (`components/patient-search/`)

Patient search interface with:
- Autocomplete search input (300ms debounce)
- Result list display (name, MRN, DOB)
- Patient selection

**Usage:**
- Type patient name or MRN
- Select from results
- Redirects to dashboard with selected patient

### Guards & Interceptors

#### **AuthGuard** (`core/guards/auth.guard.ts`)

Protects dashboard routes from unauthenticated access.

#### **JwtInterceptor** (`core/interceptors/jwt.interceptor.ts`)

Automatically injects JWT token into all HTTP requests:
```
Authorization: Bearer {token}
```

## Routing

```
/                     → redirect to /login
/login                → LoginComponent (public)
/dashboard/:patientId → DashboardComponent (protected)
**                    → redirect to /login
```

## User Roles & Module Visibility

| Role | Demographics | Vitals | Labs | Medications | Visits |
|------|:---:|:---:|:---:|:---:|:---:|
| Physician | ✓ | ✓ | ✓ | ✓ | ✓ |
| Nurse | ✓ | ✓ | ✓ | ✓ | ✓ |
| Physical Therapy | ✓ | - | - | - | ✓ |
| Radiology | ✓ | - | ✓ | - | ✓ |
| Nutrition | ✓ | ✓ | - | ✓ | - |
| Lab Tech | ✓ | - | ✓ | - | - |

## Development Setup

### Prerequisites
- Node.js 18+ and npm 9+
- Angular CLI 17

### Installation

```bash
# From frontend root
npm install

# Install shell-app dependencies (if not installed)
npm install --workspace=shell-app
```

### Running

```bash
# Start shell app only
npm run start:shell

# OR from shell-app directory
cd shell-app
npm start

# Start all packages (includes backend)
npm run start:all
```

**Access:** http://localhost:4200

### Building

```bash
# Build shell app
npm run build:shell

# Build all packages
npm run build
```

### Testing

```bash
# Run tests
npm test

# Run tests for shell-app
npm test --workspace=shell-app
```

## Configuration

### App Configuration (`app.config.ts`)

```typescript
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: JwtInterceptor,
      multi: true
    },
    importProvidersFrom(BrowserAnimationsModule)
  ]
};
```

### Routes (`app.routes.ts`)

```typescript
export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  {
    path: 'dashboard/:patientId',
    component: DashboardComponent,
    canActivate: [AuthGuard]
  },
  { path: '**', redirectTo: '/login' }
];
```

## Key Design Patterns

### 1. **Standalone Components**
All components use Angular's standalone pattern:
```typescript
@Component({
  selector: 'app-component-name',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './component-name.component.html',
  styleUrls: ['./component-name.component.css']
})
```

### 2. **Reactive State with RxJS**
Services use BehaviorSubjects for reactive updates:
```typescript
private isAuthenticated$ = new BehaviorSubject<boolean>(false);
isAuthenticated(): Observable<boolean> {
  return this.isAuthenticated$.asObservable();
}
```

### 3. **HTTP Interception**
JWT token automatically injected:
```typescript
intercept(request, next) {
  const token = this.authService.getToken();
  if (token) {
    request = request.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }
  return next.handle(request);
}
```

### 4. **Shared State Management**
PatientContextService provides single source of truth:
```typescript
// In any component
this.patientContext.getSelectedPatient().subscribe(patient => {
  this.patient = patient;
});
```

## Integration with Micro-Frontends

### Module Federation Setup

Each micro-frontend module will be configured with Webpack Module Federation:

```typescript
// Module Federation Remote Configuration
@NgModule({
  declarations: [/* module components */],
  exports: [/* exportable components */],
  imports: [/* module dependencies */]
})
export class ModuleName { }
```

### Loading Remote Modules

Modules are dynamically loaded based on user role and configuration.

## Authentication Flow

```
1. User visits http://localhost:4200
   ↓
2. AppComponent checks isAuthenticatedSync()
   ↓
3. No token → Redirect to /login
   ↓
4. LoginComponent displayed
   ↓
5. User enters username, clicks Login
   ↓
6. AuthService calls POST /auth/login
   ↓
7. Backend returns { accessToken, role, username }
   ↓
8. AuthService stores in localStorage
   ↓
9. AuthService updates BehaviorSubjects
   ↓
10. Router redirects to /
    ↓
11. AppComponent detects isAuthenticatedSync() = true
    ↓
12. Displays Navigation + PatientSearch + router-outlet
    ↓
13. User searches and selects patient
    ↓
14. PatientContextService updates selectedPatient$
    ↓
15. Router navigates to /dashboard/{patientId}
    ↓
16. DashboardComponent loads with patient data and role-based modules
```

## Styling

### Global Styles
Bootstrap 5 included via CDN in `index.html`:
```html
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
```

### Component Styling
Each component has its own CSS file with:
- Modern color scheme (purple/blue gradient)
- Responsive design
- Consistent spacing and typography
- Hover effects and transitions

## Common Tasks

### Add New Component

```bash
cd shell-app
ng generate component components/new-component --skip-tests
```

### Add New Service

```bash
cd shell-app
ng generate service core/services/new-service
```

### Debug HTTP Calls

Interceptor logs all requests with JWT token. Enable browser DevTools:
```
Network tab → Requests → Headers → Authorization
```

### Check Authentication Status

```typescript
// In console
localStorage.getItem('jwt_token')
localStorage.getItem('user_role')
localStorage.getItem('username')
```

## Troubleshooting

### Cannot find module errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules
npm install
```

### Port 4200 already in use
```bash
# Use different port
ng serve --port 4300
```

### CORS errors from backend
Verify backend CORS configuration allows `http://localhost:4200`

### JWT token not being sent
Check JwtInterceptor is properly configured in `app.config.ts`

### Patient search returns 404
Verify backend is running on `http://localhost:5001`
Check backend `/api/patients` endpoint

## Next Steps

1. **Setup Webpack Module Federation** - Configure host and remote modules
2. **Build Micro-Frontend Modules** - Demographics, Vitals, Labs, Medications, Visits
3. **Share Library** - Common utilities, models, interceptors
4. **Backend Integration** - CORS, RBAC, config endpoints
5. **Testing** - Unit and E2E tests
6. **Docker Integration** - Multi-container deployment

---

**Last Updated:** January 22, 2026
**Shell App Status:** Development Ready ✓
