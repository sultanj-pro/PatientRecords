import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-vitals',
  templateUrl: './vitals.component.html',
  styleUrls: ['./vitals.component.css']
})
export class VitalsComponent implements OnInit, OnDestroy {
  vitals: any[] = [];
  loading = true;
  private destroy$ = new Subject<void>();

  constructor() { }

  ngOnInit(): void {
    this.loadVitalsData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadVitalsData(): void {
    // TODO: Inject PatientContextService and load vitals from patient context
    // this.patientService.getPatientVitals(patientId)
    //   .pipe(takeUntil(this.destroy$))
    //   .subscribe(vitals => {
    //     this.vitals = vitals;
    //     this.loading = false;
    //   });
    
    // Simulate async loading
    setTimeout(() => {
      this.loading = false;
    }, 500);
  }

  getLatestVital(field: string): string | number {
    if (this.vitals && this.vitals.length > 0) {
      const latest = this.vitals[0];
      return latest[field] || 'N/A';
    }
    return 'N/A';
  }

  getVitalTrend(field: string): string {
    if (this.vitals && this.vitals.length >= 2) {
      const latest = this.vitals[0][field];
      const previous = this.vitals[1][field];
      
      if (latest > previous) return '↑';
      if (latest < previous) return '↓';
      return '→';
    }
    return '';
  }

  getTemperatureStatus(temp: number): string {
    if (temp < 36.1) return 'Low';
    if (temp > 37.2) return 'High';
    return 'Normal';
  }

  getBloodPressureStatus(systolic: number, diastolic: number): string {
    if (systolic < 90 || diastolic < 60) return 'Low';
    if (systolic >= 140 || diastolic >= 90) return 'High';
    return 'Normal';
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}
