import { bootstrapApplication } from '@angular/platform-browser';
import { VitalsComponent } from './app/components/vitals/vitals.component';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

bootstrapApplication(VitalsComponent, {
  providers: [
    provideHttpClient(withInterceptorsFromDi())
  ]
}).catch(err => console.error(err));
