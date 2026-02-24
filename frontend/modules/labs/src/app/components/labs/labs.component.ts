import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HTTP_INTERCEPTORS } from '@angular/common/http';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { JwtInterceptor } from '../../core/interceptors/jwt.interceptor';

interface LabResult {
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
  private destroy$ = new Subject<void>();

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadLabData();
  }

  private loadLabData(): void {
    this.loading = true;
    this.error = null;

    const patientId = this.getPatientIdFromStorage();
    
    console.log('Labs component - Loading data for patient:', patientId);
    console.log('Labs component - localStorage __PATIENT_CONTEXT__:', localStorage.getItem('__PATIENT_CONTEXT__'));
    
    if (!patientId) {
      this.loading = false;
      this.error = 'No patient selected. Please select a patient from the dashboard.';
      console.error('Labs component - No patient ID found');
      return;
    }

    const apiUrl = `http://localhost:5001/api/patients/${patientId}/labs`;
    console.log('Labs component - Calling API:', apiUrl);
    
    this.http.get<any>(apiUrl)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          console.log('Labs component - API response:', data);
          // Handle array response or object with data property
          const labsArray = Array.isArray(data) ? data : data.labs || data.data || [];
          this.labs = labsArray;
          this.loading = false;
        },
        error: (err) => {
          console.error('Error loading labs:', err);
          this.error = `Failed to load lab data: ${err.message || 'Unknown error'}`;
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
          return context.patientId;
        }
      } catch (e) {
        console.warn('Failed to parse patient context:', e);
      }
    }
    return null;
  }

  getTestTypeOptions(): string[] {
    const types = new Set(this.labs.map(lab => lab.testName));
    return Array.from(types);
  }

  getFilteredLabs(): LabResult[] {
    if (this.selectedTestType === 'all') {
      return this.labs;
    }
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
    if (this.isAbnormal(lab)) return 'Abnormal';
    return 'Normal';
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return 'N/A';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

