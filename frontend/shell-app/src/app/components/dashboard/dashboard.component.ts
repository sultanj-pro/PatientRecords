import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PatientContextService } from '../../core/services/patient-context.service';
import { AuthService } from '../../core/services/auth.service';
import { PluginRegistryService, ModuleMetadata } from '../../core/services/plugin-registry.service';
import { SideNavigationComponent } from '../side-navigation/side-navigation.component';
import { PatientService } from '../../core/services/patient.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, SideNavigationComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  patient: any = null;
  userRole: string = 'nurse';
  availableModules: ModuleMetadata[] = [];
  selectedModule: string | null = null;
  registryLoaded = false;
  private destroy$ = new Subject<void>();

  constructor(
    private patientContextService: PatientContextService,
    private authService: AuthService,
    private router: Router,
    private patientService: PatientService,
    private pluginRegistry: PluginRegistryService
  ) {}

  async ngOnInit(): Promise<void> {
    // Load registry and get available modules for user
    try {
      await this.pluginRegistry.loadRegistry();
      const role = this.authService.getRole();
      this.userRole = role || 'nurse';
      this.availableModules = this.pluginRegistry.getAvailableModulesForRole(this.userRole);
      this.registryLoaded = true;
      console.log('[Dashboard] Available modules loaded:', this.availableModules);
    } catch (error) {
      console.error('[Dashboard] Failed to load module registry:', error);
      this.registryLoaded = false;
    }

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
      this.syncFromCurrentRoute();
    });

    // Also sync on initial load
    this.syncFromCurrentRoute();
  }

  private syncFromCurrentRoute(): void {
    const urlSegments = this.router.url.split('/').filter(s => s);
    console.log('[Dashboard] syncFromCurrentRoute called. URL:', this.router.url, 'Segments:', urlSegments);
    
    // Get the module name (after /dashboard/)
    // URL format: /dashboard/demographics/20003 -> module is 'demographics'
    if (urlSegments.length >= 2 && urlSegments[0] === 'dashboard') {
      this.selectedModule = urlSegments[1];
      console.log('[Dashboard] Selected module set to:', this.selectedModule);
    }

    const patientId = urlSegments.length >= 3 ? urlSegments[2] : null;
    console.log('[Dashboard] PatientId extracted from URL:', patientId);
    
    if (patientId) {
      this.syncPatientFromUrl(patientId);
    } else {
      console.log('[Dashboard] No patientId in URL');
    }
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
    
    // Broadcast event so micro-frontends can listen and reload
    window.dispatchEvent(new CustomEvent('patient-context-changed', {
      detail: patientContext
    }));
    
    console.log('Patient context shared:', patientContext);
  }

  getFullName(): string {
    if (!this.patient) return 'Patient';
    return `${this.patient.firstname || ''} ${this.patient.lastname || ''}`;
  }

  getMRN(): string {
    const demographics = this.patient?.demographics;
    return demographics?.mrn || 
           this.patient?.mrn || 
           this.patient?.patientid?.toString() || 'N/A';
  }

  getDOB(): string {
    if (!this.patient) return 'N/A';
    const demographics = this.patient?.demographics;
    const dobValue = demographics?.dateOfBirth || this.patient.dateOfBirth;
    if (!dobValue) return 'N/A';
    
    const dob = new Date(dobValue);
    if (isNaN(dob.getTime())) return 'N/A';
    
    return dob.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getPatientAge(): string {
    if (!this.patient) return 'N/A';
    const demographics = this.patient?.demographics;
    const dobValue = demographics?.dateOfBirth || this.patient.dateOfBirth;
    if (!dobValue) return 'N/A';
    
    const dob = new Date(dobValue);
    if (isNaN(dob.getTime())) return 'N/A';
    
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    
    return age > 0 ? age.toString() : 'N/A';
  }

  getPatientGender(): string {
    const demographics = this.patient?.demographics;
    return demographics?.gender || this.patient?.gender || 'N/A';
  }

  getPatientAllergies(): string {
    const allergies = this.patient?.allergies || [];
    if (allergies.length === 0) {
      return 'No known allergies';
    }
    return allergies.map((a: any) => a.substance).join(', ');
  }

  getHighestAllergySeverity(): string {
    const allergies = this.patient?.allergies || [];
    if (allergies.length === 0) return 'none';
    
    const severityOrder = { 'life-threatening': 4, 'severe': 3, 'moderate': 2, 'mild': 1 };
    let highest = 'none';
    let highestScore = 0;
    
    allergies.forEach((a: any) => {
      const score = severityOrder[a.severity as keyof typeof severityOrder] || 0;
      if (score > highestScore) {
        highestScore = score;
        highest = a.severity;
      }
    });
    
    return highest;
  }

  navigateToModule(moduleName: string): void {
    this.selectedModule = moduleName;
    const patientId = this.getCurrentPatientId();
    if (patientId) {
      this.router.navigateByUrl(`/dashboard/${moduleName}/${patientId}`);
    } else {
      this.router.navigateByUrl(`/dashboard/${moduleName}`);
    }
  }

  private syncPatientFromUrl(patientId: string): void {
    console.log('[Dashboard] syncPatientFromUrl called with patientId:', patientId);
    
    const currentPatient = this.patientContextService.getCurrentPatient();
    const currentId = currentPatient?.patientid?.toString();
    console.log('[Dashboard] Current patient ID:', currentId, 'URL patient ID:', patientId);
    
    // Always fetch if different patient, to ensure fresh data from backend
    if (currentId === patientId) {
      console.log('[Dashboard] PatientId matches current, skipping load');
      return;
    }

    console.log('[Dashboard] Calling patientService.getPatientById for patient:', patientId);
    this.patientService.getPatientById(Number(patientId)).subscribe({
      next: (patient) => {
        console.log('[Dashboard] Patient loaded successfully:', patient);
        this.patientContextService.setSelectedPatient(patient);
        // Ensure localStorage is updated for modules listening to patient changes
        this.sharePatientContext(patient);
      },
      error: (err) => {
        console.error('[Dashboard] Failed to load patient from URL:', err);
        console.error('[Dashboard] Error status:', err?.status);
        console.error('[Dashboard] Error message:', err?.message);
      }
    });
  }

  private getCurrentPatientId(): string | null {
    const currentPatient = this.patientContextService.getCurrentPatient();
    if (!currentPatient) return null;
    return (currentPatient.patientid || (currentPatient as any).id || '').toString();
  }

  /**
   * Handle module selection from side navigation
   */
  onModuleSelected(module: ModuleMetadata): void {
    this.selectedModule = module.id;
    console.log('[Dashboard] Module selected:', module.id );
  }

  /**
   * Handle logout from side navigation
   */
  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}

