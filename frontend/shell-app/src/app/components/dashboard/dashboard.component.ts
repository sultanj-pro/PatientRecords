import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PatientContextService } from '../../core/services/patient-context.service';
import { AuthService } from '../../core/services/auth.service';
import { getModulesForRole } from '../../core/config/role-module-config';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  patient: any = null;
  userRole: string = 'nurse';
  availableModules: any[] = [];
  selectedModule: string | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private patientContextService: PatientContextService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Get user role and load available modules
    const role = this.authService.getRole();
    this.userRole = role || 'nurse';
    this.availableModules = getModulesForRole(this.userRole);

    // Subscribe to patient changes and share with micro-frontends
    this.patientContextService
      .getSelectedPatient()
      .pipe(takeUntil(this.destroy$))
      .subscribe((patient) => {
        this.patient = patient;
        // Share patient context with micro-frontends
        this.sharePatientContext(patient);
      });

    // Watch for route changes to update selected module
    this.router.events.pipe(takeUntil(this.destroy$)).subscribe(() => {
      const urlSegments = this.router.url.split('/').filter(s => s);
      // Get the module name (after /dashboard/)
      // URL format: /dashboard/demographics/20003 -> module is 'demographics'
      if (urlSegments.length >= 2 && urlSegments[0] === 'dashboard') {
        this.selectedModule = urlSegments[1];
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Share patient context with micro-frontends via localStorage
   */
  private sharePatientContext(patient: any): void {
    if (!patient) {
      localStorage.removeItem('__PATIENT_CONTEXT__');
      return;
    }

    const patientContext = {
      patientId: patient.patientid || patient.id,
      firstName: patient.firstname || patient.firstName,
      lastName: patient.lastname || patient.lastName,
      dateOfBirth: patient.dateOfBirth || patient.dob,
      mrn: patient.mrn || patient.medicalRecordNumber,
      timestamp: new Date().getTime()
    };

    localStorage.setItem('__PATIENT_CONTEXT__', JSON.stringify(patientContext));
    console.log('Patient context shared:', patientContext);
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

  getPatientAge(): string {
    if (!this.patient || !this.patient.dateOfBirth) return 'N/A';
    const today = new Date();
    const dob = new Date(this.patient.dateOfBirth);
    
    if (isNaN(dob.getTime())) return 'N/A';
    
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    
    return age > 0 ? age.toString() : 'N/A';
  }

  getPatientGender(): string {
    return this.patient?.gender || 'N/A';
  }

  navigateToModule(moduleName: string): void {
    this.selectedModule = moduleName;
    this.router.navigate([`/dashboard/${moduleName}`]);
  }
}
