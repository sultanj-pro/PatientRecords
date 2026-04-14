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

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
  private hasRetried = false;

  constructor(private http: HttpClient) {}

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
            return this.http.post<any>('/api/auth/refresh', { token: currentToken }).pipe(
              switchMap((response) => {
                localStorage.setItem('jwt_token', response.accessToken);
                const retryRequest = request.clone({
                  setHeaders: { Authorization: `Bearer ${response.accessToken}` }
                });
                this.hasRetried = false;
                return next.handle(retryRequest);
              }),
              catchError((refreshError) => {
                localStorage.removeItem('jwt_token');
                localStorage.removeItem('user_role');
                localStorage.removeItem('username');
                this.hasRetried = false;
                return throwError(() => refreshError);
              })
            );
          }
        }
        if (error.status !== 401) this.hasRetried = false;
        return throwError(() => error);
      })
    );
  }
}
