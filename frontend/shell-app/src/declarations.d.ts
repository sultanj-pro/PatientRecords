declare module 'demographicsApp/DemographicsModule' {
  import { Routes } from '@angular/router';
  export const DEMOGRAPHICS_ROUTES: Routes;
  export class DemographicsComponent {}
}

declare module 'vitalsApp/VitalsModule' {
  import { Routes } from '@angular/router';
  export const VITALS_ROUTES: Routes;
  export class VitalsComponent {}
}

declare module 'labsApp/LabsModule' {
  import { Routes } from '@angular/router';
  export const LABS_ROUTES: Routes;
  export class LabsComponent {}
}

declare module 'medicationsApp/MedicationsModule' {
  import { Routes } from '@angular/router';
  export const MEDICATIONS_ROUTES: Routes;
  export class MedicationsComponent {}
}

declare module 'visitsApp/VisitsModule' {
  import { Routes } from '@angular/router';
  export const VISITS_ROUTES: Routes;
  export class VisitsComponent {}
}

declare module 'medicationsApp/Routes' {
  import { Routes } from '@angular/router';
  export const MEDICATIONS_ROUTES: Routes;
}

declare module 'visitsApp/VisitsModule' {
  export class VisitsModule {}
}

declare module 'visitsApp/Routes' {
  import { Routes } from '@angular/router';
  export const VISITS_ROUTES: Routes;
}
