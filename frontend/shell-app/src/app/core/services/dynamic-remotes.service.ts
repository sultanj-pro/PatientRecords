import { Injectable } from '@angular/core';
import { RegistryService, RegistryModule } from './registry.service';

declare const __webpack_share_scopes__: any;

/**
 * Service for dynamically loading and managing Module Federation remotes
 * 
 * This service handles the runtime loading of remote modules without
 * needing them to be defined at build time in webpack.config.js
 */
@Injectable({
  providedIn: 'root'
})
export class DynamicRemotesService {
  private loadedRemotes = new Map<string, boolean>();

  constructor(private registryService: RegistryService) {}

  /**
   * Initialize dynamic remotes for all enabled modules
   * This should be called once during app bootstrap
   */
  async initializeDynamicRemotes(): Promise<void> {
    console.log('[DynamicRemotesService] Initializing dynamic remotes...');
    
    const modules = this.registryService.getEnabledModules();
    console.log(`[DynamicRemotesService] Found ${modules.length} enabled modules`);

    for (const module of modules) {
      try {
        await this.loadRemoteModule(module);
      } catch (error) {
        console.error(`[DynamicRemotesService] Failed to load remote for ${module.id}:`, error);
        // Continue loading other modules even if one fails
      }
    }

    console.log('[DynamicRemotesService] Dynamic remotes initialization complete');
  }

  /**
   * Load a single remote module entry point
   * Uses dynamic script injection to load the remote's remoteEntry.js
   */
  private async loadRemoteModule(module: RegistryModule): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.loadedRemotes.has(module.id)) {
        console.log(`[DynamicRemotesService] Remote ${module.id} already loaded`);
        resolve();
        return;
      }

      const remoteEntry = this.registryService.getModuleRemoteEntry(module.id);
      if (!remoteEntry) {
        console.warn(`[DynamicRemotesService] No remote entry URL for module ${module.id}`);
        resolve();
        return;
      }

      console.log(`[DynamicRemotesService] Loading remote entry: ${remoteEntry}`);

      const script = document.createElement('script');
      script.src = remoteEntry;
      script.type = 'text/javascript';
      script.async = true;

      script.onload = () => {
        console.log(`[DynamicRemotesService] Remote entry loaded for ${module.id}`);
        this.loadedRemotes.set(module.id, true);
        resolve();
      };

      script.onerror = () => {
        const error = `Failed to load remote entry from ${remoteEntry}`;
        console.error(`[DynamicRemotesService] ${error}`);
        reject(new Error(error));
      };

      document.head.appendChild(script);
    });
  }

  /**
   * Load a module dynamically using webpack Module Federation
   * This is called when a route is activated for a lazy-loaded module
   */
  async loadModule(moduleId: string, moduleName: string): Promise<any> {
    const module = this.registryService.getModule(moduleId);
    if (!module) {
      throw new Error(`Module ${moduleId} not found in registry`);
    }

    if (!module.enabled) {
      throw new Error(`Module ${moduleId} is not enabled`);
    }

    try {
      console.log(`[DynamicRemotesService] Loading module ${moduleId}/${moduleName}`);
      
      // Ensure the remote is loaded
      if (!this.loadedRemotes.has(moduleId)) {
        await this.loadRemoteModule(module);
      }

      // Dynamically import the module using webpack's __webpack_require__
      // @ts-ignore - webpack global
      const container = window[module.remoteName];
      if (!container) {
        throw new Error(`Container ${module.remoteName} not found for module ${moduleId}`);
      }

      // Initialize the container if needed
      if (!container.__webpack_share_scopes__) {
        // @ts-ignore
        container.__webpack_share_scopes__ = __webpack_share_scopes__;
      }

      // Get the factory for the exposed module
      await container.init(__webpack_share_scopes__);
      const factory = await container.get(module.exposedModule);
      
      const moduleInstance = factory();
      console.log(`[DynamicRemotesService] Module ${moduleId} loaded successfully:`, moduleInstance);
      
      return moduleInstance;
    } catch (error) {
      console.error(`[DynamicRemotesService] Failed to load module ${moduleId}:`, error);
      throw error;
    }
  }

  /**
   * Get the remote name for a module (for dynamic imports)
   */
  getRemoteName(moduleId: string): string | null {
    const module = this.registryService.getModule(moduleId);
    return module ? module.remoteName : null;
  }

  /**
   * Check if a remote is loaded
   */
  isRemoteLoaded(moduleId: string): boolean {
    return this.loadedRemotes.has(moduleId);
  }

  /**
   * Get all loaded remotes
   */
  getLoadedRemotes(): string[] {
    return Array.from(this.loadedRemotes.keys());
  }
}
