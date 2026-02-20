import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: 'dashboard',
    component: DashboardComponent,
    children: [
      {
        path: 'demographics',
        loadChildren: () => import('demographicsApp/DemographicsModule').then(m => m.DEMOGRAPHICS_ROUTES)
      },
      {
        path: 'vitals',
        loadChildren: () => import('vitalsApp/VitalsModule').then(m => m.VITALS_ROUTES)
      },
      {
        path: 'labs',
        loadChildren: () => import('labsApp/LabsModule').then(m => m.LABS_ROUTES)
      },
      {
        path: 'visits',
        loadChildren: () => import('visitsApp/VisitsModule').then(m => m.VISITS_ROUTES)
      },
      {
        path: 'medications',
        loadChildren: () => import('medicationsApp/MedicationsModule').then(m => m.MEDICATIONS_ROUTES)
      }
    ]
  },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' }
];


