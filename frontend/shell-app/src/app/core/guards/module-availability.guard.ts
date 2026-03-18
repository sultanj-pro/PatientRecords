import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router, CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { PluginRegistryService } from '../services/plugin-registry.service';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class ModuleAvailabilityGuard implements CanActivate {
  constructor(
    private pluginRegistry: PluginRegistryService,
    private authService: AuthService,
    private router: Router
  ) {}

  async canActivate(route: ActivatedRouteSnapshot): Promise<boolean> {
    const segments = route.url;
    if (!segments || segments.length === 0) return true;

    const requestedModule = segments[0]?.path;
    if (!requestedModule) return true;

    await this.pluginRegistry.loadRegistry().catch(() => {
      console.warn('[ModuleAvailabilityGuard] Failed to load registry');
    });

    const userRole = this.authService.getRole() || 'nurse';
    const availableModules = this.pluginRegistry.getAvailableModulesForRole(userRole);
    const moduleExists = availableModules.some(m => m.id === requestedModule && m.enabled);

    if (!moduleExists) {
      console.warn(`[ModuleAvailabilityGuard] Module '${requestedModule}' not available for role '${userRole}'. Redirecting to dashboard.`);
      this.router.navigate(['/dashboard']);
      return false;
    }

    return true;
  }
}

/**
 * Functional guard — use this in route config (canActivate: [moduleAvailabilityGuard])
 * Blocks navigation to disabled or role-restricted modules via direct URL.
 */
export const moduleAvailabilityGuard: CanActivateFn = async (route: ActivatedRouteSnapshot) => {
  const pluginRegistry = inject(PluginRegistryService);
  const authService = inject(AuthService);
  const router = inject(Router);

  const segments = route.url;
  if (!segments || segments.length === 0) return true;

  const requestedModule = segments[0]?.path;
  if (!requestedModule) return true;

  await pluginRegistry.loadRegistry().catch(() => {
    console.warn('[moduleAvailabilityGuard] Failed to load registry');
  });

  const userRole = authService.getRole() || 'nurse';
  const availableModules = pluginRegistry.getAvailableModulesForRole(userRole);
  const moduleExists = availableModules.some(m => m.id === requestedModule && m.enabled);

  if (!moduleExists) {
    console.warn(`[moduleAvailabilityGuard] Module '${requestedModule}' not available for role '${userRole}'. Redirecting to dashboard.`);
    router.navigate(['/dashboard']);
    return false;
  }

  return true;
};
