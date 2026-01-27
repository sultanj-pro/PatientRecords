import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Configuration for a remote module in the Module Federation setup
 */
export interface RemoteModuleConfig {
  name: string;
  remoteEntry: string;  // e.g., 'http://localhost:4201/remoteEntry.js'
  exposedModule: string; // e.g., './DemographicsComponent'
  componentName: string; // e.g., 'DemographicsComponent'
}

/**
 * State of a loaded module
 */
export interface LoadedModule {
  config: RemoteModuleConfig;
  module: any;
  component: any;
  loaded: boolean;
  loading: boolean;
  error: string | null;
}

/**
 * Module Loader Service
 * 
 * Handles dynamic loading of remote modules via Webpack Module Federation.
 * Uses the shared container pattern to load modules at runtime and inject
 * them into the shell application.
 * 
 * Architecture:
 * 1. Shell app defines remoteEntry URLs in webpack.config.js
 * 2. At runtime, ModuleLoaderService dynamically imports remoteEntry.js
 * 3. Gets the exposed component or module from the remote container
 * 4. Returns it for dynamic instantiation via ViewContainerRef
 */
@Injectable({
  providedIn: 'root'
})
export class ModuleLoaderService {

  /**
   * Mapping of module names to their remote container names
   * These match the 'name' property in the remote webpack.config.js
   */
  private containerNames: Map<string, string> = new Map([
    ['Demographics', 'demographicsApp'],
    ['Vitals', 'vitalsApp'],
    ['Labs', 'labsApp'],
    ['Medications', 'medicationsApp'],
    ['Visits', 'visitsApp']
  ]);

  /**
   * Mapping of module names to their remote locations and exposed components
   * These match the remotes configuration in webpack.config.js
   */
  private moduleConfigs: Map<string, RemoteModuleConfig> = new Map([
    ['Demographics', {
      name: 'demographics',
      remoteEntry: 'http://localhost:4201/remoteEntry.js',
      exposedModule: './DemographicsComponent',
      componentName: 'DemographicsComponent'
    }],
    ['Vitals', {
      name: 'vitals',
      remoteEntry: 'http://localhost:4202/remoteEntry.js',
      exposedModule: './VitalsComponent',
      componentName: 'VitalsComponent'
    }],
    ['Labs', {
      name: 'labs',
      remoteEntry: 'http://localhost:4203/remoteEntry.js',
      exposedModule: './LabsComponent',
      componentName: 'LabsComponent'
    }],
    ['Medications', {
      name: 'medications',
      remoteEntry: 'http://localhost:4204/remoteEntry.js',
      exposedModule: './MedicationsComponent',
      componentName: 'MedicationsComponent'
    }],
    ['Visits', {
      name: 'visits',
      remoteEntry: 'http://localhost:4205/remoteEntry.js',
      exposedModule: './VisitsComponent',
      componentName: 'VisitsComponent'
    }]
  ]);

  /**
   * Track loading state and loaded modules
   */
  private loadedModules$ = new BehaviorSubject<Map<string, LoadedModule>>(new Map());

  constructor() {}

  /**
   * Load a module dynamically via Module Federation
   * 
   * This method:
   * 1. Gets the remote module configuration
   * 2. Loads the remoteEntry.js script
   * 3. Initializes the shared container
   * 4. Requests the exposed module
   * 5. Returns the component or module for instantiation
   * 
   * @param moduleName Name of the module (e.g., 'Demographics')
   * @returns Promise resolving to the loaded component or module
   * @throws Error if module not found or loading fails
   */
  async loadModule(moduleName: string): Promise<any> {
    const config = this.moduleConfigs.get(moduleName);
    const containerName = this.containerNames.get(moduleName);
    
    if (!config || !containerName) {
      throw new Error(`Module '${moduleName}' not found in configuration`);
    }

    // Check if already loading
    const current = this.loadedModules$.value.get(moduleName);
    if (current?.loading) {
      throw new Error(`Module '${moduleName}' is already loading`);
    }

    // Set loading state
    this.updateModuleState(moduleName, { 
      loading: true, 
      error: null 
    });

    try {
      // Load the remote entry script
      await this.loadRemoteEntry(config.remoteEntry, containerName);
      
      // Get the container from the window
      const container = (window as any)[containerName];
      if (!container) {
        throw new Error(`Container '${containerName}' not found on window after loading remoteEntry`);
      }
      
      // Initialize the shared container if init exists
      if (typeof container.init === 'function') {
        try {
          await container.init(this.createSharedContainer());
        } catch (initError) {
          // Init might fail if shared scope is already initialized, which is OK
          console.warn(`Module '${moduleName}' init failed (may be already initialized):`, initError);
        }
      }
      
      // Get the factory
      if (typeof container.get !== 'function') {
        throw new Error(`Container for '${moduleName}' has no 'get' method`);
      }

      const factory = await container.get(config.exposedModule);
      const moduleExport = factory();
      
      // Update state with loaded module
      this.updateModuleState(moduleName, { 
        module: moduleExport,
        component: moduleExport,
        loaded: true,
        loading: false
      });
      
      console.log(`✓ Module '${moduleName}' loaded successfully`);
      return moduleExport;
    } catch (error) {
      const errorMessage = `Failed to load module '${moduleName}': ${error instanceof Error ? error.message : String(error)}`;
      this.updateModuleState(moduleName, { 
        loading: false,
        error: errorMessage
      });
      console.error(`✗ ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }

  /**
   * Get observable of loaded module
   */
  getLoadedModule$(moduleName: string): Observable<LoadedModule | undefined> {
    return this.loadedModules$.pipe(
      map(modules => modules.get(moduleName))
    );
  }

  /**
   * Load a remote entry script dynamically
   */
  private loadRemoteEntry(remoteEntry: string, containerName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if ((window as any)[containerName]) {
        console.log(`Container '${containerName}' already loaded from cache`);
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = remoteEntry;
      script.type = 'text/javascript';
      script.async = true;

      script.onload = () => {
        console.log(`Remote entry script loaded: ${remoteEntry}`);
        // Verify the container is available
        if ((window as any)[containerName]) {
          console.log(`Container '${containerName}' successfully loaded`);
          resolve();
        } else {
          reject(new Error(`Container '${containerName}' not found on window after loading ${remoteEntry}`));
        }
      };

      script.onerror = () => {
        reject(new Error(`Failed to load remote entry: ${remoteEntry}`));
      };

      document.head.appendChild(script);
    });
  }

  /**
   * Create a shared container for Module Federation
   */
  private createSharedContainer(): object {
    return {
      '@angular/core': { eager: true, singleton: true, strictVersion: false },
      '@angular/common': { eager: true, singleton: true, strictVersion: false },
      '@angular/platform-browser': { eager: true, singleton: true, strictVersion: false },
      'rxjs': { eager: true, singleton: true, strictVersion: false },
      '@patient-records/shared': { eager: true, singleton: true, strictVersion: false }
    };
  }

  /**
   * Update module state
   */
  private updateModuleState(moduleName: string, updates: Partial<LoadedModule>): void {
    const current = this.loadedModules$.value;
    const existing = current.get(moduleName) || {
      config: this.moduleConfigs.get(moduleName)!,
      module: null,
      component: null,
      loaded: false,
      loading: false,
      error: null
    };
    
    const updated: LoadedModule = {
      ...existing,
      ...updates
    };
    
    const newMap = new Map(current);
    newMap.set(moduleName, updated);
    this.loadedModules$.next(newMap);
  }

  /**
   * Get all configured module names
   */
  getAvailableModules(): string[] {
    return Array.from(this.moduleConfigs.keys());
  }

  /**
   * Check if a module is configured
   */
  isModuleConfigured(moduleName: string): boolean {
    return this.moduleConfigs.has(moduleName);
  }

  /**
   * Set module configuration
   */
  setModuleConfig(moduleName: string, config: RemoteModuleConfig): void {
    this.moduleConfigs.set(moduleName, config);
  }

  // Legacy methods for compatibility
  loadModulesForRole(role: string): Observable<LoadedModule[]> {
    return this.loadedModules$.pipe(
      map(modules => Array.from(modules.values()))
    );
  }

  getVisibleModulesForRole(role: string): any[] {
    return Array.from(this.moduleConfigs.values());
  }

  getAvailableModules$(): Observable<LoadedModule[]> {
    return this.loadedModules$.pipe(
      map(modules => Array.from(modules.values()))
    );
  }

  getLoadingModule$(): Observable<string | null> {
    return this.loadedModules$.pipe(
      map(modules => {
        for (const [name, mod] of modules.entries()) {
          if (mod.loading) return name;
        }
        return null;
      })
    );
  }

  unloadModule(moduleName: string): void {
    const modules = new Map(this.loadedModules$.value);
    modules.delete(moduleName);
    this.loadedModules$.next(modules);
  }
}
