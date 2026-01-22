import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface AuthResponse {
  accessToken: string;
  role: string;
  username: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:5001';
  private tokenKey = 'jwt_token';
  private roleKey = 'user_role';
  private usernameKey = 'username';

  private isAuthenticated$ = new BehaviorSubject<boolean>(this.hasToken());
  private currentRole$ = new BehaviorSubject<string | null>(this.getStoredRole());
  private currentUsername$ = new BehaviorSubject<string | null>(this.getStoredUsername());

  constructor(private http: HttpClient) {}

  login(username: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/auth/login`, { username })
      .pipe(
        tap((response) => {
          localStorage.setItem(this.tokenKey, response.accessToken);
          localStorage.setItem(this.roleKey, response.role);
          localStorage.setItem(this.usernameKey, response.username);
          this.isAuthenticated$.next(true);
          this.currentRole$.next(response.role);
          this.currentUsername$.next(response.username);
        })
      );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.roleKey);
    localStorage.removeItem(this.usernameKey);
    this.isAuthenticated$.next(false);
    this.currentRole$.next(null);
    this.currentUsername$.next(null);
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
