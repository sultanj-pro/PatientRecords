import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

export interface LoadedModule {
  config: any;
  module: any;
  component: any;
  loaded: boolean;
  loading: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class ModuleLoaderService {
  
  loadModule(moduleName: string): Observable<LoadedModule> {
    const module: LoadedModule = {
      config: { name: moduleName },
      module: null,
      component: null,
      loaded: true,
      loading: false,
      error: null
    };
    return of(module);
  }

  loadModulesForRole(role: string): Observable<LoadedModule[]> {
    return of([]);
  }

  getVisibleModulesForRole(role: string): any[] {
    return [];
  }

  getAvailableModules$(): Observable<LoadedModule[]> {
    return of([]);
  }

  getLoadingModule$(): Observable<string | null> {
    return of(null);
  }

  unloadModule(moduleName: string): void {
    // placeholder
  }
}
