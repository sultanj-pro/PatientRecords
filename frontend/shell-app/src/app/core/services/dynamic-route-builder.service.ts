import { Injectable } from '@angular/core';
import { Routes, Router } from '@angular/router';
import { RegistryService, RegistryModule } from './registry.service';

/**
 * Service for dynamically building and registering routes
 * based on enabled modules in the registry
 */
@Injectable({
  providedIn: 'root'
})
export class DynamicRouteBuilder {
  constructor(
    private registryService: RegistryService,
    private router: Router
  ) {}

  /**
   * Build child routes for the dashboard based on enabled modules
   * Generates lazy-loaded routes for each module
   */
  buildDashboardRoutes(): Routes {
    const modules = this.registryService.getEnabledModules();
    const routes: Routes = [];

    for (const module of modules) {
      // Add route without patientId
      routes.push({
        path: module.path,
        loadChildren: () => this.loadModule(module)
      });

      // Add route with patientId parameter
      routes.push({
        path: `${module.path}/:patientId`,
        loadChildren: () => this.loadModule(module)
      });
    }

    console.log('[DynamicRouteBuilder] Built routes for modules:', modules.map(m => m.id));
    return routes;
  }

  /**
   * Load a module's routes dynamically
   * This is called by the lazy loading mechanism
   */
  private async loadModule(module: RegistryModule): Promise<Routes> {
    console.log(`[DynamicRouteBuilder] Loading routes for module ${module.id}`);

    try {
      // Dynamically import the module
      // @ts-ignore - Module Federation dynamic import
      const moduleExports = await import(
        /* webpackIgnore: true */ `${module.remoteName}/${module.exposedModule}`
      );

      // Extract routes from module exports
      // Modules should export their routes as ROUTES_CONST (e.g., DEMOGRAPHICS_ROUTES)
      const routesKey = this.getRoutesExportKey(module.id);
      const routes = moduleExports[routesKey];

      if (!routes) {
        throw new Error(`Module ${module.id} does not export ${routesKey}`);
      }

      console.log(`[DynamicRouteBuilder] Routes loaded for ${module.id}:`, routes);
      return routes;
    } catch (error) {
      console.error(`[DynamicRouteBuilder] Failed to load routes for ${module.id}:`, error);
      
      // Return a fallback error route
      return [
        {
          path: '',
          component: null as any, // Would show error component
          data: { 
            error: `Failed to load module ${module.name}`,
            moduleId: module.id
          }
        }
      ];
    }
  }

  /**
   * Get the expected routes export key for a module
   * Convention: {ModuleName_ROUTES} (e.g., DEMOGRAPHICS_ROUTES)
   */
  private getRoutesExportKey(moduleId: string): string {
    const keysMap: { [key: string]: string } = {
      'demographics': 'DEMOGRAPHICS_ROUTES',
      'vitals': 'VITALS_ROUTES',
      'labs': 'LABS_ROUTES',
      'medications': 'MEDICATIONS_ROUTES',
      'visits': 'VISITS_ROUTES',
      'care-team': 'CARE_TEAM_ROUTES',
      'procedures': 'PROCEDURES_ROUTES'
    };

    return keysMap[moduleId] || `${moduleId.toUpperCase()}_ROUTES`;
  }

  /**
   * Register routes dynamically at runtime
   * This should be called during app initialization
   */
  registerDynamicRoutes(): void {
    const dashboardRoutes = this.buildDashboardRoutes();

    // Find the dashboard route in the router config
    const dashboardRoute = this.router.config.find(r => r.path === 'dashboard');

    if (dashboardRoute) {
      // Replace children with dynamically built routes
      dashboardRoute.children = dashboardRoutes;
      console.log('[DynamicRouteBuilder] Dynamic routes registered');
    } else {
      console.warn('[DynamicRouteBuilder] Dashboard route not found in router config');
    }
  }

  /**
   * Get all routable modules
   */
  getRoutableModules(): RegistryModule[] {
    return this.registryService.getEnabledModules();
  }
}
