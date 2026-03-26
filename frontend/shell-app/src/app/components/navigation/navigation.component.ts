import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { PatientContextService } from '../../core/services/patient-context.service';
import { PatientSearchComponent } from '../patient-search/patient-search.component';

interface NavNotification {
  _id: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  status: string;
  createdAt: string;
}

@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [CommonModule, PatientSearchComponent],
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.css']
})
export class NavigationComponent implements OnInit, OnDestroy {
  currentUsername: string | null = null;
  currentRole: string | null = null;
  selectedPatient: any = null;
  searchVisible: boolean = false;

  // Notification bell state
  notifications: NavNotification[] = [];
  bellOpen = false;
  acknowledgingId: string | null = null;
  private pollSub: Subscription | null = null;
  private destroy$ = new Subject<void>();

  @ViewChild(PatientSearchComponent) patientSearch!: PatientSearchComponent;

  constructor(
    private authService: AuthService,
    private router: Router,
    private patientContextService: PatientContextService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.currentUsername = this.authService.getUsername();
    this.currentRole = this.authService.getRole();

    this.patientContextService.getSelectedPatient().pipe(takeUntil(this.destroy$)).subscribe(patient => {
      this.selectedPatient = patient;
      if (patient) {
        this.searchVisible = false;
        this.startPolling(((patient as any).patientid || (patient as any).id || '').toString());
      } else {
        this.stopPolling();
        this.notifications = [];
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopPolling();
  }

  // ── Notification polling ──────────────────────────────────────────────────

  private startPolling(patientId: string): void {
    this.stopPolling();
    this.fetchUnread(patientId);
    this.pollSub = interval(30000).subscribe(() => this.fetchUnread(patientId));
  }

  private stopPolling(): void {
    if (this.pollSub) { this.pollSub.unsubscribe(); this.pollSub = null; }
  }

  private fetchUnread(patientId: string): void {
    this.http.get<{ notifications: NavNotification[] }>(`/api/notifications/${patientId}/unread`)
      .subscribe({
        next: (resp) => { this.notifications = resp?.notifications || []; },
        error: () => { /* fail silently — bell just shows 0 */ }
      });
  }

  get unreadCount(): number { return this.notifications.length; }

  toggleBell(event: Event): void {
    event.stopPropagation();
    this.bellOpen = !this.bellOpen;
  }

  closeBell(): void { this.bellOpen = false; }

  acknowledgeNotif(notif: NavNotification, event: Event): void {
    event.stopPropagation();
    if (this.acknowledgingId === notif._id) return;
    this.acknowledgingId = notif._id;

    this.http.post(`/api/notifications/${notif._id}/acknowledge`, {}).subscribe({
      next: () => {
        this.notifications = this.notifications.filter(n => n._id !== notif._id);
        this.acknowledgingId = null;
      },
      error: () => { this.acknowledgingId = null; }
    });
  }

  severityIcon(severity: string): string {
    const map: Record<string, string> = { critical: '🚨', high: '⚠️', medium: '🔔', low: 'ℹ️' };
    return map[severity?.toLowerCase()] || '🔔';
  }

  // ── Existing methods ──────────────────────────────────────────────────────

  toggleSearch(): void {
    this.searchVisible = !this.searchVisible;
    if (this.searchVisible) {
      setTimeout(() => {
        const input = document.querySelector('.header-search-input') as HTMLInputElement;
        if (input) input.focus();
      }, 0);
    }
  }

  getFullName(): string {
    if (this.selectedPatient) {
      const firstName = this.selectedPatient.firstName || this.selectedPatient.firstname || '';
      const lastName = this.selectedPatient.lastName || this.selectedPatient.lastname || '';
      return `${firstName} ${lastName}`.trim();
    }
    return '';
  }

  onLogout(): void {
    this.authService.logout();
    setTimeout(() => { this.router.navigate(['/login']); }, 0);
  }
}
