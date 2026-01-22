import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

/**
 * Demographics Component
 * Displays patient demographic information
 * Part of the Demographics Micro-Frontend Module
 */
@Component({
  selector: 'app-demographics',
  templateUrl: './demographics.component.html',
  styleUrls: ['./demographics.component.css']
})
export class DemographicsComponent implements OnInit, OnDestroy {
  patient: any = null;
  loading: boolean = true;
  private destroy$ = new Subject<void>();

  constructor() {}

  ngOnInit(): void {
    // Will receive patient data from shell app via shared services
    this.loadPatientData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadPatientData(): void {
    // Placeholder - will be connected to PatientContextService
    // when module federation is fully integrated
    this.loading = false;
  }

  getFullName(): string {
    if (!this.patient) return 'N/A';
    return `${this.patient.firstName} ${this.patient.lastName}`;
  }

  getMRN(): string {
    return this.patient?.mrn || 'N/A';
  }

  getAge(): number | string {
    if (!this.patient?.dateOfBirth) return 'N/A';
    const birthDate = new Date(this.patient.dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }
}
