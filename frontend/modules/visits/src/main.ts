import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { VisitsModule } from './app/visits.module';

platformBrowserDynamic()
  .bootstrapModule(VisitsModule)
  .catch(err => console.error(err));
