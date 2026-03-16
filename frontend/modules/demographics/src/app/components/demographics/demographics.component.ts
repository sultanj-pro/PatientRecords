import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HTTP_INTERCEPTORS } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { JwtInterceptor } from '../../core/interceptors/jwt.interceptor';
import { CollapsibleSectionComponent } from '../collapsible-section/collapsible-section.component';

// Type definitions for structured demographics
interface Address {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

interface LegalName {
  first?: string;
  middle?: string;
  last?: string;
}

interface EmergencyContact {
  name?: string;
  relationship?: string;
  phone?: string;
  isPrimary?: boolean;
}

interface Insurance {
  type?: 'primary' | 'secondary' | 'tertiary';
  provider?: string;
  policyNumber?: string;
  groupNumber?: string;
  subscriberName?: string;
  subscriberRelationship?: string;
  effectiveDate?: Date | string;
  expirationDate?: Date | string;
}

interface Demographics {
  legalName?: LegalName;
  preferredName?: string;
  dateOfBirth?: Date | string;
  gender?: string;
  sexAssignedAtBirth?: string;
  ssn?: string;
  mrn?: string;
  bloodType?: string;
  primaryPhone?: string;
  secondaryPhone?: string;
  email?: string;
  address?: Address;
  emergencyContacts?: EmergencyContact[];
  preferredLanguage?: string;
  race?: string;
  ethnicity?: string;
  maritalStatus?: string;
  insurance?: Insurance[];
}

interface Patient {
  patientid?: number;
  id?: number;
  firstname?: string;
  lastname?: string;
  demographics?: Demographics;
  [key: string]: any;
}

@Component({
  selector: 'app-demographics',
  standalone: true,
  imports: [CommonModule, CollapsibleSectionComponent],
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
  currentDemographics: Demographics | null = null;
  loading = true;
  error: string | null = null;
  displayAge = 0;
  
  // Section expansion states
  basicInfoExpanded = true;
  contactInfoExpanded = true;
  emergencyContactsExpanded = true;
  culturalInfoExpanded = false;
  insuranceExpanded = false;
  secureInfoExpanded = false;
  
  // For showing/hiding SSN
  showSSN = false;
  
  private destroy$ = new Subject<void>();
  private lastPatientId: string | null = null;

  constructor(private http: HttpClient, private route: ActivatedRoute) {}

  ngOnInit(): void {
    // Extract patientId from URL params (for deep linking and direct routes)
    // Route params only fire when this module's route is active
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const urlPatientId = params['patientId'];
      if (urlPatientId) {
        console.log('[Demographics] Patient ID from route params:', urlPatientId);
        this.storePatientContextInLocalStorage(urlPatientId);
        if (urlPatientId !== this.lastPatientId) {
          this.lastPatientId = urlPatientId;
          this.loadPatientData();
        }
      }
    });
  }

  ngOnDestroy(): void {
    // Complete the destroy subject
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadPatientData(): void {
    this.loading = true;
    this.error = null;

    const patientId = this.getPatientIdFromStorage();
    
    if (!patientId) {
      this.loading = false;
      this.error = 'No patient selected. Please select a patient from the dashboard.';
      return;
    }

    const apiUrl = `http://localhost:5001/api/patients/${patientId}`;
    
    this.http.get<any>(apiUrl)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (patient) => {
          if (patient) {
            this.currentPatient = patient;
            this.currentDemographics = patient.demographics || {};
            
            // Calculate age if DOB exists
            if (this.currentDemographics?.dateOfBirth) {
              this.displayAge = this.calculateAge(this.currentDemographics.dateOfBirth);
            }
            
            this.lastPatientId = patientId;
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
    const contextStr = localStorage.getItem('__PATIENT_CONTEXT__');
    if (contextStr) {
      try {
        const context = JSON.parse(contextStr);
        if (context.patientId) return context.patientId;
      } catch (e) {
        console.warn('Failed to parse patient context:', e);
      }
    }

    let patientId = sessionStorage.getItem('selectedPatientId');
    if (patientId) return patientId;
    
    patientId = localStorage.getItem('selectedPatientId');
    if (patientId) return patientId;
    
    const urlParams = new URLSearchParams(window.location.search);
    patientId = urlParams.get('patientId');
    if (patientId) return patientId;
    
    const pathMatch = window.location.pathname.match(/\/dashboard\/[^\/]+\/([^\/]+)/);
    if (pathMatch && pathMatch[1]) return pathMatch[1];
    
    return null;
  }

  private storePatientContextInLocalStorage(patientId: string): void {
    const context = { patientId, timestamp: Date.now() };
    localStorage.setItem('__PATIENT_CONTEXT__', JSON.stringify(context));
    localStorage.setItem('selectedPatientId', patientId);
  }

  calculateAge(dateOfBirth: Date | string): number {
    if (!dateOfBirth) return 0;
    const today = new Date();
    const dob = new Date(dateOfBirth);
    
    if (isNaN(dob.getTime())) return 0;
    
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    
    return age;
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

  maskSSN(ssn: string | undefined): string {
    if (!ssn) return 'N/A';
    return ssn.substring(0, 5) + '-' + ssn.substring(5);
  }

  getFullName(): string {
    if (!this.currentDemographics?.legalName) return 'N/A';
    const name = this.currentDemographics.legalName;
    const parts = [name.first, name.middle, name.last].filter(p => p);
    return parts.length > 0 ? parts.join(' ') : 'N/A';
  }

  getPreferredName(): string {
    return this.currentDemographics?.preferredName || 'N/A';
  }

  getFullAddress(): string {
    if (!this.currentDemographics?.address) return 'N/A';
    const addr = this.currentDemographics.address;
    const parts = [addr.street, addr.city, addr.state, addr.zip].filter(p => p);
    return parts.length > 0 ? parts.join(', ') : 'N/A';
  }

  getPrimaryInsurance(): Insurance | undefined {
    return this.currentDemographics?.insurance?.find(i => i.type === 'primary');
  }

  getSecondaryInsurance(): Insurance | undefined {
    return this.currentDemographics?.insurance?.find(i => i.type === 'secondary');
  }

  getTertiaryInsurance(): Insurance | undefined {
    return this.currentDemographics?.insurance?.find(i => i.type === 'tertiary');
  }

  getPrimaryEmergencyContact(): EmergencyContact | undefined {
    return this.currentDemographics?.emergencyContacts?.find(c => c.isPrimary);
  }

  getOtherEmergencyContacts(): EmergencyContact[] {
    return this.currentDemographics?.emergencyContacts?.filter(c => !c.isPrimary) || [];
  }

  toggleSSNVisibility(): void {
    this.showSSN = !this.showSSN;
  }

  retryLoad(): void {
    this.loadPatientData();
  }
}


