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

  constructor(private http: HttpClient, private router: Router) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = localStorage.getItem('jwt_token');
    if (token) {
      request = request.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 && !this.hasRetried) {
          this.hasRetried = true;
          const currentToken = localStorage.getItem('jwt_token');
          if (currentToken) {
            return this.http.post<any>(`${this.apiUrl}/api/auth/refresh`, { token: currentToken }).pipe(
              switchMap((response) => {
                localStorage.setItem('jwt_token', response.accessToken);
                const retried = request.clone({ setHeaders: { Authorization: `Bearer ${response.accessToken}` } });
                return next.handle(retried);
              }),
              catchError(() => {
                localStorage.removeItem('jwt_token');
                this.router.navigate(['/login']);
                return throwError(() => error);
              })
            );
          }
        }
        return throwError(() => error);
      })
    );
  }
}
