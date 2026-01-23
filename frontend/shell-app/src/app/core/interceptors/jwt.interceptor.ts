import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

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

    return next.handle(request);
  }
}
