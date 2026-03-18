import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, Routes } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { importProvidersFrom } from '@angular/core';
import { AppComponent } from './app/app.component';
import { JwtInterceptor } from './app/core/interceptors/jwt.interceptor';
import { authGuard } from './app/core/guards/auth.guard';
import { adminGuard } from './app/core/guards/admin.guard';
import { moduleAvailabilityGuard } from './app/core/guards/module-availability.guard';

/**
 * Bootstrap configuration
 */
const baseRoutes: Routes = [
  { path: 'login', loadComponent: () => import('./app/components/login/login.component').then(m => m.LoginComponent) },
  {
    path: 'dashboard',
    loadComponent: () => import('./app/components/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'demographics/:patientId',
        canActivate: [moduleAvailabilityGuard],
        loadChildren: () => (import('demographicsApp/DemographicsModule') as any).then((m: any) => m.DEMOGRAPHICS_ROUTES)
      },
      {
        path: 'demographics',
        canActivate: [moduleAvailabilityGuard],
        loadChildren: () => (import('demographicsApp/DemographicsModule') as any).then((m: any) => m.DEMOGRAPHICS_ROUTES)
      },
      {
        path: 'vitals/:patientId',
        canActivate: [moduleAvailabilityGuard],
        loadChildren: () => (import('vitalsApp/VitalsModule') as any).then((m: any) => m.VITALS_ROUTES)
      },
      {
        path: 'vitals',
        canActivate: [moduleAvailabilityGuard],
        loadChildren: () => (import('vitalsApp/VitalsModule') as any).then((m: any) => m.VITALS_ROUTES)
      },
      {
        path: 'medications/:patientId',
        canActivate: [moduleAvailabilityGuard],
        loadChildren: () => (import('medicationsApp/MedicationsModule') as any).then((m: any) => m.MEDICATIONS_ROUTES)
      },
      {
        path: 'medications',
        canActivate: [moduleAvailabilityGuard],
        loadChildren: () => (import('medicationsApp/MedicationsModule') as any).then((m: any) => m.MEDICATIONS_ROUTES)
      },
      {
        path: 'labs/:patientId',
        canActivate: [moduleAvailabilityGuard],
        loadChildren: () => (import('labsApp/LabsModule') as any).then((m: any) => m.LABS_ROUTES)
      },
      {
        path: 'labs',
        canActivate: [moduleAvailabilityGuard],
        loadChildren: () => (import('labsApp/LabsModule') as any).then((m: any) => m.LABS_ROUTES)
      },
      {
        path: 'visits/:patientId',
        canActivate: [moduleAvailabilityGuard],
        loadChildren: () => (import('visitsApp/VisitsModule') as any).then((m: any) => m.VISITS_ROUTES)
      },
      {
        path: 'visits',
        canActivate: [moduleAvailabilityGuard],
        loadChildren: () => (import('visitsApp/VisitsModule') as any).then((m: any) => m.VISITS_ROUTES)
      },
      {
        path: 'care-team/:patientId',
        canActivate: [moduleAvailabilityGuard],
        loadChildren: () => (import('careTeamApp/CareTeamRoutes') as any).then((m: any) => m.CARE_TEAM_ROUTES)
      },
      {
        path: 'care-team',
        canActivate: [moduleAvailabilityGuard],
        loadChildren: () => (import('careTeamApp/CareTeamRoutes') as any).then((m: any) => m.CARE_TEAM_ROUTES)
      },
      {
        path: 'procedures/:patientId',
        canActivate: [moduleAvailabilityGuard],
        loadComponent: () => import('./app/components/procedures-wrapper/procedures-wrapper.component').then(m => m.ProceduresWrapperComponent)
      },
      {
        path: 'procedures',
        canActivate: [moduleAvailabilityGuard],
        loadComponent: () => import('./app/components/procedures-wrapper/procedures-wrapper.component').then(m => m.ProceduresWrapperComponent)
      }
    ]
  },
  {
    path: 'admin',
    canActivate: [authGuard, adminGuard],
    loadComponent: () => import('./app/components/admin/admin-dashboard.component').then(m => m.AdminDashboardComponent)
  },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' }
];

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(baseRoutes),
    provideHttpClient(withInterceptorsFromDi()),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: JwtInterceptor,
      multi: true
    },
    importProvidersFrom(BrowserAnimationsModule)
  ]
}).catch((err) => console.error('Failed to bootstrap app:', err));
