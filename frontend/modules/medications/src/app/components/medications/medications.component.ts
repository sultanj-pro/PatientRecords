import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HTTP_INTERCEPTORS } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { JwtInterceptor } from '../../core/interceptors/jwt.interceptor';

interface Medication {
  name?: string;
  dose?: string;
  frequency?: string;
  indication?: string;
  route?: string;
  startDate?: string | Date;
  [key: string]: any;
}

@Component({
  selector: 'app-medications',
  standalone: true,
  imports: [CommonModule],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: JwtInterceptor,
      multi: true
    }
  ],
  templateUrl: './medications.component.html',
  styleUrls: ['./medications.component.css']
})
export class MedicationsComponent implements OnInit, OnDestroy {
  medications: Medication[] = [];
  loading = true;
  error: string | null = null;
  patientName = 'Patient';
  private lastPatientId: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(private http: HttpClient, private route: ActivatedRoute) {}

  ngOnInit(): void {
    // Extract patientId from URL params (for deep linking and direct routes)
    // Route params only fire when this module's route is active
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const urlPatientId = params['patientId'];
      if (urlPatientId) {
        console.log('[Medications] Patient ID from route params:', urlPatientId);
        this.storePatientContextInLocalStorage(urlPatientId);
        if (urlPatientId !== this.lastPatientId) {
          this.lastPatientId = urlPatientId;
          this.loadMedications();
        }
      }
    });
  }

  ngOnDestroy(): void {
    // Complete the destroy subject
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadMedications(): void {
    this.loading = true;
    this.error = null;

    const patientId = this.getPatientIdFromStorage();

    if (!patientId) {
      this.loading = false;
      this.error = 'No patient selected. Please select a patient from the dashboard.';
      return;
    }

    const apiUrl = `http://localhost:5000/api/patients/${patientId}/medications`;

    this.http.get<any>(apiUrl)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          // Handle array response or object with data property
          const medsArray = Array.isArray(data) ? data : data.medications || data.data || [];
          this.medications = medsArray;
          this.lastPatientId = patientId; // Track loaded patient
          this.loading = false;
        },
        error: (err) => {
          console.error('Error loading medications:', err);
          this.error = `Failed to load medications: ${err.message || 'Unknown error'}`;
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
          return String(context.patientId);
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

  getFrequencyLabel(frequency: string | undefined): string {
    if (!frequency) return 'As needed';
    const freq = frequency.toLowerCase();
    if (freq.includes('daily') || freq.includes('once')) return 'Once daily';
    if (freq.includes('twice')) return 'Twice daily';
    if (freq.includes('three')) return 'Three times daily';
    if (freq.includes('four')) return 'Four times daily';
    if (freq.includes('every 12')) return 'Every 12 hours';
    if (freq.includes('every 6')) return 'Every 6 hours';
    if (freq.includes('every 8')) return 'Every 8 hours';
    return frequency;
  }

  formatDate(date: string | Date | undefined): string {
    if (!date) return 'N/A';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'N/A';
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    };
    return d.toLocaleDateString('en-US', options);
  }

  retryLoad(): void {
    this.loadMedications();
  }
}
