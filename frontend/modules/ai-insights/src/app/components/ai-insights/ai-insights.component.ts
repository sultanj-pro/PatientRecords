import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HTTP_INTERCEPTORS } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { JwtInterceptor } from '../../core/interceptors/jwt.interceptor';

interface Finding {
  type: string;
  severity: string;
  title: string;
  description: string;
  recommendation: string;
  [key: string]: any;
}

interface Recommendation {
  _id: string;
  patientId: string;
  status: 'pending' | 'approved' | 'dismissed';
  findings: Finding[];
  createdAt: string;
  updatedAt: string;
  llmSummary?: string | null;
  [key: string]: any;
}

interface Notification {
  _id: string;
  patientId: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  status: 'pending' | 'acknowledged';
  createdAt: string;
}

@Component({
  selector: 'app-ai-insights',
  standalone: true,
  imports: [CommonModule],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: JwtInterceptor, multi: true }
  ],
  templateUrl: './ai-insights.component.html',
  styleUrls: ['./ai-insights.component.css']
})
export class AiInsightsComponent implements OnInit, OnDestroy {
  patientId: string | null = null;

  // Recommendations
  recommendations: Recommendation[] = [];
  loadingRecs = true;
  analyzing = false;
  resetting = false;
  showResetConfirm = false;
  recError: string | null = null;

  // Which recommendation is expanded
  expandedRecId: string | null = null;

  // LLM summary collapsible state (expanded by default when available)
  llmExpanded = new Set<string>();

  // Approve / dismiss state
  actioning = new Set<string>();

  // Streaming LLM summary state
  streamingRecId: string | null = null;
  streamingSummary = '';
  streamingDone = false;
  streamingPhase = '';

  // Notifications
  notifications: Notification[] = [];
  loadingNotifs = false;
  acknowledgingId: string | null = null;

  private destroy$ = new Subject<void>();
  private readonly apiBase = '';

  /** Role decoded from the JWT payload — no verification needed client-side. */
  readonly userRole: string = (() => {
    try {
      const token = localStorage.getItem('jwt_token');
      if (!token) return 'nurse';
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.role || 'nurse';
    } catch {
      return 'nurse';
    }
  })();

  /** Only physicians and admins may approve or dismiss recommendations. */
  get canApprove(): boolean {
    return this.userRole === 'physician' || this.userRole === 'admin';
  }

  constructor(private http: HttpClient, private route: ActivatedRoute, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const id = params['patientId'];
      if (id) {
        this.patientId = id;
        localStorage.setItem('selectedPatientId', id);
        this.loadRecommendations();
        this.loadNotifications();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Data loading ────────────────────────────────────────────────────────────

  loadRecommendations(): void {
    if (!this.patientId) return;
    this.loadingRecs = true;
    this.recError = null;

    this.http.get<Recommendation[]>(`${this.apiBase}/api/ai/recommendations/${this.patientId}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (recs) => {
          this.recommendations = recs || [];
          // Auto-expand the most recent pending recommendation
          const firstPending = this.recommendations.find(r => r.status === 'pending');
          if (firstPending) this.expandedRecId = firstPending._id;
          // Auto-expand LLM summary for any rec that has one
          this.recommendations.forEach(r => { if (r.llmSummary) this.llmExpanded.add(r._id); });
          this.loadingRecs = false;
        },
        error: (err) => {
          this.recError = err?.error?.error || 'Failed to load recommendations.';
          this.loadingRecs = false;
        }
      });
  }

  loadNotifications(): void {
    if (!this.patientId) return;
    this.loadingNotifs = true;

    this.http.get<{ notifications: Notification[] }>(`${this.apiBase}/api/notifications/${this.patientId}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp) => {
          this.notifications = (resp?.notifications || []).filter(n => n.status === 'pending');
          this.loadingNotifs = false;
        },
        error: () => {
          // Notifications are non-critical — fail silently
          this.loadingNotifs = false;
        }
      });
  }

  // ── Generate analysis ────────────────────────────────────────────────────────

  generateAnalysis(): void {
    if (!this.patientId || this.analyzing) return;
    this.analyzing = true;
    this.recError = null;
    this.streamingPhase = 'Fetching patient data…';
    this.streamingRecId = null;
    this.streamingSummary = '';
    this.streamingDone = false;

    const token = localStorage.getItem('jwt_token');
    fetch(`${this.apiBase}/api/ai/recommend-stream/${this.patientId}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }).then(async (response) => {
      if (!response.ok || !response.body) {
        this.recError = 'AI analysis failed. Please try again.';
        this.analyzing = false;
        this.streamingPhase = '';
        this.cdr.markForCheck();
        return;
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let recId: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') {
            if (recId) {
              const rec = this.recommendations.find(r => r._id === recId);
              if (rec) {
                rec.llmSummary = this.streamingSummary;
                this.llmExpanded.add(recId);
              }
            }
            this.streamingRecId = null;
            this.streamingPhase = '';
            this.analyzing = false;
            this.loadNotifications();
            this.cdr.markForCheck();
            return;
          }
          try {
            const parsed = JSON.parse(payload);
            if (parsed.type === 'phase') {
              this.streamingPhase = parsed.message;
              this.cdr.markForCheck();
            } else if (parsed.type === 'rec') {
              const rec = parsed.rec;
              this.recommendations = [rec, ...this.recommendations];
              this.expandedRecId = rec._id;
              recId = rec._id;
              this.streamingRecId = rec._id;
              this.streamingSummary = '';
              this.streamingPhase = '';
              this.cdr.markForCheck();
            } else if (parsed.type === 'token') {
              if (parsed.t) {
                this.streamingSummary += parsed.t;
                this.cdr.markForCheck();
              }
            } else if (parsed.type === 'error') {
              this.recError = parsed.message || 'AI analysis failed.';
              this.analyzing = false;
              this.streamingPhase = '';
              this.streamingRecId = null;
              this.cdr.markForCheck();
            }
          } catch { /* ignore malformed SSE lines */ }
        }
      }
    }).catch(() => {
      this.recError = 'AI analysis failed. Please try again.';
      this.analyzing = false;
      this.streamingPhase = '';
      this.cdr.markForCheck();
    });
  }

  // ── Reset analysis history ───────────────────────────────────────────────────

  confirmReset(): void {
    this.showResetConfirm = true;
  }

  cancelReset(): void {
    this.showResetConfirm = false;
  }

  resetAnalysis(): void {
    if (!this.patientId || this.resetting) return;
    this.resetting = true;
    this.showResetConfirm = false;
    this.recError = null;

    this.http.delete(`${this.apiBase}/api/ai/recommendations/${this.patientId}/all`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.recommendations = [];
          this.expandedRecId = null;
          this.llmExpanded.clear();
          this.resetting = false;
        },
        error: (err) => {
          this.recError = err?.error?.error || 'Failed to reset analysis history.';
          this.resetting = false;
        }
      });
  }

  // ── Approve / Dismiss ────────────────────────────────────────────────────────

  approve(rec: Recommendation): void {
    if (this.actioning.has(rec._id)) return;
    this.actioning.add(rec._id);

    this.http.post<Recommendation>(`${this.apiBase}/api/ai/recommendations/${rec._id}/approve`, {})
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.updateRec(updated);
          this.actioning.delete(rec._id);
        },
        error: (err) => {
          alert(err?.error?.error || 'Could not approve recommendation.');
          this.actioning.delete(rec._id);
        }
      });
  }

  dismiss(rec: Recommendation): void {
    if (this.actioning.has(rec._id)) return;
    this.actioning.add(rec._id);

    this.http.post<Recommendation>(`${this.apiBase}/api/ai/recommendations/${rec._id}/dismiss`, {})
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.updateRec(updated);
          this.actioning.delete(rec._id);
        },
        error: (err) => {
          alert(err?.error?.error || 'Could not dismiss recommendation.');
          this.actioning.delete(rec._id);
        }
      });
  }

  private updateRec(updated: Recommendation): void {
    const idx = this.recommendations.findIndex(r => r._id === updated._id);
    if (idx !== -1) this.recommendations[idx] = updated;
  }

  // ── Notifications ────────────────────────────────────────────────────────────

  acknowledge(notif: Notification): void {
    if (this.acknowledgingId === notif._id) return;
    this.acknowledgingId = notif._id;

    this.http.post<any>(`${this.apiBase}/api/notifications/${notif._id}/acknowledge`, {})
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notifications = this.notifications.filter(n => n._id !== notif._id);
          this.acknowledgingId = null;
        },
        error: () => { this.acknowledgingId = null; }
      });
  }

  // ── Template helpers ──────────────────────────────────────────────────────────

  toggleExpand(id: string): void {
    this.expandedRecId = this.expandedRecId === id ? null : id;
  }

  isExpanded(id: string): boolean {
    return this.expandedRecId === id;
  }

  toggleLlm(id: string): void {
    if (this.llmExpanded.has(id)) {
      this.llmExpanded.delete(id);
    } else {
      this.llmExpanded.add(id);
    }
  }

  isLlmExpanded(id: string): boolean {
    return this.llmExpanded.has(id);
  }

  isActioning(id: string): boolean {
    return this.actioning.has(id);
  }

  severityClass(severity: string): string {
    const map: Record<string, string> = {
      critical: 'sev-critical',
      high:     'sev-high',
      moderate: 'sev-moderate',
      medium:   'sev-medium',
      low:      'sev-low',
    };
    return map[severity?.toLowerCase()] || 'sev-low';
  }

  severityIcon(severity: string): string {
    const map: Record<string, string> = {
      critical: '🚨',
      high:     '⚠️',
      moderate: '🔔',
      medium:   '🔔',
      low:      'ℹ️',
    };
    return map[severity?.toLowerCase()] || 'ℹ️';
  }

  findingTypeLabel(type: string): string {
    const map: Record<string, string> = {
      'drug-interaction':       '💊 Drug Interaction',
      'contraindication':       '🚫 Contraindication',
      'renal-dose-adjustment':  '🩺 Renal Dose',
      'duplicate-therapy':      '♻️ Duplicate Therapy',
      'critical-value':         '🚨 Critical Value',
      'missing-baseline-lab':   '🔬 Missing Lab',
      'stale-lab':              '📅 Stale Lab',
      'deterioration-trend':    '📉 Trend Alert',
      'vital-triggered-lab':    '❤️ Vital Alert',
      'event-escalation':       '🔔 Escalation',
      'visit-overdue':          '📋 Visit Overdue',
      'care-gap':               '🏥 Care Gap',
      'medication-review':      '💊 Med Review',
    };
    return map[type] || type;
  }

  findingsBySeverity(findings: Finding[]): Finding[] {
    const order: Record<string, number> = { critical: 0, high: 1, moderate: 2, medium: 3, low: 4 };
    return [...findings].sort((a, b) =>
      (order[a.severity?.toLowerCase()] ?? 9) - (order[b.severity?.toLowerCase()] ?? 9)
    );
  }

  countBySeverity(findings: Finding[], severity: string): number {
    return findings.filter(f => f.severity?.toLowerCase() === severity).length;
  }

  formatDate(iso: string): string {
    if (!iso) return 'Unknown';
    return new Date(iso).toLocaleString();
  }

  get hasPendingRec(): boolean {
    return this.recommendations.some(r => r.status === 'pending');
  }

  // ── LLM streaming ────────────────────────────────────────────────────────────

  async streamSummary(recId: string): Promise<void> {
    this.streamingRecId = recId;
    this.streamingSummary = '';
    this.streamingDone = false;
    const token = localStorage.getItem('jwt_token');
    try {
      const response = await fetch(`${this.apiBase}/api/ai/recommendations/${recId}/stream-summary`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!response.ok || !response.body) {
        this.streamingRecId = null;
        return;
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') {
            const rec = this.recommendations.find(r => r._id === recId);
            if (rec) {
              rec.llmSummary = this.streamingSummary;
              this.llmExpanded.add(recId);
            }
            this.streamingDone = true;
            this.streamingRecId = null;
            this.cdr.markForCheck();
            return;
          }
          try {
            const parsed = JSON.parse(payload);
            if (parsed.t) {
              this.streamingSummary += parsed.t;
              this.cdr.markForCheck();
            }
          } catch { /* ignore malformed SSE chunks */ }
        }
      }
    } catch {
      this.streamingRecId = null;
    }
  }
}
