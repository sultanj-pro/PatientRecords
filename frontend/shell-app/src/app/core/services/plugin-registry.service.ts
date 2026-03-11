import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, firstValueFrom, timeout } from 'rxjs';

/**
 * Module metadata from registry - includes Module Federation configuration
 */
export interface ModuleMetadata {
  id: string;
  name: string;
  description: string;
  icon: string;
  path: string;
  enabled: boolean;
  roles: string[];
  order: number;
  version: string;
  framework: 'angular' | 'react';           // Framework type
  remoteEntry: string;              // Complete URL to remoteEntry.js (e.g., 'http://localhost:4201/remoteEntry.js')
  remoteName: string;               // Container name in Module Federation (e.g., 'demographicsApp')
  exposedModule: string;            // Module path exposed (e.g., './DemographicsModule')
}

/**
 * Complete registry structure
 */
export interface ModuleRegistry {
  version: string;
  description: string;
  modules: ModuleMetadata[];
}

/**
 * Plugin Registry Service
 * Manages dynamic loading of micro-frontend modules based on registry.json
 */
@Injectable({
  providedIn: 'root'
})
export class PluginRegistryService {
  private registryUrl = '/api/registry';
  private registry: ModuleRegistry | null = null;
  private loadedModules = new Map<string, any>();
  private registrySubject = new BehaviorSubject<ModuleRegistry | null>(null);
  private availableModulesSubject = new BehaviorSubject<ModuleMetadata[]>([]);

  constructor(private http: HttpClient) {}

  /**
   * Load module registry from file
   */
  async loadRegistry(): Promise<ModuleRegistry> {
    if (this.registry) {
      return this.registry;
    }

    try {
      console.log('Loading module registry from:', this.registryUrl);
      
      // Use Promise.race with timeout to prevent hanging requests
      const registryPromise = firstValueFrom(
        this.http.get<ModuleRegistry>(this.registryUrl)
      );
      
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Registry request timeout after 5 seconds')), 5000)
      );
      
      this.registry = await Promise.race([registryPromise, timeoutPromise]);
      this.registrySubject.next(this.registry);
      console.log('Module registry loaded successfully:', this.registry.modules.length, 'modules');
      return this.registry;
    } catch (error) {
      console.error('Failed to load module registry from', this.registryUrl, ':', error);
      // Provide default empty registry on error
      const defaultRegistry: ModuleRegistry = {
        version: '1.0.0',
        description: 'Default empty registry (failed to load)',
        modules: []
      };
      this.registry = defaultRegistry;
      this.registrySubject.next(defaultRegistry);
      return defaultRegistry;
    }
  }

  /**
   * Get registry as observable
   */
  getRegistry(): Observable<ModuleRegistry | null> {
    return this.registrySubject.asObservable();
  }

  /**
   * Get available modules as observable
   */
  getAvailableModules$(): Observable<ModuleMetadata[]> {
    return this.availableModulesSubject.asObservable();
  }

  /**
   * Update available modules for a user role
   */
  updateAvailableModulesForRole(userRole: string): ModuleMetadata[] {
    if (!this.registry) {
      console.warn('Registry not loaded yet');
      return [];
    }

    const available = this.registry.modules
      .filter(m => m.enabled && m.roles.includes(userRole))
      .sort((a, b) => a.order - b.order);

    this.availableModulesSubject.next(available);
    return available;
  }

  /**
   * Get available modules for a user role (synchronous)
   */
  getAvailableModulesForRole(userRole: string): ModuleMetadata[] {
    if (!this.registry) {
      return [];
    }

    return this.registry.modules
      .filter(m => m.enabled && m.roles.includes(userRole))
      .sort((a, b) => a.order - b.order);
  }

  /**
   * Get all enabled modules (regardless of role)
   */
  getAllEnabledModules(): ModuleMetadata[] {
    if (!this.registry) {
      return [];
    }

    return this.registry.modules
      .filter(m => m.enabled)
      .sort((a, b) => a.order - b.order);
  }

  /**
   * Get a specific module by ID
   */
  getModuleById(id: string): ModuleMetadata | undefined {
    if (!this.registry) {
      return undefined;
    }

    return this.registry.modules.find(m => m.id === id);
  }

  /**
   * Get module by path
   */
  getModuleByPath(path: string): ModuleMetadata | undefined {
    if (!this.registry) {
      return undefined;
    }

    return this.registry.modules.find(m => m.path === path);
  }

  /**
   * Check if a module is available for a specific role
   */
  isModuleAvailableForRole(moduleId: string, role: string): boolean {
    const module = this.getModuleById(moduleId);
    return module ? module.enabled && module.roles.includes(role) : false;
  }

  /**
   * Get module route path
   */
  getModuleRoute(moduleId: string): string {
    const module = this.getModuleById(moduleId);
    return module ? `/${module.path}` : '';
  }

  /**
   * Get first available module for a role
   */
  getFirstModuleForRole(userRole: string): ModuleMetadata | undefined {
    const available = this.getAvailableModulesForRole(userRole);
    return available.length > 0 ? available[0] : undefined;
  }

  /**
   * Reload registry (useful for dynamic configuration updates)
   */
  async reloadRegistry(): Promise<ModuleRegistry> {
    this.registry = null;
    this.loadedModules.clear();
    return this.loadRegistry();
  }

  /**
   * Enable/disable a module
   * Note: This is in-memory only; changes won't persist without backend support
   */
  toggleModule(moduleId: string, enabled: boolean): void {
    if (!this.registry) return;

    const module = this.getModuleById(moduleId);
    if (module) {
      module.enabled = enabled;
      this.registrySubject.next(this.registry);
    }
  }

  /**
   * Get a specific module by display name (e.g., 'Demographics')
   */
  getModuleByName(name: string): ModuleMetadata | undefined {
    if (!this.registry) {
      return undefined;
    }

    return this.registry.modules.find(m => m.name === name);
  }

  /**
   * Get module federation configuration for a module
   * Returns complete federation config directly from registry (no construction needed)
   * 
   * @param moduleName Display name of the module (e.g., 'Demographics')
   * @returns Object with remoteEntry URL, remoteName, and exposedModule from registry
   */
  getModuleFederationConfig(moduleName: string): {
    remoteEntry: string;
    remoteName: string;
    exposedModule: string;
  } | null {
    const module = this.getModuleByName(moduleName);
    if (!module) {
      console.warn(`Module '${moduleName}' not found in registry`);
      return null;
    }

    return {
      remoteEntry: module.remoteEntry,    // Complete URL from registry
      remoteName: module.remoteName,
      exposedModule: module.exposedModule
    };
  }
}
