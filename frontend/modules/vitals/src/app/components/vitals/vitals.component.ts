import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HTTP_INTERCEPTORS } from '@angular/common/http';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { JwtInterceptor } from '../../core/interceptors/jwt.interceptor';

interface Vital {
  temperature?: number;
  bpSystolic?: number;
  bpDiastolic?: number;
  heartRate?: number;
  respiratoryRate?: number;
  o2Saturation?: number;
  recordedAt?: string | Date;
  recordedBy?: string;
  [key: string]: any;
}

@Component({
  selector: 'app-vitals',
  standalone: true,
  imports: [CommonModule],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: JwtInterceptor,
      multi: true
    }
  ],
  templateUrl: './vitals.component.html',
  styleUrls: ['./vitals.component.css']
})
export class VitalsComponent implements OnInit, OnDestroy {
  vitals: Vital[] = [];
  loading = true;
  error: string | null = null;
  patientName = 'Patient';

  private destroy$ = new Subject<void>();

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadVitals();
  }

  private loadVitals(): void {
    this.loading = true;
    this.error = null;

    const patientId = this.getPatientIdFromStorage();

    if (!patientId) {
      this.loading = false;
      this.error = 'No patient selected. Please select a patient from the dashboard.';
      return;
    }

    const apiUrl = `http://localhost:5001/api/patients/${patientId}/vitals`;

    this.http.get<any>(apiUrl)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          // Handle array response or object with data property
          const vitalsArray = Array.isArray(data) ? data : data.vitals || data.data || [];
          this.vitals = vitalsArray;
          this.loading = false;
        },
        error: (err) => {
          console.error('Error loading vitals:', err);
          this.error = `Failed to load vitals: ${err.message || 'Unknown error'}`;
          this.loading = false;
        }
      });
  }

  private getPatientIdFromStorage(): string | null {
    // Try shell app's shared patient context first
    const contextStr = localStorage.getItem('__PATIENT_CONTEXT__');
    if (contextStr) {
      try {
        const context = JSON.parse(contextStr);
        if (context.patientId) {
          this.patientName = context.firstName && context.lastName
            ? `${context.firstName} ${context.lastName}`
            : 'Patient';
          return context.patientId;
        }
      } catch (e) {
        console.warn('Failed to parse patient context:', e);
      }
    }

    let patientId = sessionStorage.getItem('selectedPatientId');
    if (patientId) return patientId;

    patientId = localStorage.getItem('selectedPatientId');
    if (patientId) return patientId;

    const urlParams = new URLSearchParams(window.location.search);
    patientId = urlParams.get('patientId');
    if (patientId) return patientId;

    const pathMatch = window.location.pathname.match(/\/dashboard\/([^\/]+)/);
    if (pathMatch && pathMatch[1]) {
      return pathMatch[1];
    }

    return null;
  }

  formatDate(date: string | Date | undefined | null): string {
    if (!date) return 'N/A';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'N/A';
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return d.toLocaleDateString('en-US', options);
  }

  getLatestVital<T>(field: keyof Vital): T | null {
    if (this.vitals.length === 0) return null;
    const latest = this.vitals[0];
    return (latest[field] as T) || null;
  }

  getTemperatureStatus(temp: number | null): string {
    if (!temp) return 'No data';
    if (temp < 36.1) return 'Low';
    if (temp > 37.5) return 'High';
    return 'Normal';
  }

  getBloodPressureStatus(systolic: number | null, diastolic: number | null): string {
    if (!systolic || !diastolic) return 'No data';
    if (systolic < 90 || diastolic < 60) return 'Low';
    if (systolic >= 140 || diastolic >= 90) return 'High';
    return 'Normal';
  }

  getVitalTrend(field: string): string {
    if (this.vitals.length < 2) return '';
    const current = this.vitals[0][field];
    const previous = this.vitals[1][field];
    if (!current || !previous) return '';
    if (Number(current) > Number(previous)) return '📈';
    if (Number(current) < Number(previous)) return '📉';
    return '➡️';
  }

  isHeartRateNormal(hr: number | null): boolean {
    return hr ? hr >= 60 && hr <= 100 : false;
  }

  isRespiratoryRateNormal(rr: number | null): boolean {
    return rr ? rr >= 12 && rr <= 20 : false;
  }

  isO2SaturationNormal(o2: number | null): boolean {
    return o2 ? o2 >= 95 : false;
  }

  getFormattedDate(): string {
    const latest = this.vitals.length > 0 ? this.vitals[0].recordedAt : null;
    return this.formatDate(latest);
  }

  retryLoad(): void {
    this.loadVitals();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
