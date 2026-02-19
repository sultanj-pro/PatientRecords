import { bootstrapApplication } from '@angular/platform-browser';
import { MedicationsComponent } from './app/components/medications/medications.component';
import { provideHttpClient } from '@angular/common/http';

bootstrapApplication(MedicationsComponent, {
  providers: [
    provideHttpClient()
  ]
}).catch(err => console.error(err));
