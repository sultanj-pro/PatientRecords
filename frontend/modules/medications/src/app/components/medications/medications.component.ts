import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-medications',
  templateUrl: './medications.component.html',
  styleUrls: ['./medications.component.css']
})
export class MedicationsComponent implements OnInit, OnDestroy {
  medications: any[] = [];
  activeMedications: any[] = [];
  historicalMedications: any[] = [];
  loading = true;
  showActive = true;
  private destroy$ = new Subject<void>();

  constructor() { }

  ngOnInit(): void {
    this.loadMedicationsData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadMedicationsData(): void {
    // TODO: Inject PatientService and load medications from patient context
    // this.patientService.getPatientMedications(patientId)
    //   .pipe(takeUntil(this.destroy$))
    //   .subscribe(meds => {
    //     this.medications = meds;
    //     this.separateMedications();
    //     this.loading = false;
    //   });
    
    // Simulate async loading
    setTimeout(() => {
      this.separateMedications();
      this.loading = false;
    }, 500);
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
