import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, Routes } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { importProvidersFrom } from '@angular/core';
import { AppComponent } from './app/app.component';
import { JwtInterceptor } from './app/core/interceptors/jwt.interceptor';
import { authGuard } from './app/core/guards/auth.guard';

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
        loadChildren: () => (import('demographicsApp/DemographicsModule') as any).then((m: any) => m.DEMOGRAPHICS_ROUTES)
      },
      {
        path: 'demographics',
        loadChildren: () => (import('demographicsApp/DemographicsModule') as any).then((m: any) => m.DEMOGRAPHICS_ROUTES)
      },
      {
        path: 'vitals/:patientId',
        loadChildren: () => (import('vitalsApp/VitalsModule') as any).then((m: any) => m.VITALS_ROUTES)
      },
      {
        path: 'vitals',
        loadChildren: () => (import('vitalsApp/VitalsModule') as any).then((m: any) => m.VITALS_ROUTES)
      },
      {
        path: 'medications/:patientId',
        loadChildren: () => (import('medicationsApp/MedicationsModule') as any).then((m: any) => m.MEDICATIONS_ROUTES)
      },
      {
        path: 'medications',
        loadChildren: () => (import('medicationsApp/MedicationsModule') as any).then((m: any) => m.MEDICATIONS_ROUTES)
      }
    ]
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
