import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Functional guard that restricts access to admin-only routes.
 * Redirects non-admins to /dashboard; unauthenticated users to /login.
 */
export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.hasValidToken()) {
    router.navigate(['/login']);
    return false;
  }

  if (authService.getRole() !== 'admin') {
    router.navigate(['/dashboard']);
    return false;
  }

  return true;
};
