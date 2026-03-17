import { Injectable } from '@angular/core';
import { Route, Router } from '@angular/router';
import { PluginRegistryService, ModuleMetadata } from './plugin-registry.service';

/**
 * Dynamic Route Loader Service
 * 
 * Generates routes dynamically from the plugin registry instead of hard-coding them.
 * This enables true dynamic module loading - adding a module to the registry
 * automatically makes it routable without code changes or rebuilds.
 */
@Injectable({
  providedIn: 'root'
})
export class DynamicRouteLoaderService {

  constructor(
    private registryService: PluginRegistryService,
    private router: Router
  ) {}

  /**
   * Generate and configure dynamic routes from the registry
   * Called during app initialization before routing is activated
   */
  async generateDynamicRoutes(): Promise<void> {
    try {
      console.log('[DynamicRouteLoader] Loading registry and generating routes...');
      
      // Load the registry
      const registry = await this.registryService.loadRegistry();
      
      if (!registry || !registry.modules || registry.modules.length === 0) {
        console.warn('[DynamicRouteLoader] Registry is empty, no routes to generate');
        return;
      }

      // Generate routes for each enabled module
      const dynamicRoutes = this.generateModuleRoutes(registry.modules);
      
      console.log('[DynamicRouteLoader] Generated routes for modules:', 
        registry.modules.map(m => m.id).join(', '));

      // Add the dynamic routes to the dashboard children
      this.addRoutesToDashboard(dynamicRoutes);
    } catch (error) {
      console.error('[DynamicRouteLoader] Failed to generate dynamic routes:', error);
    }
  }

  /**
   * Generate Angular Route objects from registry modules (React modules only)
   * Angular modules are handled via hard-coded routes in bootstrap.ts
   */
  private generateModuleRoutes(modules: ModuleMetadata[]): Route[] {
    const routes: Route[] = [];

    // Dynamically import the host component for React modules
    const DynamicModuleHostComponent = () => 
      import('../../shared/components/dynamic-module-host/dynamic-module-host.component')
        .then(m => m.DynamicModuleHostComponent);

    for (const module of modules) {
      if (!module.enabled) {
        console.log(`[DynamicRouteLoader] Skipping disabled module: ${module.id}`);
        continue;
      }

      // Only generate routes for React modules
      // Angular modules are already in bootstrap.ts hard-coded
      if (module.framework !== 'react') {
        console.log(`[DynamicRouteLoader] Skipping ${module.framework} module: ${module.id} (already configured)`);
        continue;
      }

      // Generate two routes per React module: one without patientId, one with
      const path = module.path;

      // Route without patient ID: /dashboard/procedures
      routes.push({
        path: path,
        loadComponent: DynamicModuleHostComponent,
        data: { moduleId: module.id, moduleName: module.name }
      });

      // Route with patient ID: /dashboard/procedures/:patientId
      routes.push({
        path: `${path}/:patientId`,
        loadComponent: DynamicModuleHostComponent,
        data: { moduleId: module.id, moduleName: module.name }
      });

      console.log(`[DynamicRouteLoader] Generated routes for React module: ${module.id} (/${path}, /${path}/:patientId)`);
    }

    return routes;
  }

  /**
   * Load a remote entry script dynamically (PUBLIC - used by host component)
   */
  loadRemoteEntryPublic(url: string, containerName: string): Promise<void> {
    return this.loadRemoteEntry(url, containerName);
  }

  /**
   * Get shared scope for Module Federation (PUBLIC - used by host component)
   */
  getSharedScopePublic() {
    return this.getSharedScope();
  }

  /**
   * Load a remote entry script dynamically
   */
  private loadRemoteEntry(url: string, containerName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if ((window as any)[containerName]) {
        console.log(`[DynamicRouteLoader] Container ${containerName} already loaded`);
        resolve();
        return;
      }

      // Create and load the script
      const script = document.createElement('script');
      script.src = url;
      script.type = 'text/javascript';
      script.async = true;

      script.onload = () => {
        console.log(`[DynamicRouteLoader] Loaded remote entry: ${url}`);
        resolve();
      };

      script.onerror = () => {
        const error = `Failed to load remote entry: ${url}`;
        console.error(`[DynamicRouteLoader] ${error}`);
        reject(new Error(error));
      };

      document.head.appendChild(script);
    });
  }

  /**
   * Get shared scope for Module Federation
   * This ensures shared libraries are consistent across modules
   */
  private getSharedScope() {
    return {
      '@angular/core': {
        eager: true,
        singleton: true,
        strictVersion: false,
        requiredVersion: false
      },
      '@angular/common': {
        eager: true,
        singleton: true,
        strictVersion: false,
        requiredVersion: false
      },
      '@angular/router': {
        eager: true,
        singleton: true,
        strictVersion: false,
        requiredVersion: false
      },
      'rxjs': {
        eager: true,
        singleton: true,
        strictVersion: false,
        requiredVersion: false
      }
    };
  }

  /**
   * Add generated routes to the dashboard route configuration
   * This modifies the router's route configuration at runtime
   */
  private addRoutesToDashboard(routes: Route[]): void {
    // Get the current route configuration
    const config = this.router.config;

    // Find the dashboard route
    const dashboardRoute = config.find(r => r.path === 'dashboard');
    if (!dashboardRoute) {
      console.error('[DynamicRouteLoader] Dashboard route not found in router config');
      return;
    }

    // Initialize children array if it doesn't exist
    if (!dashboardRoute.children) {
      dashboardRoute.children = [];
    }

    // Add the generated routes to dashboard children
    dashboardRoute.children.push(...routes);

    console.log(`[DynamicRouteLoader] Added ${routes.length} dynamic routes to dashboard`);
    
    // Reset the router to apply the new configuration
    this.router.resetConfig(config);
  }
}
