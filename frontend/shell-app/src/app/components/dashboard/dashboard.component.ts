import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PatientContextService } from '../../core/services/patient-context.service';
import { ModulesDashboardComponent } from '../../shared/components/modules-dashboard/modules-dashboard.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ModulesDashboardComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  patient: any = null;
  private destroy$ = new Subject<void>();

  constructor(
    private patientContextService: PatientContextService
  ) {}

  ngOnInit(): void {
    // Subscribe to patient changes
    this.patientContextService
      .getSelectedPatient()
      .pipe(takeUntil(this.destroy$))
      .subscribe((patient) => {
        this.patient = patient;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getFullName(): string {
    if (!this.patient) return 'Patient';
    return `${this.patient.firstname || ''} ${this.patient.lastname || ''}`;
  }

  getMRN(): string {
    return this.patient?.mrn || 'N/A';
  }

  getDOB(): string {
    if (!this.patient) return 'N/A';
    return new Date(this.patient.dateOfBirth || '').toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}
