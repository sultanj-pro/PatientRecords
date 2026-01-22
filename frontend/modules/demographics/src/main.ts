import { bootstrapModule } from '@angular/platform-browser-dynamic';
import { DemographicsModule } from './app/demographics.module';

bootstrapModule(DemographicsModule)
  .catch(err => console.error(err));
