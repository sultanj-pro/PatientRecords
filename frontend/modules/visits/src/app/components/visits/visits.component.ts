import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-visits',
  templateUrl: './visits.component.html',
  styleUrls: ['./visits.component.css']
})
export class VisitsComponent implements OnInit, OnDestroy {
  visits: any[] = [];
  loading = true;
  selectedVisitType: string = 'all';
  expandedVisit: string | null = null;
  private destroy$ = new Subject<void>();

  constructor() { }

  ngOnInit(): void {
    this.loadVisitsData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadVisitsData(): void {
    // TODO: Inject PatientService and load visits from patient context
    // this.patientService.getPatientVisits(patientId)
    //   .pipe(takeUntil(this.destroy$))
    //   .subscribe(visits => {
    //     this.visits = visits;
    //     this.loading = false;
    //   });
    
    // Simulate async loading
    setTimeout(() => {
      this.loading = false;
    }, 500);
  }

  getFilteredVisits(): any[] {
    if (this.selectedVisitType === 'all') {
      return this.visits;
    }
    return this.visits.filter(visit => visit.visitType === this.selectedVisitType);
  }

  getVisitTypes(): string[] {
    const types = [...new Set(this.visits.map(v => v.visitType))];
    return types.filter(t => t) as string[];
  }

  getVisitIcon(visitType: string): string {
    switch (visitType?.toLowerCase()) {
      case 'hospital':
        return '🏥';
      case 'clinic':
        return '🏢';
      case 'office':
        return '🏪';
      default:
        return '📋';
    }
  }

  getVisitTypeLabel(visitType: string): string {
    if (!visitType) return 'Unknown';
    return visitType.charAt(0).toUpperCase() + visitType.slice(1);
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatTime(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  toggleExpandVisit(visitId: string): void {
    this.expandedVisit = this.expandedVisit === visitId ? null : visitId;
  }

  getUpcomingVisits(): any[] {
    const now = new Date();
    return this.visits
      .filter(v => new Date(v.visitDate) > now)
      .sort((a, b) => new Date(a.visitDate).getTime() - new Date(b.visitDate).getTime());
  }

  getPastVisits(): any[] {
    const now = new Date();
    return this.visits
      .filter(v => new Date(v.visitDate) <= now)
      .sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime());
  }

  getDaysUntilVisit(dateString: string): number | null {
    const visitDate = new Date(dateString);
    const today = new Date();
    const diffTime = visitDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : null;
  }
}
