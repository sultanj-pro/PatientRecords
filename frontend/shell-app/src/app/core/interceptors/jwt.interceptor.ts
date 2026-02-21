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
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
  /**
   * Track if we've already attempted refresh for this 401
   * Prevents infinite retry loops
   */
  private hasRetried = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = this.authService.getToken();
    console.log('JWT Interceptor - Token:', token ? 'Present' : 'Missing');
    console.log('JWT Interceptor - Request URL:', request.url);

    if (token) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
      console.log('JWT Interceptor - Authorization header added');
    } else {
      console.log('JWT Interceptor - No token found, request will be unauthenticated');
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        // Handle 401 Unauthorized (token expired)
        if (error.status === 401 && !this.hasRetried) {
          console.log('JWT Interceptor - 401 response received, attempting token refresh');
          this.hasRetried = true;

          // Try to refresh token
          return this.authService.refresh().pipe(
            switchMap(() => {
              console.log('JWT Interceptor - Token refresh successful, retrying original request');
              // Refresh successful, retry original request with new token
              const newToken = this.authService.getToken();
              const retryRequest = request.clone({
                setHeaders: {
                  Authorization: `Bearer ${newToken}`
                }
              });
              this.hasRetried = false; // Reset retry flag
              return next.handle(retryRequest);
            }),
            catchError((refreshError) => {
              console.error('JWT Interceptor - Token refresh failed:', refreshError);
              // Refresh failed, redirect to login
              this.authService.saveReturnUrl(this.router.url);
              this.authService.logout();
              this.router.navigate(['/login'], {
                queryParams: { returnUrl: this.router.url }
              });
              this.hasRetried = false; // Reset retry flag
              return throwError(() => refreshError);
            })
          );
        }

        // Reset retry flag for next request if error not 401
        if (error.status !== 401) {
          this.hasRetried = false;
        }

        return throwError(() => error);
      })
    );
  }
}
