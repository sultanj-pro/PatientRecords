import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-medications',
  templateUrl: './medications.component.html',
  styleUrls: ['./medications.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class MedicationsComponent implements OnInit, OnDestroy {
  medications: any[] = [];
  activeMedications: any[] = [];
  historicalMedications: any[] = [];
  loading = true;
  showActive = true;
  selectedPatientId: string | null = null;
  private destroy$ = new Subject<void>();

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    // Get patient ID from window/parent or from URL
    this.selectedPatientId = this.getPatientIdFromContext();
    if (this.selectedPatientId) {
      this.loadMedicationsData();
    } else {
      this.loading = false;
    }

    // Listen for module selection events
    window.addEventListener('module-selected', this.onModuleSelected.bind(this));
    
    // Also listen for storage changes (for localStorage updates)
    window.addEventListener('storage', this.onStorageChanged.bind(this));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    window.removeEventListener('module-selected', this.onModuleSelected.bind(this));
    window.removeEventListener('storage', this.onStorageChanged.bind(this));
  }

  /**
   * Handle module selection event - reload data when medications tab is selected
   */
  private onModuleSelected(event: any): void {
    const detail = (event as CustomEvent).detail;
    if (detail?.moduleName?.toLowerCase() === 'medications') {
      console.log('Medications module selected - reloading data');
      this.selectedPatientId = this.getPatientIdFromContext();
      if (this.selectedPatientId) {
        this.loadMedicationsData();
      }
    }
  }

  /**
   * Handle localStorage changes - reload when patient context is updated
   */
  private onStorageChanged(event: StorageEvent): void {
    if (event.key === '__PATIENT_CONTEXT__' && event.newValue) {
      console.log('Patient context changed - reloading medications');
      this.selectedPatientId = this.getPatientIdFromContext();
      if (this.selectedPatientId) {
        this.loadMedicationsData();
      }
    }
  }

  private getPatientIdFromContext(): string | null {
    // Try to get from window.__PATIENT_CONTEXT__
    const context = (window as any).__PATIENT_CONTEXT__;
    if (context && context.patientId) {
      return String(context.patientId);
    }
    
    // Try to get from localStorage
    try {
      const storedContext = localStorage.getItem('__PATIENT_CONTEXT__');
      if (storedContext) {
        const context = JSON.parse(storedContext);
        if (context && context.patientId) {
          return String(context.patientId);
        }
      }
    } catch (e) {
      console.error('Failed to parse localStorage context:', e);
    }
    
    // Try to get from URL query params
    const params = new URLSearchParams(window.location.search);
    const patientId = params.get('patientId');
    if (patientId) {
      return patientId;
    }
    
    // Default to hardcoded for demo
    return null;
  }

  loadMedicationsData(): void {
    if (!this.selectedPatientId) {
      this.loading = false;
      return;
    }

    const apiUrl = `http://localhost:5001/api/patients/${this.selectedPatientId}/medications`;
    
    this.http.get<any[]>(apiUrl)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (meds) => {
          // Map backend field names to component field names
          this.medications = (meds || []).map(med => ({
            medicationName: med.name,
            dosage: med.dose,
            frequency: med.frequency,
            indication: med.indication,
            route: med.route,
            startDate: med.startDate,
            endDate: med.endDate,
            prescribedBy: med.prescribedBy,
            ...med // Keep original fields as fallback
          }));
          this.separateMedications();
          this.loading = false;
          console.log('Medications loaded:', this.medications);
        },
        error: (error) => {
          console.error('Failed to load medications:', error);
          this.loading = false;
          // Try with demo data if API fails
          this.loadDemoData();
        }
      });
  }

  private loadDemoData(): void {
    // Demo data for testing
    this.medications = [
      {
        name: 'Lisinopril',
        dose: '10mg',
        frequency: 'Once daily',
        indication: 'Hypertension',
        route: 'Oral',
        startDate: '2023-01-15',
        endDate: null
      },
      {
        name: 'Metformin',
        dose: '500mg',
        frequency: 'Twice daily',
        indication: 'Type 2 Diabetes',
        route: 'Oral',
        startDate: '2022-06-20',
        endDate: null
      },
      {
        name: 'Atorvastatin',
        dose: '20mg',
        frequency: 'Once daily',
        indication: 'High cholesterol',
        route: 'Oral',
        startDate: '2023-03-10',
        endDate: null
      }
    ];
    this.separateMedications();
  }

  separateMedications(): void {
    const now = new Date();
    this.activeMedications = this.medications.filter(med => {
      const endDate = med.endDate ? new Date(med.endDate) : null;
      return !endDate || endDate > now;
    });
    this.historicalMedications = this.medications.filter(med => {
      const endDate = med.endDate ? new Date(med.endDate) : null;
      return endDate && endDate <= now;
    });
  }

  getDisplayMedications(): any[] {
    return this.showActive ? this.activeMedications : this.historicalMedications;
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'Ongoing';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  }

  getMedicationDuration(med: any): string {
    const startDate = med.startDate ? new Date(med.startDate) : null;
    const endDate = med.endDate ? new Date(med.endDate) : null;
    
    if (!startDate) return 'Unknown';
    
    if (!endDate) {
      const duration = this.calculateDuration(startDate, new Date());
      return `Since ${startDate.toLocaleDateString()} (${duration})`;
    }
    
    const duration = this.calculateDuration(startDate, endDate);
    return `${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()} (${duration})`;
  }

  private calculateDuration(startDate: Date, endDate: Date): string {
    const days = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (days < 1) return 'Less than a day';
    if (days === 1) return '1 day';
    if (days < 30) return `${days} days`;
    
    const months = Math.floor(days / 30);
    if (months === 1) return '1 month';
    if (months < 12) return `${months} months`;
    
    const years = Math.floor(months / 12);
    return years === 1 ? '1 year' : `${years} years`;
  }

  getMedicationStatus(med: any): string {
    const endDate = med.endDate ? new Date(med.endDate) : null;
    if (!endDate || endDate > new Date()) {
      return 'Active';
    }
    return 'Discontinued';
  }
}
