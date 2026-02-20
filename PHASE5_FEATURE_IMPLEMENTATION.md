# Phase 5: Feature Implementation Roadmap

**Date Created:** February 20, 2026  
**Status:** Implementation Ready  
**Current Progress:** Skeleton Complete (0% Feature Implementation)

---

## 🎯 Overview

The micro-frontend architecture is now complete with all 5 modules building, deploying, and loading successfully. This document serves as the central guide for implementing actual features in each module, starting with Demographics and following through all 5 modules.

### Current System State
- ✅ All infrastructure running and healthy (ports 4200-4205, 5001, 27017)
- ✅ Module federation working correctly
- ✅ All APIs endpoints operational
- ✅ Sample data loaded in MongoDB
- ⏳ **Feature display not yet implemented** (showing placeholder messages)

---

## 🏗️ Architecture Reference

### System Topology
```
Shell App (Port 4200)
├─ Orchestrates 5 micro-frontend modules via Webpack Module Federation
├─ Handles JWT authentication
├─ Provides patient search and navigation
└─ Manages role-based module visibility

Micro-Frontend Modules (Ports 4201-4205)
├─ Demographics (4201) - Patient personal/contact info
├─ Vitals (4202) - Vital signs with trends
├─ Labs (4203) - Lab test results with filtering
├─ Medications (4204) - Active/historical meds with durations
└─ Visits (4205) - Upcoming/past appointments with timeline

Backend API (Port 5001)
├─ Handles all HTTP requests from frontend
├─ JWT validation and token refresh
└─ Database queries to MongoDB

MongoDB (Port 27017)
└─ Persists all patient health data
```

### Key Services

**PatientContextService** (Shell App)
- Stores selected patient state as `BehaviorSubject<Patient>`
- All modules inject this to get current patient
- Methods: `setSelectedPatient()`, `getSelectedPatient()`, `getCurrentPatient()`

**PatientService** (Shell App)
- Provides HTTP methods to backend
- `searchPatients(query)` - Search by name/MRN
- `getPatientById(id)` - Get full patient details

**AuthService** (Shell App)
- Manages JWT tokens in localStorage
- Provides current user role for module visibility
- Methods: `getRole()`, `getToken()`, `isAuthenticated()`

---

## 📊 Module Implementation Status

### Summary Table

| Module | Port | Status | What Works | What's Needed |
|--------|------|--------|-----------|--------------|
| **Demographics** | 4201 | Skeleton | Module loads, displays message | Patient info display, responsive layout |
| **Vitals** | 4202 | Skeleton | Module loads, displays message | Latest vitals, status indicators, trends |
| **Labs** | 4203 | Skeleton | Module loads, displays message | Lab results, filtering, status badges |
| **Medications** | 4204 | Skeleton | Module loads, displays message | Active/historical tabs, duration calc |
| **Visits** | 4205 | Skeleton | Module loads, displays message | Timeline, appointments, filtering |

### Implementation Sequence

**Tier 1: Foundation (Do First)**
1. ✅ Demographics - Simple display, establishes pattern
2. ✅ Vitals - Data display, introduces status logic
3. ✅ Labs - Filtering, introduces UI complexity

**Tier 2: Enhancement (Do Next)**
4. ✅ Medications - Tabs and calculations
5. ✅ Visits - Timeline and date math

---

## 🎯 Phase 5a: Demographics Module Implementation

### Current State
```
demographics/
├── src/app/components/demographics/
│   ├── demographics.component.ts (shows skeleton message)
│   └── demographics.component.html (basic template)
├── package.json (configured with @nrwl/angular)
├── angular.json (configured)
├── webpack.config.js (configured)
└── Dockerfile (configured)
```

### Requirements

**Data Model** (from PatientContextService)
```typescript
interface Patient {
  id: string;
  name: string;
  mrn: string;
  dateOfBirth: Date;
  gender: 'M' | 'F' | 'Other';
  email: string;
  phone: string;
  address: string;
}
```

**Display Areas**
1. **Personal Information Section**
   - Full Name
   - MRN (Medical Record Number)
   - Date of Birth (formatted as "Month Day, Year")
   - Age (calculated from DOB)
   - Gender

2. **Contact Information Section**
   - Phone number
   - Email address
   - Address (street address, city, state, zip)

3. **States to Handle**
   - Loading: Show spinner
   - Loaded: Display information
   - No Patient Selected: Show message to select patient
   - Error: Show error message with retry

### Implementation Checklist

- [ ] **Step 1: Inject PatientContextService**
  ```typescript
  constructor(private patientContext: PatientContextService) {}
  ```

- [ ] **Step 2: Subscribe to patient in ngOnInit**
  ```typescript
  ngOnInit(): void {
    this.patientContext.getSelectedPatient()
      .pipe(takeUntil(this.destroy$))
      .subscribe(patient => {
        this.currentPatient = patient;
        this.loading = false;
      });
  }
  ```

- [ ] **Step 3: Implement age calculation helper**
  ```typescript
  calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    let age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
      age--;
    }
    return age;
  }
  ```

- [ ] **Step 4: Format dates in template**
  ```html
  <p>{{ currentPatient.dateOfBirth | date: 'MMMM d, yyyy' }}</p>
  ```

- [ ] **Step 5: Responsive grid layout**
  ```css
  .demographics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
  }
  ```

- [ ] **Step 6: Add loading spinner**
  ```html
  <div *ngIf="loading" class="spinner">Loading...</div>
  <div *ngIf="!loading && currentPatient" class="content">
    <!-- Display data -->
  </div>
  ```

- [ ] **Step 7: Handle no patient selected**
  ```html
  <div *ngIf="!loading && !currentPatient" class="empty-state">
    Please select a patient to view demographics
  </div>
  ```

- [ ] **Step 8: Test with sample data**
  - Select patient "John Smith" (P-00001)
  - Verify all fields display correctly
  - Verify age calculation is accurate
  - Verify date formatting is correct

- [ ] **Step 9: Responsive testing**
  - Test on mobile (< 480px)
  - Test on tablet (768px)
  - Test on desktop (1920px+)

- [ ] **Step 10: Accessibility review**
  - Labels for all fields
  - Proper semantic HTML
  - Color contrast adequate

---

## 🔄 Module Implementation Pattern

### Standard Pattern for ALL Modules

Each module should follow this structure:

#### 1. Component Class
```typescript
import { Component, OnInit, OnDestroy } from '@angular/core';
import { PatientContextService } from '@shell-app/services';
import { Patient } from '@patient-records/shared';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-[module-name]',
  standalone: true,
  templateUrl: './[component].component.html',
  styleUrls: ['./[component].component.css']
})
export class [ModuleComponent] implements OnInit, OnDestroy {
  currentPatient: Patient | null = null;
  loading = true;
  error: string | null = null;
  
  private destroy$ = new Subject<void>();

  constructor(private patientContext: PatientContextService) {}

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    this.patientContext.getSelectedPatient()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (patient) => {
          this.currentPatient = patient;
          this.loading = false;
        },
        error: (err) => {
          this.error = 'Failed to load patient data';
          this.loading = false;
          console.error(err);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

#### 2. Template Structure
```html
<div class="module-container">
  <!-- Loading State -->
  <div *ngIf="loading" class="spinner">
    <p>Loading...</p>
  </div>

  <!-- Error State -->
  <div *ngIf="!loading && error" class="error">
    <p>{{ error }}</p>
    <button (click)="loadData()">Retry</button>
  </div>

  <!-- Empty State -->
  <div *ngIf="!loading && !currentPatient && !error" class="empty-state">
    <p>Please select a patient to view this information</p>
  </div>

  <!-- Content State -->
  <div *ngIf="!loading && currentPatient && !error" class="content">
    <!-- Module-specific content here -->
  </div>
</div>
```

#### 3. CSS Foundation
```css
.module-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.spinner {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
}

.error {
  padding: 20px;
  background-color: #fee;
  border-left: 4px solid #f00;
  border-radius: 4px;
}

.empty-state {
  padding: 40px;
  text-align: center;
  color: #999;
}

.content {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Responsive */
@media (max-width: 768px) {
  .module-container {
    padding: 10px;
  }
}
```

#### 4. Key Principles
- ✅ Always use `takeUntil(destroy$)` to prevent memory leaks
- ✅ Handle all three states: loading, error, success
- ✅ Use patientContext service for patient data
- ✅ Show user feedback (spinners, errors)
- ✅ Make responsive for all screen sizes
- ✅ Use shared interfaces from @patient-records/shared
- ✅ Proper null checking with ng-if

---

## 🚀 Implementation Sequence with Checklist

### Module 1: Demographics ✅ NEXT

**Expected Time:** 2-3 hours  
**Complexity:** Low (simple data display)

**Why First:** 
- Simplest to implement
- Establishes the working pattern
- Quick win to build momentum

📋 [See Demographics checklist above](#-phase-5a-demographics-module-implementation)

---

### Module 2: Vitals (After Demographics)

**Expected Time:** 3-4 hours  
**Complexity:** Medium (status logic)

**What to Display:**
- Latest readings for 6 vital types
- Visual status indicators (Normal/High/Low/Abnormal)
- Trending arrows (↑ up, ↓ down, → stable)
- Historical data table (last 10 readings)

**Implementation Steps:**
- [ ] Inject PatientContextService
- [ ] Subscribe to patient
- [ ] Call vitals API endpoint: `/api/patients/:id/vitals`
- [ ] Implement status determination logic (temp, BP, HR, RR, O2, weight)
- [ ] Implement trending calculation
- [ ] Create responsive grid for current vitals
- [ ] Create table for historical data
- [ ] Add color coding for statuses
- [ ] Test with sample vitals data
- [ ] Verify mobile responsiveness

**Key Methods Needed:**
```typescript
getLatestVital(code: string): Vital | undefined
getVitalTrend(code: string): 'up' | 'down' | 'stable'
getTemperatureStatus(temp: number): 'normal' | 'high' | 'low'
getBloodPressureStatus(systolic: number, diastolic: number): 'normal' | 'high' | 'low'
```

---

### Module 3: Labs (After Vitals)

**Expected Time:** 3-4 hours  
**Complexity:** Medium-High (filtering)

**What to Display:**
- Summary cards with latest results
- Detailed table of all lab results
- Filter by test type
- Status badges (Normal/Abnormal/Critical)
- Reference ranges

**Implementation Steps:**
- [ ] Inject PatientContextService
- [ ] Subscribe to patient
- [ ] Call labs API endpoint: `/api/patients/:id/labs`
- [ ] Group results by test type
- [ ] Implement filtering dropdown
- [ ] Create summary cards for each type
- [ ] Create detailed results table
- [ ] Implement status logic
- [ ] Add reference range display
- [ ] Test filtering functionality
- [ ] Verify mobile responsiveness

**Key Methods Needed:**
```typescript
getFilteredLabs(testType?: string): Lab[]
getTestTypeOptions(): string[]
isAbnormal(value: number, refMin: number, refMax: number): boolean
getResultStatus(value: number, refMin: number, refMax: number): 'normal' | 'abnormal' | 'critical'
```

---

### Module 4: Medications (After Labs)

**Expected Time:** 3-4 hours  
**Complexity:** Medium (calculations)

**What to Display:**
- Two tabs: Active & Historical
- Medication cards with details
- Duration display (e.g., "42 days" or "2 months")
- Summary statistics

**Implementation Steps:**
- [ ] Inject PatientContextService
- [ ] Subscribe to patient
- [ ] Call medications API endpoint: `/api/patients/:id/medications`
- [ ] Separate medications into active/historical
- [ ] Implement tab switching UI
- [ ] Create medication cards
- [ ] Implement duration calculation
- [ ] Display prescriber info
- [ ] Add summary statistics
- [ ] Test tab switching
- [ ] Verify mobile responsiveness

**Key Methods Needed:**
```typescript
separateMedications(): { active: Medication[], historical: Medication[] }
getMedicationDuration(startDate: Date, endDate?: Date): string
getMedicationStatus(medication: Medication): 'active' | 'discontinued' | 'pending'
calculateDuration(days: number): string  // "2 months", "3 days", etc.
```

---

### Module 5: Visits (After Medications)

**Expected Time:** 3-4 hours  
**Complexity:** High (date logic, timeline)

**What to Display:**
- Upcoming appointments with countdown
- Past visits timeline
- Filter by visit type
- Expandable visit details

**Implementation Steps:**
- [ ] Inject PatientContextService
- [ ] Subscribe to patient
- [ ] Call visits API endpoint: `/api/patients/:id/visits`
- [ ] Separate upcoming vs. past visits
- [ ] Implement countdown display
- [ ] Create timeline visualization
- [ ] Add filtering by visit type
- [ ] Make visit cards expandable
- [ ] Display provider information
- [ ] Add visit notes/details
- [ ] Test filtering and expansion
- [ ] Verify mobile responsiveness

**Key Methods Needed:**
```typescript
getUpcomingVisits(): Visit[]
getPastVisits(): Visit[]
getDaysUntilVisit(visitDate: Date): number
getFilteredVisits(type?: string): Visit[]
getVisitTypeOptions(): string[]
toggleExpandVisit(visitId: string): void
```

---

## 🔗 Available APIs

### Backend Endpoints

All endpoints require JWT token in Authorization header:
```
Authorization: Bearer <jwt_token>
```

**Patient Endpoints:**
```
GET /api/patients
GET /api/patients/:id
GET /api/patients/:id/vitals
GET /api/patients/:id/labs
GET /api/patients/:id/medications
GET /api/patients/:id/visits
```

**Sample Patient IDs:**
- P-00001 (John Smith)
- P-00002 (Jane Doe)
- P-00003 (Bob Johnson)
- P-00004 (Alice Brown)

### Response Format

All endpoints return:
```typescript
{
  success: boolean;
  data: T;  // Type-specific data
  error?: string;
}
```

---

## 📚 TypeScript Interfaces

All data types are defined in `@patient-records/shared`:

```typescript
// Patient
interface Patient {
  id: string;
  name: string;
  mrn: string;
  dateOfBirth: Date;
  gender: 'M' | 'F' | 'Other';
  email: string;
  phone: string;
  address: string;
}

// Vitals
interface Vital {
  id: string;
  patientId: string;
  type: string;  // 'temperature', 'blood_pressure', etc.
  value: number;
  unit: string;
  timestamp: Date;
  measuredBy?: string;
}

// Labs
interface Lab {
  id: string;
  patientId: string;
  testName: string;
  testType: string;
  value: number;
  unit: string;
  referenceMin: number;
  referenceMax: number;
  status: string;
  date: Date;
  lab?: string;
}

// Medications
interface Medication {
  id: string;
  patientId: string;
  name: string;
  dosage: string;
  frequency: string;
  route: string;
  indication: string;
  prescribedBy?: string;
  startDate: Date;
  endDate?: Date;
  status: 'active' | 'discontinued';
}

// Visits
interface Visit {
  id: string;
  patientId: string;
  type: string;  // 'physician', 'hospital', 'clinic'
  visitDate: Date;
  provider?: string;
  department?: string;
  reason?: string;
  notes?: string;
  duration?: number;
}
```

---

## 🧪 Testing Strategy

### Unit Testing Pattern
```typescript
describe('DemographicsComponent', () => {
  let component: DemographicsComponent;
  let patientContext: PatientContextService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DemographicsComponent],
      providers: [PatientContextService]
    }).compileComponents();

    component = TestBed.createComponent(DemographicsComponent).componentInstance;
    patientContext = TestBed.inject(PatientContextService);
  });

  it('should display patient name when loaded', (done) => {
    const mockPatient = {
      id: 'P-00001',
      name: 'John Smith',
      // ... other fields
    };

    spyOn(patientContext, 'getSelectedPatient').and.returnValue(
      of(mockPatient)
    );

    component.ngOnInit();
    expect(component.currentPatient.name).toBe('John Smith');
    done();
  });
});
```

### Integration Testing
- Test module loads via module federation
- Test PatientContextService provides correct data
- Test template displays data correctly
- Test responsive design on different viewports

### Manual Testing Checklist
- [ ] Open shell app on localhost:4200
- [ ] Login with test credentials
- [ ] Search for and select a patient
- [ ] Click module tab
- [ ] Verify data displays correctly
- [ ] Check loading spinner appears
- [ ] Test error handling (if possible)
- [ ] Test mobile view
- [ ] Test tablet view
- [ ] Test desktop view

---

## 🔧 Common Utilities

### Date Formatting
```typescript
// In component
import { DatePipe } from '@angular/common';

// In template
{{ dateValue | date: 'MMMM d, yyyy' }}
{{ dateValue | date: 'short' }}
{{ dateValue | date: 'medium' }}
```

### Age Calculation
```typescript
calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  let age = today.getFullYear() - new Date(dateOfBirth).getFullYear();
  const monthDiff = today.getMonth() - new Date(dateOfBirth).getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < new Date(dateOfBirth).getDate())) {
    age--;
  }
  return age;
}
```

### Duration Calculation
```typescript
calculateDuration(startDate: Date, endDate?: Date): string {
  const end = endDate || new Date();
  const diffTime = Math.abs(new Date(end).getTime() - new Date(startDate).getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 30) return `${diffDays} days`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months`;
  return `${Math.floor(diffDays / 365)} years`;
}
```

### Days Until Date
```typescript
getDaysUntil(futureDate: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const future = new Date(futureDate);
  future.setHours(0, 0, 0, 0);
  const diffTime = future.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
```

---

## 📋 Progress Tracking

### Current Status
- Phase 5a (Demographics): ⏳ Ready to Start
- Phase 5b (Vitals): ⏳ Waiting for 5a
- Phase 5c (Labs): ⏳ Waiting for 5b
- Phase 5d (Medications): ⏳ Waiting for 5c
- Phase 5e (Visits): ⏳ Waiting for 5d

### Success Metrics
- [ ] Demographics displays patient info correctly
- [ ] All 5 modules displaying real data
- [ ] All modules responsive on mobile/tablet/desktop
- [ ] Error states handled gracefully
- [ ] Loading states show proper feedback
- [ ] No memory leaks detected
- [ ] Code follows established patterns
- [ ] All tests passing

---

## 🎓 Implementation Getting Started

### To Implement Demographics:

1. **Open demographics component**
   ```
   frontend/modules/demographics/src/app/components/demographics/demographics.component.ts
   ```

2. **Follow the implementation checklist** above in section "Phase 5a"

3. **Test locally:**
   ```bash
   cd frontend/modules/demographics
   npm start  # Serves on port 4201
   ```

4. **Or test via shell app:**
   - Open http://localhost:4200
   - Login
   - Select a patient
   - Click Demographics tab
   - Verify data displays

5. **When method is working:**
   ```bash
   git add .
   git commit -m "feat: Implement demographics module feature display"
   ```

---

**Status Summary:** Ready to begin Phase 5a Demographics implementation. All infrastructure complete, APIs working, data available. Follow pattern established in this document for all subsequent modules.

---

*Last Updated: February 20, 2026*  
*Next Phase: Demographics Module Implementation*
