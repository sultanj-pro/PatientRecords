import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HTTP_INTERCEPTORS } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { JwtInterceptor } from '../../core/interceptors/jwt.interceptor';

interface UnitRange {
  min: number;
  max: number;
  step: number;
  placeholder: string;
}

interface VitalTypeConfig {
  type: string;
  units: string[];
  unitRanges: { [unit: string]: UnitRange };
}

const VITAL_CONFIGS: VitalTypeConfig[] = [
  {
    type: 'Temperature', units: ['°C', '°F'],
    unitRanges: {
      '°C': { min: 35,  max: 42,   step: 0.1, placeholder: '36.5' },
      '°F': { min: 95,  max: 108,  step: 0.1, placeholder: '98.6' },
    }
  },
  {
    type: 'Blood Pressure Systolic', units: ['mmHg'],
    unitRanges: { 'mmHg': { min: 50, max: 300, step: 1, placeholder: '120' } }
  },
  {
    type: 'Blood Pressure Diastolic', units: ['mmHg'],
    unitRanges: { 'mmHg': { min: 20, max: 200, step: 1, placeholder: '80' } }
  },
  {
    type: 'Heart Rate', units: ['bpm'],
    unitRanges: { 'bpm': { min: 20, max: 300, step: 1, placeholder: '72' } }
  },
  {
    type: 'Respiratory Rate', units: ['breaths/min'],
    unitRanges: { 'breaths/min': { min: 1, max: 60, step: 1, placeholder: '16' } }
  },
  {
    type: 'O₂ Saturation', units: ['%'],
    unitRanges: { '%': { min: 50, max: 100, step: 0.1, placeholder: '98' } }
  },
  {
    type: 'Blood Glucose', units: ['mg/dL', 'mmol/L'],
    unitRanges: {
      'mg/dL':  { min: 10,  max: 1200, step: 0.1, placeholder: '100' },
      'mmol/L': { min: 0.5, max: 66.5, step: 0.1, placeholder: '5.5' },
    }
  },
  {
    type: 'Weight', units: ['kg', 'lbs'],
    unitRanges: {
      'kg':  { min: 1, max: 300, step: 0.1, placeholder: '70'  },
      'lbs': { min: 2, max: 660, step: 0.1, placeholder: '154' },
    }
  },
  {
    type: 'Height', units: ['cm', 'in'],
    unitRanges: {
      'cm': { min: 30, max: 280, step: 0.1, placeholder: '170' },
      'in': { min: 12, max: 110, step: 0.1, placeholder: '67'  },
    }
  },
  {
    type: 'Pain Score', units: ['0-10'],
    unitRanges: { '0-10': { min: 0, max: 10, step: 1, placeholder: '0' } }
  },
];

interface VitalRecord {
  _id?: string;
  vital_description: string;
  value: string | number;
  unit?: string;
  dateofobservation: string;
  observationcode?: string;
  deletedAt?: string | null;
  [key: string]: any;
}

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
  imports: [CommonModule, FormsModule],
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
  rawVitals: VitalRecord[] = [];
  loading = true;
  error: string | null = null;
  patientName = 'Patient';

  // Add/Edit modal
  showModal = false;
  isEditing = false;
  saving = false;
  saveError: string | null = null;
  editingId: string | null = null;
  editForm: Partial<VitalRecord> = {};

  // Delete
  deletingId: string | null = null;

  readonly vitalConfigs = VITAL_CONFIGS;

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

    this.http.get<any>(`/api/patients/${patientId}/vitals`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          const vitalsArray: VitalRecord[] = Array.isArray(data) ? data : data.vitals || data.data || [];
          this.rawVitals = vitalsArray.filter(v => !v.deletedAt).sort((a, b) =>
            new Date(b.dateofobservation).getTime() - new Date(a.dateofobservation).getTime()
          );
          this.vitals = this.transformVitals(this.rawVitals);
          this.lastPatientId = patientId;
          this.loading = false;
        },
        error: (err) => {
          this.error = `Failed to load vitals: ${err.message || 'Unknown error'}`;
          this.loading = false;
        }
      });
  }

  // ── Add / Edit modal ─────────────────────────────────────────────────────

  get selectedVitalConfig(): VitalTypeConfig | null {
    return VITAL_CONFIGS.find(c => c.type === this.editForm.vital_description) || null;
  }

  get availableUnits(): string[] {
    return this.selectedVitalConfig?.units || [];
  }

  get selectedUnitConfig(): UnitRange | null {
    const cfg = this.selectedVitalConfig;
    if (!cfg || !this.editForm.unit) return null;
    return cfg.unitRanges[this.editForm.unit] || null;
  }

  onVitalTypeChange(): void {
    const cfg = this.selectedVitalConfig;
    if (cfg) {
      this.editForm.unit = cfg.units[0];
      this.editForm.value = '';
    }
  }

  openAddModal(): void {
    this.isEditing = false;
    this.editingId = null;
    const firstCfg = VITAL_CONFIGS[0];
    this.editForm = { dateofobservation: new Date().toISOString().slice(0, 16), vital_description: firstCfg.type, value: '', unit: firstCfg.units[0] };
    this.saveError = null;
    this.showModal = true;
  }

  openEditModal(v: VitalRecord): void {
    this.isEditing = true;
    this.editingId = v._id || null;
    this.editForm = {
      vital_description: v.vital_description,
      value: v.value,
      unit: v.unit || '',
      dateofobservation: v.dateofobservation ? v.dateofobservation.slice(0, 16) : '',
    };
    this.saveError = null;
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.saveError = null;
  }

  saveVital(): void {
    const patientId = this.getPatientIdFromStorage();
    if (!patientId) return;
    if (!this.editForm.vital_description || !this.editForm.dateofobservation) {
      this.saveError = 'Vital type and date are required.';
      return;
    }

    const cfg = this.selectedVitalConfig;
    const unitCfg = this.selectedUnitConfig;
    const val = parseFloat(String(this.editForm.value));
    if (isNaN(val)) {
      this.saveError = 'Please enter a valid numeric value.';
      return;
    }
    if (unitCfg && (val < unitCfg.min || val > unitCfg.max)) {
      this.saveError = `Value must be between ${unitCfg.min} and ${unitCfg.max} ${this.editForm.unit} for ${cfg?.type}.`;
      return;
    }

    this.saving = true;
    this.saveError = null;

    const payload = { ...this.editForm };

    if (this.isEditing && this.editingId) {
      this.http.put(`/api/patients/${patientId}/vitals/${this.editingId}`, payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => { this.saving = false; this.closeModal(); this.loadVitals(); },
          error: (err) => { this.saving = false; this.saveError = err.error?.error || 'Save failed. Please try again.'; }
        });
    } else {
      this.http.post(`/api/patients/${patientId}/vitals`, payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => { this.saving = false; this.closeModal(); this.loadVitals(); },
          error: (err) => { this.saving = false; this.saveError = err.error?.error || 'Save failed. Please try again.'; }
        });
    }
  }

  deleteVital(v: VitalRecord): void {
    const patientId = this.getPatientIdFromStorage();
    if (!patientId || !v._id) return;
    this.deletingId = v._id;

    this.http.delete(`/api/patients/${patientId}/vitals/${v._id}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => { this.deletingId = null; this.loadVitals(); },
        error: () => { this.deletingId = null; }
      });
  }

  // ── Transform / display helpers ──────────────────────────────────────────

  private transformVitals(apiVitals: VitalRecord[]): Vital[] {
    // Build one consolidated Vital from the most recent value of each type
    const latest: Vital = {};

    apiVitals.forEach((v: VitalRecord) => {
      const description = (v.vital_description || '').toLowerCase();
      const value = parseFloat(String(v.value)) || 0;

      if (description.includes('temperature') && !latest.temperature) {
        latest.temperature = value;
        if (!latest.recordedAt) latest.recordedAt = v.dateofobservation;
      } else if ((description.includes('blood pressure') || description.includes('systolic')) && !latest.bpSystolic) {
        latest.bpSystolic = value;
      } else if (description.includes('diastolic') && !latest.bpDiastolic) {
        latest.bpDiastolic = value;
      } else if ((description.includes('heart rate') || description.includes('pulse')) && !latest.heartRate) {
        latest.heartRate = value;
        if (!latest.recordedAt) latest.recordedAt = v.dateofobservation;
      } else if ((description.includes('respiratory rate') || description.includes('respiration')) && !latest.respiratoryRate) {
        latest.respiratoryRate = value;
      } else if ((description.includes('oxygen') || description.includes('o2') || description.includes('o₂') || description.includes('spo2') || description.includes('saturation')) && !latest.o2Saturation) {
        latest.o2Saturation = value;
      }
    });

    return Object.keys(latest).length > 0 ? [latest] : [];
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
