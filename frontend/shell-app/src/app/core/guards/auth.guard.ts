import { Injectable } from '@angular/core';
import { Router, CanActivateFn, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    if (this.authService.hasValidToken()) {
      return true;
    }

    // Save current URL for returning after login
    this.authService.saveReturnUrl(state.url);
    
    // Redirect to login with returnUrl query param
    this.router.navigate(['/login'], {
      queryParams: { returnUrl: state.url }
    });
    return false;
  }
}

/**
 * Functional guard version for use in route configuration
 * Example: { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] }
 */
export const authGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  console.log('[AuthGuard] Checking access to:', state.url);
  console.log('[AuthGuard] Has valid token:', authService.hasValidToken());

  if (authService.hasValidToken()) {
    console.log('[AuthGuard] Token valid, allowing access');
    return true;
  }

  console.log('[AuthGuard] No valid token, redirecting to login');
  // Save current URL for returning after login
  authService.saveReturnUrl(state.url);
  console.log('[AuthGuard] Saved returnUrl:', state.url);
  
  // Redirect to login with returnUrl query param
  router.navigate(['/login'], {
    queryParams: { returnUrl: state.url }
  });
  return false;
};
