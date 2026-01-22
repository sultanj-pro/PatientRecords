import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-labs',
  templateUrl: './labs.component.html',
  styleUrls: ['./labs.component.css']
})
export class LabsComponent implements OnInit, OnDestroy {
  labs: any[] = [];
  loading = true;
  selectedTestType: string = 'all';
  private destroy$ = new Subject<void>();

  constructor() { }

  ngOnInit(): void {
    this.loadLabsData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadLabsData(): void {
    // TODO: Inject PatientService and load labs from patient context
    // this.patientService.getPatientLabs(patientId)
    //   .pipe(takeUntil(this.destroy$))
    //   .subscribe(labs => {
    //     this.labs = labs;
    //     this.loading = false;
    //   });
    
    // Simulate async loading
    setTimeout(() => {
      this.loading = false;
    }, 500);
  }

  getUnique(array: any[], field: string): string[] {
    if (!array || !field) return [];
    const unique = [...new Set(array.map(item => item[field]))];
    return unique.filter(item => item) as string[];
  }

  getFilteredLabs(): any[] {
    if (this.selectedTestType === 'all') {
      return this.labs;
    }
    return this.labs.filter(lab => lab.testName === this.selectedTestType);
  }

  getResultStatus(lab: any): string {
    if (!lab.status) return 'Unknown';
    return lab.status.charAt(0).toUpperCase() + lab.status.slice(1);
  }

  isAbnormal(lab: any): boolean {
    return lab.status && (lab.status === 'abnormal' || lab.status === 'critical');
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  }

  getTestTypeOptions(): string[] {
    return this.getUnique(this.labs, 'testName');
  }

  getLatestLabByType(testName: string): any {
    const filtered = this.labs.filter(lab => lab.testName === testName);
    return filtered.length > 0 ? filtered[0] : null;
  }
}
