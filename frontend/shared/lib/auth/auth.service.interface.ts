/**
 * Shared Authentication Service
 * Exported from shell app and available to all modules
 * 
 * Usage in micro-frontends:
 * - Get current user role: authService.getRole()
 * - Check if authenticated: authService.isAuthenticatedSync()
 * - Access JWT token: authService.getToken()
 */

export interface AuthService {
  login(username: string): any;
  logout(): void;
  getToken(): string | null;
  getRole(): string | null;
  getUsername(): string | null;
  isAuthenticatedSync(): boolean;
  isAuthenticated(): any;
  getCurrentRole(): any;
  getCurrentUsername(): any;
}
