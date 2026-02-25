import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HTTP_INTERCEPTORS } from '@angular/common/http';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { JwtInterceptor } from '../../core/interceptors/jwt.interceptor';

// Patient interface (defined locally to avoid module resolution issues)
interface Patient {
  patientid?: number;
  id?: number;
  firstname?: string;
  lastName?: string;
  firstname_upper?: string;
  lastname_upper?: string;
  dateOfBirth?: Date | string;
  dob?: Date | string;
  gender?: string;
  mrn?: string;
  email?: string;
  phone?: string;
  [key: string]: any;
}

@Component({
  selector: 'app-demographics',
  standalone: true,
  imports: [CommonModule],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: JwtInterceptor,
      multi: true
    }
  ],
  templateUrl: './demographics.component.html',
  styleUrls: ['./demographics.component.css']
})
export class DemographicsComponent implements OnInit, OnDestroy {
  currentPatient: Patient | null = null;
  loading = true;
  error: string | null = null;
  displayAge = 0;
  
  private destroy$ = new Subject<void>();
  private lastPatientId: string | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    // Initial load
    this.loadPatientData();
    
    // Use Angular's interval Observable to watch for patient changes
    // When patient context changes in localStorage, reload the data
    // This is necessary because demographics persists when switching tabs
    interval(500)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        const currentPatientId = this.getPatientIdFromStorage();
        if (currentPatientId && currentPatientId !== this.lastPatientId) {
          console.log('Demographics: Patient changed, reloading data', {
            old: this.lastPatientId,
            new: currentPatientId
          });
          this.lastPatientId = currentPatientId;
          this.loadPatientData();
        }
      });
  }

  private loadPatientData(): void {
    this.loading = true;
    this.error = null;

    // Get patient ID from various sources
    const patientId = this.getPatientIdFromStorage();
    
    if (!patientId) {
      this.loading = false;
      this.error = 'No patient selected. Please select a patient from the dashboard.';
      return;
    }

    // Call backend API to get patient data
    const apiUrl = `http://localhost:5001/api/patients/${patientId}`;
    
    this.http.get<any>(apiUrl)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (patient) => {
          if (patient) {
            // Extract values from demographics array
            const demographics = patient.demographics || [];
            const getDemographicValue = (description: string): string | undefined => {
              const item = demographics.find((d: any) => d.description === description);
              return item?.value;
            };
            
            // Map backend fields to local Patient interface
            this.currentPatient = {
              patientid: patient.patientid || patient.id,
              firstname: patient.firstname,
              lastname: patient.lastname,
              dateOfBirth: getDemographicValue('Date of Birth'),
              gender: getDemographicValue('Gender'),
              email: getDemographicValue('Email'),
              phone: getDemographicValue('Phone'),
              address: getDemographicValue('Address')
            };
            
            console.log('Date of Birth string:', this.currentPatient.dateOfBirth);
            
            // Ensure dateOfBirth is a Date object if present
            if (this.currentPatient.dateOfBirth) {
              if (typeof this.currentPatient.dateOfBirth === 'string') {
                this.currentPatient.dateOfBirth = new Date(this.currentPatient.dateOfBirth);
                console.log('Converted to Date object:', this.currentPatient.dateOfBirth);
              }
              this.displayAge = this.calculateAge(this.currentPatient.dateOfBirth);
              console.log('Calculated age:', this.displayAge);
            }
            this.lastPatientId = patientId; // Track loaded patient
            this.loading = false;
          } else {
            this.error = 'No patient data found';
            this.loading = false;
          }
        },
        error: (err) => {
          console.error('Error loading patient:', err);
          this.error = `Failed to load patient data: ${err.message || 'Unknown error'}`;
          this.loading = false;
        }
      });
  }

  private getPatientIdFromStorage(): string | null {
    // 1. First, try to get from shell app's shared patient context (__PATIENT_CONTEXT__)
    const contextStr = localStorage.getItem('__PATIENT_CONTEXT__');
    if (contextStr) {
      try {
        const context = JSON.parse(contextStr);
        if (context.patientId) {
          return context.patientId;
        }
      } catch (e) {
        console.warn('Failed to parse patient context:', e);
      }
    }

    // 2. Try sessionStorage (set by shell app during navigation)
    let patientId = sessionStorage.getItem('selectedPatientId');
    if (patientId) return patientId;
    
    // 3. Check localStorage (fallback)
    patientId = localStorage.getItem('selectedPatientId');
    if (patientId) return patientId;
    
    // 4. Check URL (if accessed directly)
    const urlParams = new URLSearchParams(window.location.search);
    patientId = urlParams.get('patientId');
    if (patientId) return patientId;
    
    // 5. Extract patientId from URL pattern: /dashboard/:module/:patientId
    const pathMatch = window.location.pathname.match(/\/dashboard\/[^\/]+\/([^\/]+)/);
    if (pathMatch && pathMatch[1]) {
      return pathMatch[1];
    }
    
    return null;
  }

  calculateAge(dateOfBirth: Date | string): number {
    if (!dateOfBirth) return 0;
    const today = new Date();
    const dob = new Date(dateOfBirth);
    
    // Check if date is valid
    if (isNaN(dob.getTime())) return 0;
    
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    
    return age;
  }

  getPatientFullName(): string {
    if (!this.currentPatient) return 'N/A';
    const firstname = this.currentPatient['firstname'] || '';
    const lastname = this.currentPatient['lastname'] || '';
    return `${firstname} ${lastname}`.trim();
  }

  retryLoad(): void {
    this.loadPatientData();
  }

  formatDate(date: Date | string | undefined | null): string {
    if (!date) return 'N/A';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'N/A';
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return d.toLocaleDateString('en-US', options);
  }

  ngOnDestroy(): void {
    // RxJS subscription is automatically cleaned up via takeUntil
    this.destroy$.next();
    this.destroy$.complete();
  }
}

