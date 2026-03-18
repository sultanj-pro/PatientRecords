import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, filter, debounceTime, distinctUntilChanged } from 'rxjs/operators';
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
  patientNotFound: boolean = false;
  patientNotFoundId: string | null = null;
  userRole: string = 'nurse';
  availableModules: ModuleMetadata[] = [];
  selectedModule: string | null = null;
  selectedModuleMetadata: ModuleMetadata | null = null;
  currentPatientId: string | null = null; // Track patient ID from URL
  registryLoaded = false;
  private destroy$ = new Subject<void>();
  private lastLoadedPatientId: string | null = null; // Cache to avoid redundant API calls
  private lastSyncedUrl: string | null = null; // Track last synced URL to prevent duplicate processing
  private patientApiInProgress: string | null = null; // Track which patient API call is in progress
  private apiCallCount = 0; // Track total API calls for diagnostics
  private cacheHitCount = 0; // Track cache hits

  constructor(
    private patientContextService: PatientContextService,
    private authService: AuthService,
    private router: Router,
    private patientService: PatientService,
    private pluginRegistry: PluginRegistryService
  ) {}

  async ngOnInit(): Promise<void> {
    // IMPORTANT: Validate token with backend on dashboard load
    // This ensures stale tokens (from service restarts) are caught immediately
    const isTokenValid = await this.authService.validateTokenWithBackend().toPromise();
    if (!isTokenValid) {
      console.warn('[Dashboard] Token validation failed, redirecting to login');
      this.router.navigate(['/login']);
      return; // Stop initialization if token is invalid
    }

    // Set default user role immediately
    const role = this.authService.getRole();
    this.userRole = role || 'nurse';
    this.registryLoaded = true;

    // Load registry in background (don't block initialization)
    this.pluginRegistry.loadRegistry()
      .then(() => {
        this.availableModules = this.pluginRegistry.getAvailableModulesForRole(this.userRole);
        console.log('[Dashboard] Available modules loaded:', this.availableModules);
      })
      .catch((error) => {
        console.error('[Dashboard] Failed to load module registry:', error);
        this.availableModules = [];
      });

    // Subscribe to patient changes and share with micro-frontends
    this.patientContextService
      .getSelectedPatient()
      .pipe(takeUntil(this.destroy$))
      .subscribe((patient) => {
        this.patient = patient;
        // Update currentPatientId when patient is selected
        if (patient) {
          this.currentPatientId = (patient.patientid || '').toString();
          this.patientNotFound = false;
          this.patientNotFoundId = null;
          console.log('[Dashboard] Patient selected, updated currentPatientId:', this.currentPatientId);
        }
        // Share patient context with micro-frontends
        this.sharePatientContext(patient);
      });

    // Watch for route changes to update selected module
    console.log('[Dashboard] [INIT] Setting up router events subscription');
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        debounceTime(50),
        takeUntil(this.destroy$)
      )
      .subscribe((event: any) => {
        console.log('[Dashboard] [ROUTER-EVENT] NavigationEnd fired:', event.urlAfterRedirects);
        this.syncFromCurrentRoute();
      });

    // Also sync on initial load
    console.log('[Dashboard] [INIT] Calling initial syncFromCurrentRoute');
    this.syncFromCurrentRoute();
  }

  private syncFromCurrentRoute(): void {
    // Guard: if user is not authenticated, don't try to load patient data
    if (!this.authService.isAuthenticated()) {
      console.log('[Dashboard] User not authenticated, skipping syncFromCurrentRoute');
      return;
    }

    const urlSegments = this.router.url.split('/').filter(s => s);
    const currentUrl = this.router.url;
    
    // DEDUPLICATION: Skip if we've already processed this exact URL
    if (this.lastSyncedUrl === currentUrl) {
      console.log('[Dashboard] [DEDUPE-URL] Already processed URL:', currentUrl, '- skipping');
      return;
    }
    
    console.log(`[Dashboard] [SYNC-START] Processing NEW URL: ${currentUrl}`);
    this.lastSyncedUrl = currentUrl;
    
    // Get the module name (after /dashboard/)
    // URL format: /dashboard/demographics/20003 -> module is 'demographics', patient is '20003'
    if (urlSegments.length >= 2 && urlSegments[0] === 'dashboard') {
      this.selectedModule = urlSegments[1];
      this.updateSelectedModuleMetadata();
      console.log('[Dashboard] Selected module set to:', this.selectedModule);
    }

    // Extract patient ID from URL and preserve it
    const patientIdFromUrl = urlSegments.length >= 3 ? urlSegments[2] : null;
    if (patientIdFromUrl && patientIdFromUrl !== 'patient') {
      this.currentPatientId = patientIdFromUrl;
      console.log('[Dashboard] Patient ID extracted from URL:', this.currentPatientId);
      this.syncPatientFromUrl(patientIdFromUrl);
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
    console.log('[Dashboard] [SYNC-API] syncPatientFromUrl called with patientId:', patientId, {
      lastLoadedPatientId: this.lastLoadedPatientId,
      patientApiInProgress: this.patientApiInProgress
    });
    
    // Check cache: have we already successfully loaded this patient?
    if (this.lastLoadedPatientId === patientId) {
      this.cacheHitCount++;
      console.log(`[Dashboard] [CACHE-HIT-#${this.cacheHitCount}] Patient ${patientId} already loaded`);
      return;
    }

    // Check if API call is already in progress for this patient
    // This prevents multiple simultaneous requests for the same patient
    if (this.patientApiInProgress === patientId) {
      console.log(`[Dashboard] [API-IN-PROGRESS] Patient ${patientId} API call already in progress, skipping duplicate`);
      return;
    }

    const currentPatient = this.patientContextService.getCurrentPatient();
    const currentId = currentPatient?.patientid?.toString();
    
    // If current patient already matches, just update cache
    if (currentId === patientId) {
      console.log('[Dashboard] Patient already loaded (from service), updating cache only');
      this.lastLoadedPatientId = patientId;
      return;
    }

    // Make API call - mark as in-progress
    this.patientApiInProgress = patientId;
    this.apiCallCount++;
    console.log(`[Dashboard] [API-CALL-#${this.apiCallCount}] Starting API call for patient: ${patientId}`);
    
    this.patientService.getPatientById(Number(patientId)).subscribe({
      next: (patient) => {
        console.log('[Dashboard] Patient API response received:', patient.patientid);
        this.lastLoadedPatientId = patientId;
        this.patientApiInProgress = null;
        this.patientNotFound = false;
        this.patientNotFoundId = null;
        this.patientContextService.setSelectedPatient(patient);
        this.sharePatientContext(patient);
      },
      error: (err) => {
        console.error('[Dashboard] Failed to load patient from URL:', err);
        this.patientApiInProgress = null;
        this.patientNotFound = true;
        this.patientNotFoundId = patientId;
        this.patient = null;
        this.patientContextService.clearPatient();
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
   * Navigate to the module while preserving the current patient ID
   */
  onModuleSelected(module: ModuleMetadata): void {
    this.selectedModule = module.id;
    this.selectedModuleMetadata = module;
    console.log('[Dashboard] Module selected:', module.id, 'Current patient ID:', this.currentPatientId);
    
    // If we have a patient ID, navigate to the module with that patient ID
    if (this.currentPatientId) {
      const navigationUrl = `/dashboard/${module.path}/${this.currentPatientId}`;
      console.log('[Dashboard] Navigating to:', navigationUrl);
      this.router.navigateByUrl(navigationUrl);
    } else {
      console.warn('[Dashboard] No patient ID available for navigation');
    }
  }

  /**
   * Handle logout from side navigation
   */
  onLogout(): void {
    // Trigger component destruction first (which cleans up subscriptions)
    this.destroy$.next();
    this.destroy$.complete();
    
    // Then clear auth
    this.authService.logout();
    
    // Finally navigate to login
    // Use setTimeout to ensure Angular has time to clean up the component
    setTimeout(() => {
      this.router.navigate(['/login']);
    }, 0);
  }

  /**
   * Update the selected module's metadata based on current selectedModule
   */
  private updateSelectedModuleMetadata(): void {
    if (!this.selectedModule) {
      this.selectedModuleMetadata = null;
      return;
    }
    
    const module = this.availableModules.find(m => m.id === this.selectedModule);
    this.selectedModuleMetadata = module || null;
    console.log('[Dashboard] Module metadata updated:', this.selectedModuleMetadata);
  }
}

