import { bootstrapApplication } from '@angular/platform-browser';
import { DemographicsComponent } from './app/components/demographics/demographics.component';
import { provideHttpClient, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';
import { JwtInterceptor } from './app/core/interceptors/jwt.interceptor';

bootstrapApplication(DemographicsComponent, {
  providers: [
    provideHttpClient(withInterceptorsFromDi()),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: JwtInterceptor,
      multi: true
    }
  ]
}).catch(err => console.error(err));
