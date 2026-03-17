import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { PluginRegistryService } from '../services/plugin-registry.service';

@Injectable({
  providedIn: 'root'
})
export class ModuleAvailabilityGuard implements CanActivate {
  constructor(
    private pluginRegistry: PluginRegistryService,
    private router: Router
  ) {}

  async canActivate(route: ActivatedRouteSnapshot): Promise<boolean> {
    // Extract module name from route
    // URL format: /dashboard/demographics/12345 -> module is 'demographics'
    const segments = route.url;
    
    if (!segments || segments.length === 0) {
      return true; // Allow if no specific module in URL
    }

    const requestedModule = segments[0]?.path;

    if (!requestedModule) {
      return true; // Allow if can't determine module
    }

    // Ensure registry is loaded
    await this.pluginRegistry.loadRegistry().catch(() => {
      console.warn('[ModuleAvailabilityGuard] Failed to load registry');
    });

    // Get available modules for current role
    const userRole = 'nurse'; // You may want to get this from AuthService
    const availableModules = this.pluginRegistry.getAvailableModulesForRole(userRole);

    // Check if requested module exists and is enabled
    const moduleExists = availableModules.some(m => m.id === requestedModule && m.enabled);

    if (!moduleExists) {
      console.warn(`[ModuleAvailabilityGuard] Module '${requestedModule}' not available. Redirecting to dashboard.`);
      
      // Redirect to dashboard without the module path
      this.router.navigate(['/dashboard']);
      return false;
    }

    return true;
  }
}
