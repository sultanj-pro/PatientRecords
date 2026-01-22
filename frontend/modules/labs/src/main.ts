import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { LabsModule } from './app/labs.module';

platformBrowserDynamic()
  .bootstrapModule(LabsModule)
  .catch(err => console.error(err));
