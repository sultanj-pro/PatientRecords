import { Injectable, createNgModuleRef, Injector, NgModuleRef, Type } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PluginRegistryService } from './plugin-registry.service';

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
  moduleRef: NgModuleRef<any> | null;
  componentType: Type<any> | null;
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
   * Track loading state and loaded modules
   */
  private loadedModules$ = new BehaviorSubject<Map<string, LoadedModule>>(new Map());

  constructor(private registryService: PluginRegistryService) {}

  /**
   * Load a module dynamically via Module Federation
   * 
   * This method:
   * 1. Loads registry to get module federation configuration
   * 2. Gets the remote module configuration from registry
   * 3. Loads the remoteEntry.js script
   * 4. Initializes the shared container
   * 5. Requests the exposed module
   * 6. Uses createNgModuleRef to instantiate the module
   * 7. Returns the module reference and component type for rendering
   * 
   * @param moduleName Name of the module (e.g., 'Demographics')
   * @returns Promise resolving to the loaded module reference
   * @throws Error if module not found in registry or loading fails
   */
  async loadModule(moduleName: string, injector: Injector): Promise<NgModuleRef<any>> {
    // Ensure registry is loaded
    await this.registryService.loadRegistry();
    
    // Get federation config from registry (replaces hardcoded Maps)
    const federationConfig = this.registryService.getModuleFederationConfig(moduleName);
    const moduleMetadata = this.registryService.getModuleByName(moduleName);
    
    if (!federationConfig || !moduleMetadata) {
      throw new Error(`Module '${moduleName}' not found in registry`);
    }

    const containerName = moduleMetadata.remoteName;

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
      // Load the remote entry script (remoteEntry from registry)
      await this.loadRemoteEntry(federationConfig.remoteEntry, containerName);
      
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
          console.warn(`Module '${moduleName}' init failed (may be already initialized):`, initError);
        }
      }
      
      // Get the factory for the module
      if (typeof container.get !== 'function') {
        throw new Error(`Container for '${moduleName}' has no 'get' method`);
      }

      const moduleFactory = await container.get(federationConfig.exposedModule);
      const ModuleClass = moduleFactory();
      
      // Create an instance of the module using createNgModuleRef
      const moduleRef = createNgModuleRef(ModuleClass, injector);
      
      // Get the root component from the module's declarations
      // Usually it's the first exported component
      let componentType: Type<any> | null = null;
      
      // Try to get it from module's bootstrap array (if defined)
      if (moduleRef.instance && (moduleRef.instance as any).bootstrap) {
        componentType = (moduleRef.instance as any).bootstrap[0];
      }
      
      // Fallback: try to find the component from the module metadata
      if (!componentType) {
        const metadata = (ModuleClass as any).ɵmod;
        if (metadata && metadata.declarations && metadata.declarations.length > 0) {
          // Usually the first declared component is the main one
          componentType = metadata.declarations[0];
        }
      }
      
      // Last resort: check exported components
      if (!componentType) {
        const metadata = (ModuleClass as any).ɵmod;
        if (metadata && metadata.exports && metadata.exports.length > 0) {
          for (const exported of metadata.exports) {
            if (exported.ɵcmp) { // It's a component
              componentType = exported;
              break;
            }
          }
        }
      }
      
      if (!componentType) {
        throw new Error(`Could not determine root component for module '${moduleName}'`);
      }
      
      // Update state with loaded module
      this.updateModuleState(moduleName, { 
        moduleRef,
        componentType,
        loaded: true,
        loading: false
      });
      
      console.log(`✓ Module '${moduleName}' loaded successfully`, { moduleRef, componentType });
      return moduleRef;
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
    const existing = current.get(moduleName);
    
    // If module doesn't exist yet, create a minimal entry during initial load
    // The full config will be set when loadModule completes
    if (!existing) {
      const minimalEntry: LoadedModule = {
        config: {
          name: moduleName,
          remoteEntry: '',
          exposedModule: '',
          componentName: ''
        },
        moduleRef: null,
        componentType: null,
        loaded: false,
        loading: false,
        error: null,
        ...updates
      };
      const newMap = new Map(current);
      newMap.set(moduleName, minimalEntry);
      this.loadedModules$.next(newMap);
      return;
    }
    
    const updated: LoadedModule = {
      ...existing,
      ...updates
    };
    
    const newMap = new Map(current);
    newMap.set(moduleName, updated);
    this.loadedModules$.next(newMap);
  }

  /**
   * Get all available module names from registry (regardless of enabled status)
   */
  getAvailableModules(): string[] {
    const allModules = this.registryService.getAllEnabledModules();
    return allModules.map(m => m.name);
  }

  /**
   * Check if a module is available in registry
   */
  isModuleConfigured(moduleName: string): boolean {
    const module = this.registryService.getModuleByName(moduleName);
    return module ? module.enabled : false;
  }

  /**
   * Set module configuration - Note: Dynamically adds module to registry (in-memory)
   * This allows runtime addition of modules via registry
   */
  setModuleConfig(moduleName: string, config: RemoteModuleConfig): void {
    // In a production system with a backend registry API, this would POST to the API
    // For now, this is a placeholder for dynamic module registration
    console.info(`Module '${moduleName}' configuration requested to be set. 
      To register new modules, update the registry.json and reload.`);
  }

  // Legacy methods for compatibility
  loadModulesForRole(role: string): Observable<LoadedModule[]> {
    return this.loadedModules$.pipe(
      map(modules => Array.from(modules.values()))
    );
  }

  /**
   * Get modules visible for a role - now from registry
   */
  getVisibleModulesForRole(role: string): any[] {
    return this.registryService.getAvailableModulesForRole(role);
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
