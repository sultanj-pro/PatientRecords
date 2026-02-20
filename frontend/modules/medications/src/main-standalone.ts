import { bootstrapApplication } from '@angular/platform-browser';
import { MedicationsComponent } from './app/components/medications/medications.component';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

bootstrapApplication(MedicationsComponent, {
  providers: [
    provideHttpClient(withInterceptorsFromDi())
  ]
}).catch(err => console.error(err));
