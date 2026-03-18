import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HTTP_INTERCEPTORS } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
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
  private lastPatientId: string | null = null;

  constructor(private http: HttpClient, private route: ActivatedRoute) {}

  ngOnInit(): void {
    // Extract patientId from URL params (for deep linking and direct routes)
    // Route params only fire when this module's route is active
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const urlPatientId = params['patientId'];
      if (urlPatientId) {
        console.log('[Vitals] Patient ID from route params:', urlPatientId);
        this.storePatientContextInLocalStorage(urlPatientId);
        if (urlPatientId !== this.lastPatientId) {
          this.lastPatientId = urlPatientId;
          this.loadVitals();
        }
      }
    });
  }

  ngOnDestroy(): void {
    // Complete the destroy subject
    this.destroy$.next();
    this.destroy$.complete();
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

    const apiUrl = `http://localhost:5000/api/patients/${patientId}/vitals`;

    this.http.get<any>(apiUrl)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          // Handle array response or object with data property
          const vitalsArray = Array.isArray(data) ? data : data.vitals || data.data || [];
          
          // Transform API response into component format
          this.vitals = this.transformVitals(vitalsArray);
          
          console.log('Transformed vitals:', this.vitals);
          this.lastPatientId = patientId; // Track loaded patient
          this.loading = false;
        },
        error: (err) => {
          console.error('Error loading vitals:', err);
          this.error = `Failed to load vitals: ${err.message || 'Unknown error'}`;
          this.loading = false;
        }
      });
  }

  /**
   * Transform API response vitals into component format
   * Groups related vitals and extracts values based on vital_description
   */
  private transformVitals(apiVitals: any[]): Vital[] {
    // Sort by date, most recent first
    const sorted = [...apiVitals].sort((a, b) => {
      const dateA = new Date(a.dateofobservation || '').getTime();
      const dateB = new Date(b.dateofobservation || '').getTime();
      return dateB - dateA;
    });

    // Group by date to combine related vitals
    const groupedByDate: { [key: string]: any[] } = {};
    sorted.forEach(vital => {
      const dateKey = vital.dateofobservation || 'unknown';
      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = [];
      }
      groupedByDate[dateKey].push(vital);
    });

    // Transform grouped vitals into component format
    const transformed: Vital[] = [];
    
    Object.entries(groupedByDate).forEach(([date, vitals]) => {
      const vital: Vital = {
        recordedAt: date
      };

      vitals.forEach((v: any) => {
        const description = (v.vital_description || '').toLowerCase();
        const value = parseFloat(v.value) || 0;

        if (description.includes('temperature')) {
          vital.temperature = value;
        } else if (description.includes('blood pressure') || description.includes('systolic')) {
          vital.bpSystolic = value;
        } else if (description.includes('diastolic')) {
          vital.bpDiastolic = value;
        } else if (description.includes('heart rate') || description.includes('pulse')) {
          vital.heartRate = value;
        } else if (description.includes('respiratory rate') || description.includes('respiration')) {
          vital.respiratoryRate = value;
        } else if (description.includes('oxygen') || description.includes('o2 saturation') || description.includes('spo2')) {
          vital.o2Saturation = value;
        }
      });

      if (Object.keys(vital).length > 1) { // More than just recordedAt
        transformed.push(vital);
      }
    });

    return transformed;
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

    // Extract patientId from URL pattern: /dashboard/:module/:patientId
    const pathMatch = window.location.pathname.match(/\/dashboard\/[^\/]+\/([^\/]+)/);
    if (pathMatch && pathMatch[1]) {
      return pathMatch[1];
    }

    return null;
  }

  private storePatientContextInLocalStorage(patientId: string): void {
    const context = { patientId, timestamp: Date.now() };
    localStorage.setItem('__PATIENT_CONTEXT__', JSON.stringify(context));
    localStorage.setItem('selectedPatientId', patientId);
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
}
