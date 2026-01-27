import { 
  Component, 
  OnInit, 
  OnDestroy, 
  Input,
  ViewContainerRef,
  createNgModule
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
    private viewContainerRef: ViewContainerRef
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

    if (module.loaded) {
      // Already loaded, just update selection
      return;
    }

    // Mark as loading
    module.loading = true;
    module.error = null;

    // Load the module via Module Federation
    this.moduleLoaderService.loadModule(moduleName)
      .then(loadedModule => {
        module.loaded = true;
        module.loading = false;
        console.log(`✓ Module '${moduleName}' loaded successfully:`, loadedModule);
        
        // Optional: Inject the component into the view
        // This would require a container in the template with #moduleContainer
        // this.injectModuleComponent(moduleName, loadedModule);
      })
      .catch(error => {
        module.loading = false;
        module.error = error.message;
        console.error(`✗ Failed to load module '${moduleName}':`, error);
      });
  }

  /**
   * Inject a loaded module component into the view (future enhancement)
   * This would use ViewContainerRef to dynamically create the component
   */
  private injectModuleComponent(moduleName: string, moduleExport: any): void {
    try {
      // Clear previous component
      this.viewContainerRef.clear();

      // Get the component class from the module export
      const ComponentClass = moduleExport.Component || moduleExport;
      
      // Create an instance of the component
      // Note: This requires the component to be standalone or part of a module
      // For now, we'll just log success
      console.log(`Module component ready for injection: ${moduleName}`, ComponentClass);
      
      // TODO: Implement actual ViewContainerRef.createComponent() when
      // remote components are properly structured as standalone or modules
      
    } catch (error) {
      console.error(`Failed to inject module component:`, error);
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
}
