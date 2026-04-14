import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  imports: [CommonModule, FormsModule, CollapsibleSectionComponent],
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

  // Role guard
  canEdit = false;

  // Edit modal
  showEditModal = false;
  editSection = 'basic';   // which tab is active in the modal
  editForm: Demographics = {};
  saving = false;
  saveError: string | null = null;
  isNewPatient = false;

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
    this.canEdit = this.hasEditRole();
    // Extract patientId from URL params (for deep linking and direct routes)
    // Route params only fire when this module's route is active
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const urlPatientId = params['patientId'];
      if (urlPatientId === 'new') {
        // New-patient registration mode — no API call, open empty edit form
        this.isNewPatient = true;
        this.loading = false;
        this.error = null;
        this.currentPatient = { patientid: 0, firstname: '', lastname: '' };
        this.currentDemographics = {};
        this.storePatientContextInLocalStorage('new');
        setTimeout(() => this.openEditModal('basic'), 0);
        return;
      }
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

    const apiUrl = `/api/patients/${patientId}`;
    
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
    // Parse as local time to avoid UTC midnight rolling back one day for western timezones.
    // ISO date-only strings (YYYY-MM-DD) are treated as UTC by new Date(); appending
    // T00:00:00 without Z forces local-time interpretation.
    const s = typeof date === 'string' ? date : (date as Date).toISOString();
    const localStr = s.length === 10 ? s + 'T00:00:00' : s.replace('Z', '');
    const d = new Date(localStr);
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

  // ── Edit Demographics ──────────────────────────────────────────────────────
  private hasEditRole(): boolean {
    try {
      const role = (localStorage.getItem('user_role') || '').toLowerCase();
      if (role === 'physician' || role === 'admin') return true;
      const token = localStorage.getItem('jwt_token') || sessionStorage.getItem('jwt_token');
      if (!token) return false;
      const payload = JSON.parse(atob(token.split('.')[1]));
      return ['physician', 'admin'].includes((payload.role || '').toLowerCase());
    } catch { return false; }
  }

  openEditModal(section: string = 'basic'): void {
    this.editForm = JSON.parse(JSON.stringify(this.currentDemographics || {}));
    if (!this.editForm.legalName) this.editForm.legalName = {};
    // Fall back to top-level patient name fields when legalName was not set
    if (!this.editForm.legalName.first && this.currentPatient?.firstname) {
      this.editForm.legalName.first = this.currentPatient.firstname;
    }
    if (!this.editForm.legalName.last && this.currentPatient?.lastname) {
      this.editForm.legalName.last = this.currentPatient.lastname;
    }
    if (!this.editForm.address)          this.editForm.address = {};
    if (!this.editForm.emergencyContacts || !this.editForm.emergencyContacts.length)
      this.editForm.emergencyContacts = [{ name: '', relationship: '', phone: '', isPrimary: true }];
    this.editSection = section;
    this.saveError = null;
    this.showEditModal = true;
    // Normalize dateOfBirth to YYYY-MM-DD for the date input
    if (this.editForm.dateOfBirth) {
      this.editForm.dateOfBirth = new Date(this.editForm.dateOfBirth).toISOString().slice(0, 10);
    }
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.saveError = null;
    if (this.isNewPatient) {
      this.isNewPatient = false;
      window.dispatchEvent(new CustomEvent('navigate-to-patient', { detail: { patientId: null } }));
    }
  }

  saveDemographics(): void {
    if (this.isNewPatient) {
      this.saveNewPatient();
      return;
    }
    const patientId = this.getPatientIdFromStorage();
    if (!patientId) return;
    this.saving = true;
    this.saveError = null;

    // Strip empty strings to avoid overwriting real data with blanks
    const payload: Demographics = JSON.parse(JSON.stringify(this.editForm));

    this.http.put(`/api/patients/${patientId}/demographics`, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.saving = false;
          this.closeEditModal();
          this.loadPatientData();
          window.dispatchEvent(new CustomEvent('patient-demographics-updated', { detail: { patientId } }));
        },
        error: (err) => { this.saving = false; this.saveError = err.error?.error || 'Save failed. Please try again.'; }
      });
  }

  addEmergencyContact(): void {
    if (!this.editForm.emergencyContacts) this.editForm.emergencyContacts = [];
    this.editForm.emergencyContacts.push({ name: '', relationship: '', phone: '', isPrimary: false });
  }

  private saveNewPatient(): void {
    const firstname = this.editForm.legalName?.first?.trim();
    const lastname = this.editForm.legalName?.last?.trim();
    if (!firstname || !lastname) {
      this.saveError = 'First name and last name are required to register a patient.';
      return;
    }
    this.saving = true;
    this.saveError = null;

    this.http.post<any>('/api/patients', {
      firstname,
      lastname,
      dateOfBirth: this.editForm.dateOfBirth || undefined,
      gender: this.editForm.gender || undefined,
      mrn: this.editForm.mrn || undefined,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (patient) => {
        const patientId = String(patient.patientid);
        const payload: Demographics = JSON.parse(JSON.stringify(this.editForm));
        this.http.put(`/api/patients/${patientId}/demographics`, payload)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.isNewPatient = false;
              this.saving = false;
              this.closeEditModal();
              window.dispatchEvent(new CustomEvent('navigate-to-patient', { detail: { patientId } }));
            },
            error: (err) => {
              this.saving = false;
              this.saveError = err.error?.error || 'Failed to save demographics.';
            }
          });
      },
      error: (err) => {
        this.saving = false;
        this.saveError = err.error?.error || err.message || 'Failed to create patient.';
      }
    });
  }

  removeEmergencyContact(idx: number): void {
    this.editForm.emergencyContacts?.splice(idx, 1);
  }

  retryLoad(): void {
    this.loadPatientData();
  }
}


