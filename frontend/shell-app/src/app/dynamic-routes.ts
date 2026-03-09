import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { ModuleMetadata } from './core/services/plugin-registry.service';

/**
 * Convert module ID to federation app name
 * demographics -> demographicsApp
 * care-team -> careTeamApp
 */
function getAppName(moduleId: string): string {
  const camelCase = moduleId
    .split('-')
    .map((part, index) => {
      if (index === 0) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join('');
  return camelCase + 'App';
}

/**
 * Convert module ID to module class name
 * demographics -> DemographicsModule
 * care-team -> CareTeamModule
 */
function getModuleName(moduleId: string): string {
  return moduleId
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('') + 'Module';
}

/**
 * Convert module ID to ROUTES constant name
 * demographics -> DEMOGRAPHICS_ROUTES
 * care-team -> CARE_TEAM_ROUTES
 */
function getRoutesName(moduleId: string): string {
  return moduleId.toUpperCase().replace(/-/g, '_') + '_ROUTES';
}

/**
 * Generate dynamic routes from registry modules
 * Creates lazy-loaded routes for each enabled module
 */
export function generateDynamicRoutes(modules: ModuleMetadata[]): Routes {
  const dynamicRoutes: Routes = [];

  // Create routes for each enabled module
  for (const module of modules) {
    if (module.enabled) {
      const appName = getAppName(module.id);
      const moduleName = getModuleName(module.id);
      const routesName = getRoutesName(module.id);

      // Route without patient ID
      dynamicRoutes.push({
        path: module.path,
        canActivate: [authGuard],
        loadChildren: () => 
          import(`${appName}/${moduleName}`).then(m => m[routesName])
      });

      // Route with patient ID parameter
      dynamicRoutes.push({
        path: `${module.path}/:patientId`,
        canActivate: [authGuard],
        loadChildren: () =>
          import(`${appName}/${moduleName}`).then(m => m[routesName])
      });
    }
  }

  return dynamicRoutes;
}
