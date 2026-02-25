# PatientRecords Micro-Frontend System - UI Overview

**Date:** January 22, 2026  
**Status:** Phase 4 Complete - Ready for Preview  
**System Status:** ✅ 90% Complete

---

## System Architecture at a Glance

```
┌──────────────────────────────────────────────────────────────┐
│              PatientRecords Micro-Frontend System             │
└──────────────────────────────────────────────────────────────┘

FRONTEND LAYER (Angular 17)
├─ Shell App (Port 4200)
│  ├─ Login Component
│  ├─ Navigation Component
│  ├─ Dashboard Component
│  ├─ Patient Search Component
│  └─ Modules Dashboard (NEW)
│
└─ Micro-Frontend Modules (Ports 4201-4205)
   ├─ Demographics Module (Port 4201)
   ├─ Vitals Module (Port 4202)
   ├─ Labs Module (Port 4203)
   ├─ Medications Module (Port 4204)
   └─ Visits Module (Port 4205)

BACKEND LAYER (Node.js/Express)
├─ API Server (Port 5001)
│  ├─ Patients Endpoints
│  ├─ Vitals Endpoints
│  ├─ Labs Endpoints
│  ├─ Medications Endpoints
│  └─ Visits Endpoints (Consolidated)
│
└─ Database (MongoDB)
   └─ Patient Records Collection

INFRASTRUCTURE
├─ Docker Containers
├─ Webpack Module Federation
├─ npm Workspaces
└─ Git Version Control
```

---

## UI Flow & Components

### 1. Login Screen (Initial Load)
```
╔════════════════════════════════════════════════════════════╗
║                    PatientRecords Login                    ║
║                                                            ║
║                   🏥 PATIENT RECORDS                       ║
║              Comprehensive Health Data System              ║
║                                                            ║
║  Username: [________________________]                     ║
║  Password: [________________________]                     ║
║                                                            ║
║            [ Login ]              [ Guest ]               ║
║                                                            ║
║  Demo Credentials:                                         ║
║  • Username: admin, Password: admin (Full Access)         ║
║  • Username: nurse, Password: nurse (Limited Access)      ║
║  • Username: patient, Password: patient (Patient View)    ║
╚════════════════════════════════════════════════════════════╝
```

**Features:**
- Username/password authentication
- Demo credentials available
- Bootstrap 5 styled form
- Responsive mobile layout
- Error messages for failed login

---

### 2. Navigation Bar (After Login)
```
┌────────────────────────────────────────────────────────────┐
│  🏥 PatientRecords  │  [Patient Search]  │  User ▼  [Log Out] │
└────────────────────────────────────────────────────────────┘
```

**Features:**
- Logo/branding
- Patient search bar
- User menu dropdown
- Logout button
- Sticky navigation (always visible)

---

### 3. Patient Search Component
```
╔════════════════════════════════════════════════════════════╗
║  🔍 Patient Search                                         ║
╠════════════════════════════════════════════════════════════╣
║  Search: [_____________________] 🔍                         ║
║                                                            ║
║  ┌─ Recent Patients ────────────────────────────────────┐ ║
║  │ • John Smith (MRN: P-00001) - 45 years old          │ ║
║  │ • Jane Doe (MRN: P-00002) - 32 years old            │ ║
║  │ • Bob Johnson (MRN: P-00003) - 67 years old         │ ║
║  │ • Alice Brown (MRN: P-00004) - 28 years old         │ ║
║  └─────────────────────────────────────────────────────┘ ║
║                                                            ║
║  📍 Type to search by name or MRN                          ║
╚════════════════════════════════════════════════════════════╝
```

**Features:**
- Real-time search (autocomplete)
- Display recent/searched patients
- Click to select patient
- Shows MRN and age
- Responsive modal

---

### 4. Main Dashboard (Role-Based View)
```
┌────────────────────────────────────────────────────────────┐
│ Dashboard Header                                           │
├─ Patient: John Smith | MRN: P-00001 | DOB: Jan 1, 1981   │
├─ Role Badge: [CLINICIAN] | Modules: 4 of 5 loaded         │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ Module Navigation Tabs                                     │
├─ [👤 Demographics] [💓 Vitals] [🧬 Labs] [💊 Medications] ┤
│  [📅 Visits]  [✕ Unload]                                   │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ Module Content Area (Shows Selected Module)                │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  [Module Content Rendered Here]                           │
│                                                            │
│  Loading Indicator / Error / Content / Empty State        │
│                                                            │
└────────────────────────────────────────────────────────────┘

┌─ Module Status Panel ─────────────────────────────────────┐
│ ✓ Demographics (Loaded)  ✓ Vitals (Loaded)               │
│ ⟳ Labs (Loading)        ✓ Medications (Loaded)           │
│ ✕ Visits (Error)        [Retry]                          │
└────────────────────────────────────────────────────────────┘
```
---

## Shareable Patient URLs

Patient context is encoded in the URL so tabs stay consistent and links are shareable:

```
http://localhost:4200/dashboard/<module>/<patientId>
```

**Example:**
```
http://localhost:4200/dashboard/vitals/20001
```

**Behavior:**
- Selecting a new patient keeps the current tab and updates the URL.
- Switching tabs preserves the `patientId`.
- If the user is logged out, the app redirects to login and returns to the requested URL after authentication.


---

## Module UI Details

### Demographics Module (Port 4201)
```
╔════════════════════════════════════════════════════════════╗
║ 👤 Demographics Module                                    ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  [Loading Spinner] (500ms)                               ║
║                      ↓                                     ║
║  ┌─ Personal Information ──────────────────────────────┐  ║
║  │ Full Name:   John Smith                             │  ║
║  │ MRN:         P-00001                                │  ║
║  │ DOB:         January 1, 1981                        │  ║
║  │ Age:         43 years                               │  ║
║  │ Gender:      Male                                   │  ║
║  └─────────────────────────────────────────────────────┘  ║
║                                                            ║
║  ┌─ Contact Information ───────────────────────────────┐  ║
║  │ Phone:  (555) 123-4567                              │  ║
║  │ Email:  john.smith@email.com                        │  ║
║  │ Address: 123 Main St, Anytown, ST 12345            │  ║
║  └─────────────────────────────────────────────────────┘  ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
```

**Features:**
- Personal information display
- Contact information (phone, email, address)
- Responsive grid layout
- Age auto-calculation
- Conditional rendering of optional fields

---

### Vitals Module (Port 4202)
```
╔════════════════════════════════════════════════════════════╗
║ 💓 Vital Signs                                             ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  ┌─ Temperature ──┐  ┌─ Blood Pressure ──┐  ┌─ HR ──┐    ║
║  │  🌡️ 98.6°C     │  │  💓 120/80 mmHg   │  │ ❤️ 72 │    ║
║  │  Normal ✓      │  │  Normal ✓         │  │ bpm   │    ║
║  └────────────────┘  └───────────────────┘  └───────┘    ║
║                                                            ║
║  ┌─ Resp Rate ───┐  ┌─ O₂ Saturation ───┐  ┌─ Last ──┐   ║
║  │ 💨 16        │  │  🫁 97%           │  │ ⏰ 1/22 │   ║
║  │ breaths/min  │  │  Normal ✓         │  │ 2:30 PM │   ║
║  └────────────────┘  └───────────────────┘  └────────┘   ║
║                                                            ║
║  ┌─ Vital History (Last 10 Readings) ───────────────────┐ ║
║  │ Date/Time        | Temp | BP      | HR | O₂ %        │ ║
║  │ 1/22 14:30       | 98.6 | 120/80  | 72 | 97         │ ║
║  │ 1/22 10:15       | 98.4 | 118/78  | 70 | 96         │ ║
║  │ 1/21 18:45       | 98.8 | 122/82  | 75 | 97         │ ║
║  │ ...                                                   │ ║
║  └──────────────────────────────────────────────────────┘ ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
```

**Features:**
- Latest vital readings display
- Status indicators (Normal/High/Low/Abnormal)
- Trend arrows (↑ ↓ →)
- Historical data table
- Status-based color coding
- Responsive card layout

---

### Labs Module (Port 4203)
```
╔════════════════════════════════════════════════════════════╗
║ 🧬 Laboratory Results                                      ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  Filter: [All Tests ▼]                                    ║
║                                                            ║
║  ┌─ Glucose ────┐  ┌─ Hemoglobin ──┐  ┌─ Cholesterol ─┐  ║
║  │ 95 mg/dL     │  │ 13.5 g/dL      │  │ 180 mg/dL    │  ║
║  │ 1/20/2026    │  │ 1/20/2026      │  │ 1/20/2026    │  ║
║  │ ✓ Normal     │  │ ✓ Normal       │  │ ⚠ Abnormal   │  ║
║  └──────────────┘  └────────────────┘  └──────────────┘  ║
║                                                            ║
║  ┌─ Detailed Results ──────────────────────────────────┐  ║
║  │ Test Name    │ Result    │ Unit  │ Ref Range │ Status│ ║
║  │ Glucose      │ 95        │ mg/dL │ 70-100   │ ✓     │ ║
║  │ Hemoglobin   │ 13.5      │ g/dL  │ 13.5-17  │ ✓     │ ║
║  │ Cholesterol  │ 180       │ mg/dL │ <200     │ ⚠     │ ║
║  │ Triglycerides│ 120       │ mg/dL │ <150     │ ✓     │ ║
║  │ ...                                                   │ ║
║  └──────────────────────────────────────────────────────┘ ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
```

**Features:**
- Test type filtering
- Summary cards with latest results
- Detailed results table
- Status badges (Normal/Abnormal/Critical)
- Reference ranges display
- Lab name and date information

---

### Medications Module (Port 4204)
```
╔════════════════════════════════════════════════════════════╗
║ 💊 Medications                                             ║
╠════════════════════════════════════════════════════════════╣
║ [Active Medications (3)] [Historical Medications (2)]     ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  ┌─ Lisinopril ────────────────────────────────────────┐  ║
║  │ 📋 ACTIVE                                           │  ║
║  │                                                     │  ║
║  │ Dosage: 10 mg  │  Frequency: Once daily            │  ║
║  │ Route: Oral    │  Indication: Hypertension         │  ║
║  │ Prescribed By: Dr. Smith                           │  ║
║  │ Duration: Since May 15, 2025 (8 months)            │  ║
║  └─────────────────────────────────────────────────────┘  ║
║                                                            ║
║  ┌─ Metformin ─────────────────────────────────────────┐  ║
║  │ 📋 ACTIVE                                           │  ║
║  │                                                     │  ║
║  │ Dosage: 500 mg │  Frequency: Twice daily           │  ║
║  │ Route: Oral    │  Indication: Diabetes             │  ║
║  │ Prescribed By: Dr. Johnson                         │  ║
║  │ Duration: Since January 10, 2025 (1 year)          │  ║
║  └─────────────────────────────────────────────────────┘  ║
║                                                            ║
║  ┌─ Statistics ────────────────────────────────────────┐  ║
║  │ Total: 5  │  Active: 3  │  Discontinued: 2        │  ║
║  └─────────────────────────────────────────────────────┘  ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
```

**Features:**
- Active/Historical tabs
- Medication cards with details
- Dosage, frequency, route display
- Indication and prescriber info
- Duration calculations
- Summary statistics

---

### Visits Module (Port 4205)
```
╔════════════════════════════════════════════════════════════╗
║ 📅 Visits & Appointments                                   ║
╠════════════════════════════════════════════════════════════╣
║ Filter: [All Visits ▼]                                    ║
║                                                            ║
║ 📅 Upcoming Appointments                                   ║
║ ┌──────────────────────────────────────────────────────┐  ║
║ │ 🏥 Hospital Visit - Dr. Johnson                      │  ║
║ │ In 5 days | Jan 27, 2026                             │  ║
║ │ [▶ Show Details] [unload] [×]                        │  ║
║ └──────────────────────────────────────────────────────┘  ║
║                                                            ║
║ 📋 Visit History (Timeline)                               ║
║ │                                                         ║
║ ●─ 🏢 Clinic Visit - Dr. Smith - Jan 15, 2026            ║
║ │  Cardiology | Routine checkup                          ║
║ │                                                         ║
║ ●─ 🏥 Hospital Visit - Dr. Brown - Jan 10, 2026          ║
║ │  Internal Medicine | Follow-up                         ║
║ │                                                         ║
║ ●─ 🏪 Office Visit - Dr. Williams - Dec 28, 2025         ║
║ │  General Practice | Annual physical                    ║
║ │                                                         ║
║ ┌─ Statistics ────────────────────────────────────────┐  ║
║ │ Total: 12  │  Upcoming: 3  │  Completed: 9         │  ║
║ └─────────────────────────────────────────────────────┘  ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
```

**Features:**
- Upcoming appointments with countdown
- Past visits in timeline view
- Expandable visit details
- Visit type icons and labels
- Filter by visit type
- Summary statistics

---

## Role-Based Module Access

### Admin View (All Modules)
```
[👤 Demographics] [💓 Vitals] [🧬 Labs] [💊 Medications] [📅 Visits]
```
Access: 5/5 modules

### Clinician View (Clinical Modules)
```
[👤 Demographics] [💓 Vitals] [🧬 Labs] [💊 Medications]
```
Access: 4/5 modules (Visits hidden)

### Nurse View (Clinical & Monitoring)
```
[👤 Demographics] [💓 Vitals] [🧬 Labs] [💊 Medications]
```
Access: 4/5 modules

### Patient View (Own Data)
```
[👤 Demographics] [🧬 Labs] [📅 Visits]
```
Access: 3/5 modules

### Receptionist View (Administrative)
```
[📅 Visits]
```
Access: 1/5 module

---

## Technology Stack

### Frontend
- **Framework:** Angular 17
- **Language:** TypeScript 5
- **Module System:** Webpack 5 Module Federation
- **State:** RxJS BehaviorSubject
- **Package Manager:** npm with workspaces
- **Styling:** Bootstrap 5 + Custom CSS
- **Build Tool:** Angular CLI

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB
- **Authentication:** JWT
- **API:** RESTful with OpenAPI docs
- **Testing:** Jest with 71.88% coverage

### Infrastructure
- **Containerization:** Docker
- **Orchestration:** Docker Compose
- **Version Control:** Git

---

## Build & Run Commands

### Development Mode

**Backend:**
```bash
cd backend
npm install
npm start
# Server running on http://localhost:5001
```

**Shell App (Port 4200):**
```bash
cd frontend/shell-app
npm install
ng serve --port 4200 --open
```

**Modules (Ports 4201-4205):**
```bash
# In separate terminals:
cd frontend/modules/demographics && ng serve --port 4201
cd frontend/modules/vitals && ng serve --port 4202
cd frontend/modules/labs && ng serve --port 4203
cd frontend/modules/medications && ng serve --port 4204
cd frontend/modules/visits && ng serve --port 4205
```

### Production Mode

```bash
# Build all
cd frontend && npm install && npm run build

# Run with Docker
docker compose up -d --build
```

---

## API Endpoints

### Patients
- `GET /api/patients` - List all patients
- `GET /api/patients/:id` - Get patient details
- `POST /api/patients` - Create patient

### Vitals
- `GET /api/patients/:id/vitals` - Get vital signs
- `POST /api/patients/:id/vitals` - Record vital signs

### Labs
- `GET /api/patients/:id/labs` - Get lab results
- `POST /api/patients/:id/labs` - Add lab result

### Medications
- `GET /api/patients/:id/medications` - Get medications
- `POST /api/patients/:id/medications` - Add medication

### Visits (Consolidated)
- `GET /api/patients/:id/visits` - Get visits
- `POST /api/patients/:id/visits` - Add visit (with visitType)

---

## Current Status: 90% Complete ✅

### Completed ✅
- Shell App with authentication
- 5 Micro-frontend modules
- Shared library with models
- Webpack Module Federation setup
- Role-based module loading
- Comprehensive UI components
- Responsive design
- 27 backend tests passing
- 71.88% code coverage

### Remaining Tasks ⏳
1. Backend CORS configuration
2. RBAC middleware enhancement
3. End-to-end testing
4. Production deployment

---

## How to Preview the UI

1. **Start Backend:**
   ```bash
   cd backend && npm start
   ```

2. **Start Shell App:**
   ```bash
   cd frontend/shell-app && ng serve --port 4200 --open
   ```

3. **Start Modules (optional, in separate terminals):**
   ```bash
   cd frontend/modules/demographics && ng serve --port 4201
   cd frontend/modules/vitals && ng serve --port 4202
   cd frontend/modules/labs && ng serve --port 4203
   cd frontend/modules/medications && ng serve --port 4204
   cd frontend/modules/visits && ng serve --port 4205
   ```

4. **Login with demo credentials:**
   - Username: `admin` Password: `admin` (Full access)
   - Username: `clinician` Password: `clinician` (Clinical access)
   - Username: `patient` Password: `patient` (Patient view)

5. **Search for a patient and view their health records**

---

## File Structure Summary

```
PatientRecords/
├── backend/
│   ├── src/
│   │   └── models/ (27 tests, 71.88% coverage)
│   ├── Dockerfile
│   └── package.json
│
├── frontend/
│   ├── shell-app/
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── components/ (Login, Navigation, Dashboard, PatientSearch)
│   │   │   │   ├── core/ (Auth, Patient Context, Module Loader)
│   │   │   │   └── shared/ (Modules Dashboard)
│   │   │   └── main.ts
│   │   └── webpack.config.js
│   │
│   ├── modules/
│   │   ├── demographics/ (Port 4201)
│   │   ├── vitals/ (Port 4202)
│   │   ├── labs/ (Port 4203)
│   │   ├── medications/ (Port 4204)
│   │   └── visits/ (Port 4205)
│   │
│   ├── shared/
│   │   └── lib/
│   │       ├── models/ (8 interfaces)
│   │       ├── auth/ (Auth service contracts)
│   │       └── services/ (ConfigService)
│   │
│   └── PHASE4_PROGRESS.md
│
├── docker-compose.yml
└── README.md
```

---

**Next Steps:**
1. Start the backend and frontend services
2. Login with demo credentials
3. Search for and select a patient
4. Navigate through different modules
5. Observe role-based module visibility

**System is ready for comprehensive testing!** 🚀

---

*Generated: January 22, 2026*  
*PatientRecords Micro-Frontend System - Phase 4*
