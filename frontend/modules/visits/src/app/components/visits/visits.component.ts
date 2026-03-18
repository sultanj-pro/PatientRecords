import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HTTP_INTERCEPTORS } from '@angular/common/http';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { JwtInterceptor } from '../../core/interceptors/jwt.interceptor';

interface Visit {
  id?: string;
  visitType: string;
  visitDate: Date | string;
  provider?: string;
  department?: string;
  reason?: string;
  notes?: string;
}

@Component({
  selector: 'app-visits',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: JwtInterceptor,
      multi: true
    }
  ],
  templateUrl: './visits.component.html',
  styleUrls: ['./visits.component.css']
})
export class VisitsComponent implements OnInit, OnDestroy {
  visits: Visit[] = [];
  loading = true;
  error: string | null = null;
  selectedVisitType = 'all';
  expandedVisit: string | null = null;
  private lastPatientId: string | null = null;
  private destroy$ = new Subject<void>();

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    // Listen for patient context changes from the dashboard
    window.addEventListener('patient-context-changed', (event: any) => {
      console.log('Visits: Received patient-context-changed event', event.detail);
      const newPatientId = event.detail?.patientId?.toString();
      if (newPatientId && newPatientId !== this.lastPatientId) {
        this.lastPatientId = newPatientId;
        this.loadVisitData();
      }
    });

    // Initial load
    this.loadVisitData();
    
    // Use Angular's interval Observable to watch for patient changes (as fallback)
    interval(500)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        const currentPatientId = this.getPatientIdFromStorage();
        if (currentPatientId && currentPatientId !== this.lastPatientId) {
          console.log('Visits: Patient changed, reloading data', {
            old: this.lastPatientId,
            new: currentPatientId
          });
          this.lastPatientId = currentPatientId;
          this.loadVisitData();
        }
      });
  }

  private loadVisitData(): void {
    this.loading = true;
    this.error = null;

    const patientId = this.getPatientIdFromStorage();
    
    console.log('Visits component - Loading data for patient:', patientId);
    console.log('Visits component - localStorage __PATIENT_CONTEXT__:', localStorage.getItem('__PATIENT_CONTEXT__'));
    
    if (!patientId) {
      this.loading = false;
      this.error = 'No patient selected. Please select a patient from the dashboard.';
      console.error('Visits component - No patient ID found');
      return;
    }

    const apiUrl = `http://localhost:5000/api/patients/${patientId}/visits`;
    console.log('Visits component - Calling API:', apiUrl);
    
    this.http.get<any>(apiUrl)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          console.log('Visits component - API response:', data);
          // Handle array response or object with data property
          const visitsArray = Array.isArray(data) ? data : data.visits || data.data || [];
          this.visits = visitsArray.map((v: any, idx: number) => ({
            ...v,
            id: v.id || `visit-${idx}`
          }));
          this.lastPatientId = patientId; // Track loaded patient
          this.loading = false;
        },
        error: (err) => {
          console.error('Error loading visits:', err);
          this.error = `Failed to load visit data: ${err.message || 'Unknown error'}`;
          this.loading = false;
        }
      });
  }

  private getPatientIdFromStorage(): string | null {
    const contextStr = localStorage.getItem('__PATIENT_CONTEXT__');
    if (contextStr) {
      try {
        const context = JSON.parse(contextStr);
        if (context.patientId) {
          return String(context.patientId);
        }
      } catch (e) {
        console.warn('Failed to parse patient context:', e);
      }
    }
    return null;
  }

  getVisitTypes(): string[] {
    const types = new Set(this.visits.map(visit => visit.visitType));
    return Array.from(types);
  }

  getFilteredVisits(): Visit[] {
    if (this.selectedVisitType === 'all') {
      return this.visits;
    }
    return this.visits.filter(visit => visit.visitType === this.selectedVisitType);
  }

  getUpcomingVisits(): Visit[] {
    const now = new Date();
    return this.getFilteredVisits()
      .filter(visit => new Date(visit.visitDate) > now)
      .sort((a, b) => new Date(a.visitDate).getTime() - new Date(b.visitDate).getTime());
  }

  getPastVisits(): Visit[] {
    const now = new Date();
    return this.getFilteredVisits()
      .filter(visit => new Date(visit.visitDate) <= now)
      .sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime());
  }

  getDaysUntilVisit(visitDate: Date | string): number | null {
    const now = new Date();
    const visit = new Date(visitDate);
    const diffTime = visit.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : null;
  }

  getVisitIcon(visitType: string): string {
    const icons: { [key: string]: string } = {
      'hospital': '🏥',
      'clinic': '🏥',
      'office': '👨‍⚕️',
      'emergency': '🚨',
      'telemedicine': '💻',
      'lab': '🔬',
      'imaging': '📷',
      'surgery': '⚕️'
    };
    return icons[visitType?.toLowerCase()] || '📋';
  }

  getVisitTypeLabel(visitType: string): string {
    if (!visitType) return 'Unknown';
    return visitType.charAt(0).toUpperCase() + visitType.slice(1);
  }

  toggleExpandVisit(visitId: string | undefined): void {
    if (!visitId) return;
    this.expandedVisit = this.expandedVisit === visitId ? null : visitId;
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return 'N/A';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  formatTime(date: Date | string | undefined): string {
    if (!date) return 'N/A';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
