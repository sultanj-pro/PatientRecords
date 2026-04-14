import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HTTP_INTERCEPTORS } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
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
  discharge_status?: string;
}

interface VisitForm {
  date: string;
  visitType: string;
  provider_name: string;
  facility_name: string;
  reason: string;
  notes: string;
  discharge_status: string;
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

  canEdit = false;

  // Add / Edit modal
  showModal = false;
  isEditing = false;
  saving = false;
  saveError: string | null = null;
  editingId: string | null = null;
  editForm: VisitForm = this.blankForm();

  // Delete
  deletingId: string | null = null;

  readonly visitTypes = ['hospital', 'clinic', 'office'];

  private lastPatientId: string | null = null;
  private destroy$ = new Subject<void>();

  constructor(private http: HttpClient, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.canEdit = this.hasEditRole();

    this.route.params.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const urlPatientId = params['patientId'];
      if (urlPatientId) {
        this.storePatientContext(urlPatientId);
        if (urlPatientId !== this.lastPatientId) {
          this.lastPatientId = urlPatientId;
          this.loadVisitData();
        }
      }
    });

    window.addEventListener('patient-context-changed', (event: any) => {
      const newId = event.detail?.patientId?.toString();
      if (newId && newId !== this.lastPatientId) {
        this.lastPatientId = newId;
        this.loadVisitData();
      }
    });

    this.loadVisitData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private hasEditRole(): boolean {
    try {
      const role = (localStorage.getItem('user_role') || '').toLowerCase();
      if (role === 'physician' || role === 'admin') return true;
      const token = localStorage.getItem('jwt_token') || sessionStorage.getItem('jwt_token');
      if (!token) return false;
      const payload = JSON.parse(atob(token.split('.')[1]));
      const jwtRole = (payload.role || '').toLowerCase();
      return jwtRole === 'physician' || jwtRole === 'admin';
    } catch {
      return false;
    }
  }

  private loadVisitData(): void {
    this.loading = true;
    this.error = null;

    const patientId = this.getPatientId();
    if (!patientId) {
      this.loading = false;
      this.error = 'No patient selected. Please select a patient from the dashboard.';
      return;
    }

    this.http.get<Visit[]>(`/api/patients/${patientId}/visits`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          const arr: any[] = Array.isArray(data) ? data : (data as any).visits || (data as any).data || [];
          this.visits = arr.map((v: any, idx: number) => ({ ...v, id: v.id || `visit-${idx}` }));
          this.lastPatientId = patientId;
          this.loading = false;
        },
        error: (err) => {
          this.error = `Failed to load visit data: ${err.message || 'Unknown error'}`;
          this.loading = false;
        }
      });
  }

  // ── Add / Edit modal ──────────────────────────────────────────────────────

  openAddModal(): void {
    this.isEditing = false;
    this.editingId = null;
    this.editForm = this.blankForm();
    this.saveError = null;
    this.showModal = true;
  }

  openEditModal(visit: Visit): void {
    this.isEditing = true;
    this.editingId = visit.id || null;
    this.editForm = {
      date: visit.visitDate ? String(visit.visitDate).slice(0, 10) : '',
      visitType: visit.visitType,
      provider_name: visit.provider || '',
      facility_name: visit.department || '',
      reason: visit.reason || '',
      notes: visit.notes || '',
      discharge_status: visit.discharge_status || '',
    };
    this.saveError = null;
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.saveError = null;
  }

  saveVisit(): void {
    const patientId = this.getPatientId();
    if (!patientId) return;
    if (!this.editForm.date || !this.editForm.visitType) {
      this.saveError = 'Date and visit type are required.';
      return;
    }

    this.saving = true;
    this.saveError = null;
    const payload = { ...this.editForm };

    if (this.isEditing && this.editingId) {
      this.http.put(`/api/patients/${patientId}/visits/${this.editingId}`, payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => { this.saving = false; this.closeModal(); this.loadVisitData(); },
          error: (err) => { this.saving = false; this.saveError = err.error?.error || 'Save failed. Please try again.'; }
        });
    } else {
      this.http.post(`/api/patients/${patientId}/visits`, payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => { this.saving = false; this.closeModal(); this.loadVisitData(); },
          error: (err) => { this.saving = false; this.saveError = err.error?.error || 'Save failed. Please try again.'; }
        });
    }
  }

  deleteVisit(visit: Visit): void {
    const patientId = this.getPatientId();
    if (!patientId || !visit.id) return;
    this.deletingId = visit.id;

    this.http.delete(`/api/patients/${patientId}/visits/${visit.id}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => { this.deletingId = null; this.loadVisitData(); },
        error: () => { this.deletingId = null; }
      });
  }

  // ── Display helpers ───────────────────────────────────────────────────────

  getVisitTypes(): string[] {
    const types = new Set(this.visits.map(visit => visit.visitType));
    return Array.from(types);
  }

  getFilteredVisits(): Visit[] {
    if (this.selectedVisitType === 'all') return this.visits;
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
    const diffDays = Math.ceil((visit.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : null;
  }

  getVisitIcon(visitType: string): string {
    const icons: { [key: string]: string } = {
      'hospital': '🏥', 'clinic': '🏥', 'office': '👨‍⚕️',
      'emergency': '🚨', 'telemedicine': '💻', 'lab': '🔬',
      'imaging': '📷', 'surgery': '⚕️'
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

  // ── Helpers ───────────────────────────────────────────────────────────────

  private blankForm(): VisitForm {
    return { date: new Date().toISOString().slice(0, 10), visitType: 'office', provider_name: '', facility_name: '', reason: '', notes: '', discharge_status: '' };
  }

  private getPatientId(): string | null {
    const contextStr = localStorage.getItem('__PATIENT_CONTEXT__');
    if (contextStr) {
      try {
        const ctx = JSON.parse(contextStr);
        if (ctx.patientId) return String(ctx.patientId);
      } catch {}
    }
    return null;
  }

  private storePatientContext(patientId: string): void {
    try {
      const existing = localStorage.getItem('__PATIENT_CONTEXT__');
      const ctx = existing ? JSON.parse(existing) : {};
      ctx.patientId = patientId;
      localStorage.setItem('__PATIENT_CONTEXT__', JSON.stringify(ctx));
    } catch {}
  }
}

