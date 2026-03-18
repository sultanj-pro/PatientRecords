import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
  private hasRetried = false;
  private apiUrl = 'http://localhost:5000';

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Get token from shell app's localStorage (same domain)
    const token = localStorage.getItem('jwt_token');
    
    if (token) {
      // Clone the request and add Authorization header
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        // Handle 401 Unauthorized (token expired)
        if (error.status === 401 && !this.hasRetried) {
          console.log('Demographics JWT Interceptor - 401 response received, attempting token refresh');
          this.hasRetried = true;

          // Try to refresh token directly
          const currentToken = localStorage.getItem('jwt_token');
          if (currentToken) {
            return this.http.post<any>(`${this.apiUrl}/auth/refresh`, { token: currentToken }).pipe(
              switchMap((response) => {
                console.log('Demographics JWT Interceptor - Token refresh successful, retrying original request');
                localStorage.setItem('jwt_token', response.accessToken);
                const newToken = response.accessToken;
                const retryRequest = request.clone({
                  setHeaders: {
                    Authorization: `Bearer ${newToken}`
                  }
                });
                this.hasRetried = false;
                return next.handle(retryRequest);
              }),
              catchError((refreshError) => {
                console.error('Demographics JWT Interceptor - Token refresh failed:', refreshError);
                // Refresh failed, clear auth and redirect
                localStorage.removeItem('jwt_token');
                localStorage.removeItem('user_role');
                localStorage.removeItem('username');
                this.router.navigate(['/login'], {
                  queryParams: { returnUrl: this.router.url }
                });
                this.hasRetried = false;
                return throwError(() => refreshError);
              })
            );
          }
        }

        if (error.status !== 401) {
          this.hasRetried = false;
        }

        return throwError(() => error);
      })
    );
  }
}
