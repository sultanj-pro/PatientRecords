import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { takeUntil } from 'rxjs/operators';
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

interface CriticalFinding {
  recId: string;
  title: string;
  description: string;
  recommendation: string;
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
  criticalFindings: CriticalFinding[] = [];
  bellOpen = false;
  acknowledgingId: string | null = null;
  private ws: WebSocket | null = null;
  private wsReconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private destroy$ = new Subject<void>();
  private recsChangedListener = () => {
    const patientId = ((this.selectedPatient as any)?.patientid || (this.selectedPatient as any)?.id || '').toString();
    if (patientId) this.fetchCriticalFindings(patientId);
  };

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
    window.addEventListener('ai-recommendations-changed', this.recsChangedListener);

    this.patientContextService.getSelectedPatient().pipe(takeUntil(this.destroy$)).subscribe(patient => {
      this.selectedPatient = patient;
      if (patient) {
        this.searchVisible = false;
        const patientId = ((patient as any).patientid || (patient as any).id || '').toString();
        this.connectWs(patientId);
        this.fetchCriticalFindings(patientId);
      } else {
        this.disconnectWs();
        this.notifications = [];
        this.criticalFindings = [];
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.disconnectWs();
    window.removeEventListener('ai-recommendations-changed', this.recsChangedListener);
  }

  // ── WebSocket real-time notifications (8.8.1) ─────────────────────────────

  private connectWs(patientId: string): void {
    this.disconnectWs();

    // Fetch current unread immediately via HTTP so the bell is up-to-date on load
    this.fetchUnread(patientId);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/notifications`;

    const connect = () => {
      const socket = new WebSocket(wsUrl);
      this.ws = socket;

      socket.onopen = () => {
        socket.send(JSON.stringify({ type: 'subscribe', patientId }));
      };

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'notification' && msg.data) {
            // Prepend new notification — dedup by _id
            if (!this.notifications.some(n => n._id === msg.data._id)) {
              this.notifications = [msg.data, ...this.notifications];
            }
          }
        } catch { /* ignore malformed messages */ }
      };

      socket.onclose = () => {
        this.ws = null;
        // Reconnect with 10 s back-off
        this.wsReconnectTimer = setTimeout(() => connect(), 10000);
      };

      socket.onerror = () => socket.close();
    };

    connect();
  }

  private disconnectWs(): void {
    if (this.wsReconnectTimer) { clearTimeout(this.wsReconnectTimer); this.wsReconnectTimer = null; }
    if (this.ws) { this.ws.close(); this.ws = null; }
  }

  private fetchUnread(patientId: string): void {
    this.http.get<{ notifications: NavNotification[] }>(`/api/notifications/${patientId}/unread`)
      .subscribe({
        next: (resp) => { this.notifications = resp?.notifications || []; },
        error: () => { /* fail silently — bell just shows 0 */ }
      });
  }

  private fetchCriticalFindings(patientId: string): void {
    this.http.get<any[]>(`/api/ai/recommendations/${patientId}`)
      .subscribe({
        next: (recs) => {
          const seen = new Set<string>();
          const alerts: CriticalFinding[] = [];
          for (const rec of (recs || [])) {
            if (rec.status !== 'pending') continue;
            for (const f of (rec.findings || [])) {
              if (f.severity?.toLowerCase() !== 'critical') continue;
              if (seen.has(f.title)) continue;
              seen.add(f.title);
              alerts.push({ recId: rec._id, title: f.title, description: f.description, recommendation: f.recommendation });
            }
          }
          this.criticalFindings = alerts;
        },
        error: () => { /* fail silently */ }
      });
  }

  get unreadCount(): number { return this.notifications.length + this.criticalFindings.length; }

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

  viewCriticalFinding(recId: string, event: Event): void {
    event.stopPropagation();
    this.bellOpen = false;
    const patientId = ((this.selectedPatient as any)?.patientid || (this.selectedPatient as any)?.id || '').toString();
    this.router.navigate(['/dashboard/ai-insights', patientId], { queryParams: { rec: recId } });
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
