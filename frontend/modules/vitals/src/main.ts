import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { VitalsModule } from './app/vitals.module';

platformBrowserDynamic()
  .bootstrapModule(VitalsModule)
  .catch(err => console.error(err));
