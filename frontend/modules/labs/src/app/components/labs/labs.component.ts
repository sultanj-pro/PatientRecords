import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HTTP_INTERCEPTORS } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { JwtInterceptor } from '../../core/interceptors/jwt.interceptor';

interface LabResult {
  _id?: string;
  testName: string;
  testCode?: string;
  value: any;
  unit: string;
  referenceRange?: string;
  status?: string;
  resultDate: Date | string;
  labName?: string;
  abnormal?: boolean;
}

interface LabForm {
  test_name: string;
  test_code: string;
  result: string | number;
  unit: string;
  reference_range: string;
  date: string;
  lab_name: string;
}

@Component({
  selector: 'app-labs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: JwtInterceptor,
      multi: true
    }
  ],
  templateUrl: './labs.component.html',
  styleUrls: ['./labs.component.css']
})
export class LabsComponent implements OnInit, OnDestroy {
  labs: LabResult[] = [];
  loading = true;
  error: string | null = null;
  selectedTestType = 'all';

  // Add / Edit modal
  showModal = false;
  isEditing = false;
  saving = false;
  saveError: string | null = null;
  editingId: string | null = null;
  editForm: LabForm = this.blankForm();

  // Delete
  deletingId: string | null = null;

  private destroy$ = new Subject<void>();
  private lastPatientId: string | null = null;

  constructor(private http: HttpClient, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const urlPatientId = params['patientId'];
      if (urlPatientId) {
        this.storePatientContext(urlPatientId);
        if (urlPatientId !== this.lastPatientId) {
          this.lastPatientId = urlPatientId;
          this.loadLabData();
        }
      }
    });

    // Fallback: listen for cross-MFE patient context change event
    window.addEventListener('patient-context-changed', (event: any) => {
      const newId = event.detail?.patientId?.toString();
      if (newId && newId !== this.lastPatientId) {
        this.lastPatientId = newId;
        this.loadLabData();
      }
    });

    this.loadLabData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadLabData(): void {
    this.loading = true;
    this.error = null;

    const patientId = this.getPatientId();
    if (!patientId) {
      this.loading = false;
      this.error = 'No patient selected. Please select a patient from the dashboard.';
      return;
    }

    this.http.get<LabResult[]>(`/api/patients/${patientId}/labs`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          const arr = Array.isArray(data) ? data : (data as any).labs || (data as any).data || [];
          this.labs = arr;
          this.lastPatientId = patientId;
          this.loading = false;
        },
        error: (err) => {
          this.error = `Failed to load lab data: ${err.message || 'Unknown error'}`;
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

  openEditModal(lab: LabResult): void {
    this.isEditing = true;
    this.editingId = lab._id || null;
    this.editForm = {
      test_name: lab.testName,
      test_code: lab.testCode || '',
      result: lab.value,
      unit: lab.unit,
      reference_range: lab.referenceRange || '',
      date: lab.resultDate ? String(lab.resultDate).slice(0, 10) : '',
      lab_name: lab.labName || '',
    };
    this.saveError = null;
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.saveError = null;
  }

  saveLab(): void {
    const patientId = this.getPatientId();
    if (!patientId) return;
    if (!this.editForm.test_name || !this.editForm.date) {
      this.saveError = 'Test name and date are required.';
      return;
    }

    this.saving = true;
    this.saveError = null;
    const payload = { ...this.editForm };

    if (this.isEditing && this.editingId) {
      this.http.put(`/api/patients/${patientId}/labs/${this.editingId}`, payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => { this.saving = false; this.closeModal(); this.loadLabData(); },
          error: (err) => { this.saving = false; this.saveError = err.error?.error || 'Save failed. Please try again.'; }
        });
    } else {
      this.http.post(`/api/patients/${patientId}/labs`, payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => { this.saving = false; this.closeModal(); this.loadLabData(); },
          error: (err) => { this.saving = false; this.saveError = err.error?.error || 'Save failed. Please try again.'; }
        });
    }
  }

  deleteLab(lab: LabResult): void {
    const patientId = this.getPatientId();
    if (!patientId || !lab._id) return;
    this.deletingId = lab._id;

    this.http.delete(`/api/patients/${patientId}/labs/${lab._id}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => { this.deletingId = null; this.loadLabData(); },
        error: () => { this.deletingId = null; }
      });
  }

  // ── Display helpers ───────────────────────────────────────────────────────

  getTestTypeOptions(): string[] {
    const types = new Set(this.labs.map(lab => lab.testName));
    return Array.from(types);
  }

  getFilteredLabs(): LabResult[] {
    if (this.selectedTestType === 'all') return this.labs;
    return this.labs.filter(lab => lab.testName === this.selectedTestType);
  }

  getLatestLabByType(testType: string): LabResult | null {
    const filtered = this.labs.filter(lab => lab.testName === testType);
    if (filtered.length === 0) return null;
    return filtered.reduce((latest, current) =>
      new Date(current.resultDate) > new Date(latest.resultDate) ? current : latest
    );
  }

  isAbnormal(lab: LabResult): boolean {
    return lab.abnormal === true || lab.status === 'abnormal';
  }

  getResultStatus(lab: LabResult): string {
    return this.isAbnormal(lab) ? 'Abnormal' : 'Normal';
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return 'N/A';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private blankForm(): LabForm {
    return { test_name: '', test_code: '', result: '', unit: '', reference_range: '', date: new Date().toISOString().slice(0, 10), lab_name: '' };
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


