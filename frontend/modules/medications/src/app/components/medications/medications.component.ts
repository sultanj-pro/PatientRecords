import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HTTP_INTERCEPTORS } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { Subject, forkJoin } from 'rxjs';
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

interface MedForm {
  name: string;
  dose: string;
  frequency: string;
  indication: string;
  route: string;
  startDate: string;
}

@Component({
  selector: 'app-medications',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
  discontinued: Medication[] = [];
  showHistory = false;
  loading = true;
  error: string | null = null;
  patientName = 'Patient';
  private lastPatientId: string | null = null;

  // Role guard
  canEdit = false;

  // Add/Edit form
  showForm = false;
  editingMed: Medication | null = null;
  formSaving = false;
  formError: string | null = null;
  form: MedForm = this.emptyForm();

  // Delete confirm
  deletingMed: Medication | null = null;
  deleteConfirmName = '';
  deleteError: string | null = null;
  deleting = false;

  private destroy$ = new Subject<void>();

  constructor(private http: HttpClient, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.canEdit = this.hasEditRole();

    this.route.params.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const urlPatientId = params['patientId'];
      if (urlPatientId) {
        this.storePatientContextInLocalStorage(urlPatientId);
        if (urlPatientId !== this.lastPatientId) {
          this.lastPatientId = urlPatientId;
          this.loadMedications();
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private hasEditRole(): boolean {
    try {
      // Shell app stores the role directly under 'user_role' (set by AuthService on login)
      const role = (localStorage.getItem('user_role') || '').toLowerCase();
      if (role === 'physician' || role === 'admin') return true;

      // Fallback: decode JWT stored under 'jwt_token'
      const token = localStorage.getItem('jwt_token') || sessionStorage.getItem('jwt_token');
      if (!token) return false;
      const payload = JSON.parse(atob(token.split('.')[1]));
      const jwtRole = (payload.role || '').toLowerCase();
      return jwtRole === 'physician' || jwtRole === 'admin';
    } catch {
      return false;
    }
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

    const active$ = this.http.get<any>(`/api/patients/${patientId}/medications`);
    const history$ = this.http.get<any[]>(`/api/patients/${patientId}/medications/history`);

    forkJoin({ active: active$, history: history$ })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ active, history }) => {
          this.medications  = Array.isArray(active)  ? active  : active?.medications  || active?.data  || [];
          this.discontinued = Array.isArray(history) ? history : [];
          this.lastPatientId = patientId;
          this.loading = false;
        },
        error: (err) => {
          this.error = `Failed to load medications: ${err.message || 'Unknown error'}`;
          this.loading = false;
        }
      });
  }

  // ── Add ────────────────────────────────────────────────────────────────────
  openAddForm(): void {
    this.editingMed = null;
    this.form = this.emptyForm();
    this.formError = null;
    this.showForm = true;
  }

  // ── Edit ───────────────────────────────────────────────────────────────────
  openEditForm(med: Medication): void {
    this.editingMed = med;
    this.form = {
      name:        med['name']        || '',
      dose:        med['dose']        || '',
      frequency:   med['frequency']   || '',
      indication:  med['indication']  || '',
      route:       med['route']       || '',
      startDate:   med['startDate'] ? String(med['startDate']).substring(0, 10) : '',
    };
    this.formError = null;
    this.showForm = true;
  }

  closeForm(): void {
    this.showForm = false;
    this.editingMed = null;
    this.formError = null;
  }

  saveForm(): void {
    if (!this.form.name.trim()) {
      this.formError = 'Medication name is required.';
      return;
    }
    const patientId = this.getPatientIdFromStorage();
    if (!patientId) return;

    this.formSaving = true;
    this.formError = null;

    const payload = { ...this.form };

    if (this.editingMed) {
      const medId = this.editingMed['_id'];
      if (!medId) {
        this.formError = 'This medication cannot be identified (missing ID). Please refresh and try again.';
        this.formSaving = false;
        return;
      }
      this.http.put(`/api/patients/${patientId}/medications/${medId}`, payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => { this.formSaving = false; this.closeForm(); this.loadMedications(); },
          error: (err) => { this.formSaving = false; this.formError = err.error?.error || 'Save failed.'; }
        });
    } else {
      this.http.post(`/api/patients/${patientId}/medications`, payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => { this.formSaving = false; this.closeForm(); this.loadMedications(); },
          error: (err) => { this.formSaving = false; this.formError = err.error?.error || 'Save failed.'; }
        });
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  openDeleteConfirm(med: Medication): void {
    this.deletingMed = med;
    this.deleteConfirmName = '';
    this.deleteError = null;
  }

  closeDeleteConfirm(): void {
    this.deletingMed = null;
    this.deleteError = null;
  }

  confirmDelete(): void {
    if (!this.deletingMed) return;
    const patientId = this.getPatientIdFromStorage();
    if (!patientId) return;

    const medId = this.deletingMed['_id'];
    if (!medId) {
      this.deleteError = 'This medication cannot be identified (missing ID). Please refresh and try again.';
      return;
    }

    this.deleting = true;
    this.deleteError = null;

    this.http.delete(`/api/patients/${patientId}/medications/${medId}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => { this.deleting = false; this.closeDeleteConfirm(); this.loadMedications(); },
        error: (err) => { this.deleting = false; this.deleteError = err.error?.error || 'Delete failed.'; }
      });
  }

  // ── Reactivate ─────────────────────────────────────────────────────────────
  reactivate(med: Medication): void {
    const patientId = this.getPatientIdFromStorage();
    if (!patientId) return;
    const medId = med['_id'];
    if (!medId) return;

    this.http.post(`/api/patients/${patientId}/medications/${medId}/reactivate`, {})
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.loadMedications(),
        error: (err) => console.error('Reactivate failed', err),
      });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  private emptyForm(): MedForm {
    return { name: '', dose: '', frequency: '', indication: '', route: '', startDate: '' };
  }

  private getPatientIdFromStorage(): string | null {
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
      } catch (e) {}
    }

    let patientId = sessionStorage.getItem('selectedPatientId');
    if (patientId) return patientId;

    patientId = localStorage.getItem('selectedPatientId');
    if (patientId) return patientId;

    const urlParams = new URLSearchParams(window.location.search);
    patientId = urlParams.get('patientId');
    if (patientId) return patientId;

    const pathMatch = window.location.pathname.match(/\/dashboard\/[^\/]+\/([^\/]+)/);
    if (pathMatch && pathMatch[1]) return pathMatch[1];

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
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  retryLoad(): void {
    this.loadMedications();
  }
}


