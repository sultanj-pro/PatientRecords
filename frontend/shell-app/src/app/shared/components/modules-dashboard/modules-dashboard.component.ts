import { 
  Component, 
  OnInit, 
  OnDestroy, 
  Input,
  ViewContainerRef,
  ViewChild,
  EnvironmentInjector,
  Injector,
  createComponent
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { PatientContextService } from '../../../core/services/patient-context.service';
import { ModuleLoaderService } from '../../../core/services/module-loader.service';
import { getModulesForRole, ModuleConfig } from '../../../core/config/role-module-config';

interface ModuleDisplay extends ModuleConfig {
  loaded: boolean;
  loading: boolean;
  error: string | null;
  order: number;
}

@Component({
  selector: 'app-modules-dashboard',
  templateUrl: './modules-dashboard.component.html',
  styleUrls: ['./modules-dashboard.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class ModulesDashboardComponent implements OnInit, OnDestroy {
  @Input() patient: any = null;
  @ViewChild('moduleContainer', { read: ViewContainerRef }) moduleContainer!: ViewContainerRef;

  modules: ModuleDisplay[] = [];
  selectedModule: string | null = null;
  selectedModuleData: ModuleDisplay | null = null;
  userRole: string = 'nurse'; // default role
  
  // Track component lifecycle
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private patientContextService: PatientContextService,
    private moduleLoaderService: ModuleLoaderService,
    private injector: Injector
  ) {}

  ngOnInit(): void {
    // Get user role
    const role = this.authService.getRole();
    this.userRole = role || 'nurse';

    // Load modules for user's role
    this.loadModulesForRole(this.userRole);

    // Subscribe to patient context changes
    this.patientContextService.getSelectedPatient()
      .pipe(takeUntil(this.destroy$))
      .subscribe(patient => {
        this.patient = patient;
        // Share patient context with micro-frontends
        this.sharePatientContextWithMicroFrontends(patient);
      });

    // Select first module by default
    if (this.modules.length > 0) {
      this.selectModule(this.modules[0].name);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load modules based on user role
   */
  private loadModulesForRole(role: string): void {
    const availableModules = getModulesForRole(role);
    this.modules = availableModules.map((module, index) => ({
      ...module,
      loaded: false,
      loading: false,
      error: null,
      order: index
    }));
  }

  /**
   * Select and load a module dynamically via Module Federation
   */
  selectModule(moduleName: string): void {
    this.selectedModule = moduleName;
    const module = this.modules.find(m => m.name === moduleName);
    
    if (!module) {
      console.error(`Module ${moduleName} not found`);
      return;
    }

    this.selectedModuleData = module;

    // Always trigger data reload when module is selected
    this.notifyMicroFrontendOfSelection(moduleName);

    if (module.loaded) {
      // Already loaded, render the component
      this.renderModule(moduleName, module);
      return;
    }

    // Mark as loading
    module.loading = true;
    module.error = null;

    // Load the module via Module Federation
    this.moduleLoaderService.loadModule(moduleName, this.injector)
      .then(moduleRef => {
        module.loaded = true;
        module.loading = false;
        console.log(`✓ Module '${moduleName}' loaded successfully:`, moduleRef);
        
        // Render the loaded component
        this.renderModule(moduleName, module);
      })
      .catch(error => {
        module.loading = false;
        module.error = error.message;
        console.error(`✗ Failed to load module '${moduleName}':`, error);
      });
  }

  /**
   * Render the loaded component in the module container
   */
  private renderModule(moduleName: string, moduleData: ModuleDisplay): void {
    if (!this.moduleContainer) {
      console.warn('Module container not available yet');
      return;
    }

    try {
      // Get the loaded module from the service
      this.moduleLoaderService.getLoadedModule$(moduleName)
        .pipe(takeUntil(this.destroy$))
        .subscribe(loadedModule => {
          if (!loadedModule || !loadedModule.moduleRef || !loadedModule.componentType) {
            console.warn(`No loaded module found for '${moduleName}'`);
            return;
          }

          try {
            // Clear previous component
            this.moduleContainer.clear();

            const moduleRef = loadedModule.moduleRef;
            const componentType = loadedModule.componentType;
            
            console.log(`Creating component '${moduleName}' with type:`, componentType);
            
            // Create the component using the module's injector
            const componentRef = createComponent(componentType, {
              environmentInjector: moduleRef.injector
            });
            
            // Attach to view
            this.moduleContainer.insert(componentRef.hostView);
            
            console.log(`✓ Component '${moduleName}' rendered successfully`);
          } catch (renderError) {
            console.error(`Failed to render component '${moduleName}':`, renderError);
            moduleData.error = `Render failed: ${renderError instanceof Error ? renderError.message : String(renderError)}`;
          }
        });
    } catch (error) {
      console.error(`Failed to setup module rendering for '${moduleName}':`, error);
      moduleData.error = `Setup failed: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  getModuleIcon(moduleName: string): string {
    const module = this.modules.find(m => m.name === moduleName);
    return module?.icon || '📦';
  }

  getModuleDescription(moduleName: string): string {
    const module = this.modules.find(m => m.name === moduleName);
    return module?.description || '';
  }

  isModuleSelected(moduleName: string): boolean {
    return this.selectedModule === moduleName;
  }

  /**
   * Get loading state for a module
   */
  isModuleLoading(moduleName: string): boolean {
    const module = this.modules.find(m => m.name === moduleName);
    return module?.loading || false;
  }

  /**
   * Get error message for a module
   */
  getModuleError(moduleName: string): string | null {
    const module = this.modules.find(m => m.name === moduleName);
    return module?.error || null;
  }

  /**
   * Check if a module is loaded
   */
  isModuleLoaded(moduleName: string): boolean {
    const module = this.modules.find(m => m.name === moduleName);
    return module?.loaded || false;
  }

  /**
   * Get the port number for a module based on order
   */
  getModulePort(moduleName: string): number {
    const module = this.modules.find(m => m.name === moduleName);
    return module ? 4201 + module.order : 4200;
  }

  /**
   * Notify micro-frontend that it has been selected (for data reloading)
   */
  private notifyMicroFrontendOfSelection(moduleName: string): void {
    // Set a flag in localStorage to indicate which module is active
    localStorage.setItem('__ACTIVE_MODULE__', moduleName);
    localStorage.setItem('__MODULE_SELECTED_AT__', new Date().getTime().toString());
    
    // Dispatch a global event that all micro-frontends can listen to
    window.dispatchEvent(new CustomEvent('module-selected', {
      detail: { 
        moduleName,
        timestamp: new Date().getTime()
      }
    }));
    
    console.log(`Module '${moduleName}' selected - triggering reload in micro-frontend`);
  }

  /**
   * Share patient context with micro-frontends via window object and localStorage
   */
  private sharePatientContextWithMicroFrontends(patient: any): void {
    if (!patient) {
      // Clear context
      (window as any).__PATIENT_CONTEXT__ = null;
      localStorage.removeItem('__PATIENT_CONTEXT__');
      return;
    }

    // Create patient context object
    const patientContext = {
      patientId: patient.patientid || patient.id,
      firstName: patient.firstname || patient.firstName,
      lastName: patient.lastname || patient.lastName,
      dateOfBirth: patient.dateOfBirth || patient.dob,
      mrn: patient.mrn || patient.medicalRecordNumber,
      timestamp: new Date().getTime()
    };

    // Share with all windows/iframes
    (window as any).__PATIENT_CONTEXT__ = patientContext;
    
    // Also store in localStorage for micro-frontends to access
    localStorage.setItem('__PATIENT_CONTEXT__', JSON.stringify(patientContext));
    
    // Also broadcast via window events for any listeners
    window.dispatchEvent(new CustomEvent('patient-context-changed', {
      detail: patientContext
    }));

    console.log('Patient context shared with micro-frontends:', patientContext);
  }
}
