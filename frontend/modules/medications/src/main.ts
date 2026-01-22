import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { MedicationsModule } from './app/medications.module';

platformBrowserDynamic()
  .bootstrapModule(MedicationsModule)
  .catch(err => console.error(err));
