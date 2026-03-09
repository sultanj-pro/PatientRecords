import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

export interface RegistryModule {
  id: string;
  name: string;
  description: string;
  icon: string;
  path: string;
  enabled: boolean;
  roles: string[];
  order: number;
  version: string;
  port: number;
  remoteName: string;
  exposedModule: string;
}

export interface Registry {
  version: string;
  description: string;
  baseUrl: string;
  modules: RegistryModule[];
}

@Injectable({
  providedIn: 'root'
})
export class RegistryService {
  private registryUrl = 'http://localhost:5000/registry.json';
  private registrySubject$ = new BehaviorSubject<Registry | null>(null);
  private modulesCache: RegistryModule[] = [];

  registry$ = this.registrySubject$.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Load registry from server or cache
   */
  loadRegistry(): Observable<Registry> {
    const cached = this.registrySubject$.value;
    if (cached) {
      return of(cached);
    }

    return this.http.get<Registry>(this.registryUrl).pipe(
      tap((registry) => {
        console.log('[RegistryService] Registry loaded:', registry);
        this.registrySubject$.next(registry);
        this.modulesCache = registry.modules;
      }),
      catchError((error) => {
        console.error('[RegistryService] Failed to load registry:', error);
        throw error;
      })
    );
  }

  /**
   * Get all modules
   */
  getAllModules(): RegistryModule[] {
    return this.modulesCache;
  }

  /**
   * Get enabled modules only
   */
  getEnabledModules(): RegistryModule[] {
    return this.modulesCache.filter(m => m.enabled);
  }

  /**
   * Get modules available for a specific role
   */
  getModulesForRole(role: string): RegistryModule[] {
    return this.modulesCache.filter(m => m.enabled && m.roles.includes(role));
  }

  /**
   * Get a single module by ID
   */
  getModule(moduleId: string): RegistryModule | undefined {
    return this.modulesCache.find(m => m.id === moduleId);
  }

  /**
   * Get module remote entry URL
   */
  getModuleRemoteEntry(moduleId: string): string | null {
    const module = this.getModule(moduleId);
    if (!module) return null;
    const baseUrl = this.registrySubject$.value?.baseUrl || 'http://localhost';
    return `${baseUrl}:${module.port}/remoteEntry.js`;
  }

  /**
   * Get all modules sorted by order
   */
  getModulesSorted(): RegistryModule[] {
    return [...this.modulesCache].sort((a, b) => a.order - b.order);
  }

  /**
   * Check if module is available
   */
  isModuleAvailable(moduleId: string): boolean {
    const module = this.getModule(moduleId);
    return module ? module.enabled : false;
  }
}
