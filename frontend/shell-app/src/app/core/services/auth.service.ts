import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { TokenService } from '@patient-records/shared';

export interface AuthResponse {
  accessToken: string;
  role: string;
  username?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:5001';
  private tokenKey = 'jwt_token';
  private roleKey = 'user_role';
  private usernameKey = 'username';
  private returnUrlKey = 'returnUrl';

  private isAuthenticated$ = new BehaviorSubject<boolean>(this.hasToken());
  private currentRole$ = new BehaviorSubject<string | null>(this.getStoredRole());
  private currentUsername$ = new BehaviorSubject<string | null>(this.getStoredUsername());

  constructor(
    private http: HttpClient,
    private tokenService: TokenService
  ) {}

  login(username: string): Observable<AuthResponse> {
    console.log('AuthService.login() called with username:', username);
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/auth/login`, { username })
      .pipe(
        tap((response) => {
          console.log('AuthService.login() - Login response received:', response);
          localStorage.setItem(this.tokenKey, response.accessToken);
          localStorage.setItem(this.roleKey, response.role);
          localStorage.setItem(this.usernameKey, username);
          console.log('AuthService.login() - Token stored in localStorage');
          this.isAuthenticated$.next(true);
          this.currentRole$.next(response.role);
          this.currentUsername$.next(username);
        })
      );
  }

  /**
   * Refresh the current token by sending it to the backend
   * Backend will validate it (ignoring expiration) and issue a new one
   */
  refresh(): Observable<AuthResponse> {
    const token = this.getToken();
    if (!token) {
      return throwError(() => new Error('No token available to refresh'));
    }

    console.log('AuthService.refresh() - attempting to refresh token');
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/auth/refresh`, { token })
      .pipe(
        tap((response) => {
          console.log('Token refresh successful');
          localStorage.setItem(this.tokenKey, response.accessToken);
          localStorage.setItem(this.roleKey, response.role);
          // Keep existing username since response might not have it
          const existingUsername = localStorage.getItem(this.usernameKey);
          if (response.username) {
            localStorage.setItem(this.usernameKey, response.username);
          }
          this.isAuthenticated$.next(true);
          this.currentRole$.next(response.role);
        }),
        catchError((error: HttpErrorResponse) => {
          console.error('Token refresh failed:', error);
          this.logout();
          return throwError(() => error);
        })
      );
  }

  /**
   * Check if token refresh is needed (expiring soon)
   * Automatically refreshes if token is expiring within the buffer time
   * @param minutesBuffer - Minutes before expiration to trigger refresh (default: 5)
   */
  refreshIfNeeded(minutesBuffer: number = 5): Observable<boolean> {
    if (this.tokenService.isTokenExpiringSoon(minutesBuffer)) {
      console.log(`Token expiring soon (within ${minutesBuffer} minutes), refreshing...`);
      return this.refresh().pipe(
        map(() => true),
        catchError((error) => {
          console.error('Proactive token refresh failed:', error);
          return of(false);
        })
      );
    }
    return of(false);
  }

  /**
   * Validate token with backend on app startup
   * Ensures token is still valid after service restarts or session expiration
   * This prevents stale tokens from causing frozen UI
   */
  validateTokenWithBackend(): Observable<boolean> {
    const token = this.getToken();
    
    // If no token, user is not authenticated
    if (!token) {
      console.log('No token found - not authenticated');
      return of(false);
    }

    console.log('Validating token with backend...');
    return this.http
      .post<{ valid: boolean; username?: string; role?: string }>(
        `${this.apiUrl}/auth/validate`,
        { token }
      )
      .pipe(
        tap((response) => {
          console.log('Token validation successful:', response);
          // Token is valid, update observables
          this.isAuthenticated$.next(true);
        }),
        map(() => true),
        catchError((error: HttpErrorResponse) => {
          console.warn('Token validation failed:', error.status, error.error);
          // Token is invalid, clear it
          this.logout();
          return of(false);
        })
      );
  }

  /**
   * Check if user has a valid (non-expired) token
   * Synchronous check using TokenService
   */
  hasValidToken(): boolean {
    const hasToken = this.hasToken();
    if (!hasToken) return false;

    const isExpired = this.tokenService.isTokenExpired();
    return !isExpired;
  }

  logout(): void {
    console.log('AuthService.logout() - clearing authentication');
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.roleKey);
    localStorage.removeItem(this.usernameKey);
    // Also clear window object token
    delete (window as any).__JWT_TOKEN__;
    this.isAuthenticated$.next(false);
    this.currentRole$.next(null);
    this.currentUsername$.next(null);
  }

  /**
   * Save the current URL for redirecting back after login
   * Used when session times out and user needs to re-login
   */
  saveReturnUrl(url: string): void {
    if (url && url !== '/login') {
      sessionStorage.setItem(this.returnUrlKey, url);
    }
  }

  /**
   * Retrieve and clear the saved return URL
   * Returns the URL that was saved before redirect to login
   */
  getAndClearReturnUrl(): string | null {
    const url = sessionStorage.getItem(this.returnUrlKey);
    sessionStorage.removeItem(this.returnUrlKey);
    return url;
  }

  /**
   * Get token expiration date
   */
  getTokenExpirationDate(): Date | null {
    return this.tokenService.getExpirationDate();
  }

  /**
   * Get remaining time until token expiration in milliseconds
   */
  getTimeUntilExpiration(): number | null {
    return this.tokenService.getTimeUntilExpiration();
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  isAuthenticatedSync(): boolean {
    return !!localStorage.getItem(this.tokenKey);
  }

  getRole(): string | null {
    return localStorage.getItem(this.roleKey);
  }

  getUsername(): string | null {
    return localStorage.getItem(this.usernameKey);
  }

  isAuthenticated(): Observable<boolean> {
    return this.isAuthenticated$.asObservable();
  }

  getCurrentRole(): Observable<string | null> {
    return this.currentRole$.asObservable();
  }

  getCurrentUsername(): Observable<string | null> {
    return this.currentUsername$.asObservable();
  }

  private hasToken(): boolean {
    return !!localStorage.getItem(this.tokenKey);
  }

  private getStoredRole(): string | null {
    return localStorage.getItem(this.roleKey);
  }

  private getStoredUsername(): string | null {
    return localStorage.getItem(this.usernameKey);
  }
}
