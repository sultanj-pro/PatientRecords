import { Routes } from '@angular/router';

/**
 * App Routes - Base routes
 * 
 * NOTE: Dashboard child routes are now dynamically built from the registry
 * See: DynamicRouteBuilder service and bootstrap.ts APP_INITIALIZER
 * 
 * This file is kept for reference and will be used during build compilation,
 * but the actual routes at runtime will be the ones built dynamically from
 * the module registry.
 */
export const routes: Routes = [
  // Routes are dynamically registered during app initialization
  // See bootstrap.ts for APP_INITIALIZER configuration
];
