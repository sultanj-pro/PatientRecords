import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'demographics',
        canActivate: [authGuard],
        loadChildren: () => import('demographicsApp/DemographicsModule').then(m => m.DEMOGRAPHICS_ROUTES)
      },
      {
        path: 'vitals',
        canActivate: [authGuard],
        loadChildren: () => import('vitalsApp/VitalsModule').then(m => m.VITALS_ROUTES)
      },
      {
        path: 'labs',
        canActivate: [authGuard],
        loadChildren: () => import('labsApp/LabsModule').then(m => m.LABS_ROUTES)
      },
      {
        path: 'visits',
        canActivate: [authGuard],
        loadChildren: () => import('visitsApp/VisitsModule').then(m => m.VISITS_ROUTES)
      },
      {
        path: 'medications',
        canActivate: [authGuard],        loadChildren: () => import('medicationsApp/MedicationsModule').then(m => m.MEDICATIONS_ROUTES)
      }
    ]
  },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' }
];