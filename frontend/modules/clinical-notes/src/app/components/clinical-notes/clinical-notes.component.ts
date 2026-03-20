import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HTTP_INTERCEPTORS } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { JwtInterceptor } from '../../core/interceptors/jwt.interceptor';

type NoteType = 'observation' | 'diagnostic' | 'prognosis' | 'plan' | 'general';

interface ClinicalNote {
  _id: string;
  patientId: number;
  type: NoteType;
  content: string;
  providerId: string;
  providerName: string;
  providerRole: string;
  createdAt: string;
  updatedAt: string;
}

interface NewNoteForm {
  type: NoteType;
  content: string;
}

@Component({
  selector: 'app-clinical-notes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: JwtInterceptor, multi: true }
  ],
  templateUrl: './clinical-notes.component.html',
  styleUrls: ['./clinical-notes.component.css']
})
export class ClinicalNotesComponent implements OnInit, OnDestroy {
  patientId: string | null = null;

  notes: ClinicalNote[] = [];
  loading = true;
  error: string | null = null;

  // Filter
  activeFilter: NoteType | 'all' = 'all';
  readonly typeFilters: Array<{ value: NoteType | 'all'; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'observation', label: 'Observations' },
    { value: 'diagnostic', label: 'Diagnostics' },
    { value: 'prognosis', label: 'Prognosis' },
    { value: 'plan', label: 'Care Plans' },
    { value: 'general', label: 'General' },
  ];

  // Create note form
  showCreateForm = false;
  submitting = false;
  newNote: NewNoteForm = { type: 'observation', content: '' };

  // Edit state
  editingId: string | null = null;
  editContent = '';
  editType: NoteType = 'observation';
  savingEdit = false;

  // Delete state
  deletingId: string | null = null;

  private destroy$ = new Subject<void>();
  private readonly apiBase = 'http://localhost:5000';

  constructor(private http: HttpClient, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const id = params['patientId'];
      if (id) {
        this.patientId = id;
        this.loadNotes();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Computed ────────────────────────────────────────────────────────────────

  get filteredNotes(): ClinicalNote[] {
    if (this.activeFilter === 'all') return this.notes;
    return this.notes.filter(n => n.type === this.activeFilter);
  }

  get currentUserId(): string {
    try {
      const token = localStorage.getItem('jwt_token');
      if (!token) return '';
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.id || payload.sub || payload.username || '';
    } catch {
      return '';
    }
  }

  canEdit(note: ClinicalNote): boolean {
    const uid = this.currentUserId;
    return uid === note.providerId || this.isAdmin();
  }

  isAdmin(): boolean {
    try {
      const token = localStorage.getItem('jwt_token');
      if (!token) return false;
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.role === 'admin';
    } catch {
      return false;
    }
  }

  // ── Data loading ────────────────────────────────────────────────────────────

  loadNotes(): void {
    if (!this.patientId) return;
    this.loading = true;
    this.error = null;

    this.http.get<{ notes: ClinicalNote[]; count: number }>(`${this.apiBase}/api/patients/${this.patientId}/notes?limit=50`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp) => {
          this.notes = resp?.notes || [];
          this.loading = false;
        },
        error: (err) => {
          this.error = err?.error?.error || 'Failed to load clinical notes.';
          this.loading = false;
        }
      });
  }

  // ── Create ───────────────────────────────────────────────────────────────────

  openCreateForm(): void {
    this.showCreateForm = true;
    this.newNote = { type: 'observation', content: '' };
  }

  cancelCreate(): void {
    this.showCreateForm = false;
  }

  submitNote(): void {
    if (!this.patientId || !this.newNote.content.trim()) return;
    this.submitting = true;

    this.http.post<ClinicalNote>(
      `${this.apiBase}/api/patients/${this.patientId}/notes`,
      this.newNote
    ).pipe(takeUntil(this.destroy$)).subscribe({
      next: (note) => {
        this.notes = [note, ...this.notes];
        this.showCreateForm = false;
        this.submitting = false;
        this.newNote = { type: 'observation', content: '' };
      },
      error: (err) => {
        this.error = err?.error?.error || 'Failed to save note.';
        this.submitting = false;
      }
    });
  }

  // ── Edit ────────────────────────────────────────────────────────────────────

  startEdit(note: ClinicalNote): void {
    this.editingId = note._id;
    this.editContent = note.content;
    this.editType = note.type;
  }

  cancelEdit(): void {
    this.editingId = null;
  }

  saveEdit(note: ClinicalNote): void {
    if (!this.editContent.trim()) return;
    this.savingEdit = true;

    this.http.put<ClinicalNote>(`${this.apiBase}/api/notes/${note._id}`, {
      content: this.editContent,
      type: this.editType
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (updated) => {
        const idx = this.notes.findIndex(n => n._id === note._id);
        if (idx !== -1) this.notes[idx] = updated;
        this.editingId = null;
        this.savingEdit = false;
      },
      error: (err) => {
        this.error = err?.error?.error || 'Failed to update note.';
        this.savingEdit = false;
      }
    });
  }

  // ── Delete ───────────────────────────────────────────────────────────────────

  deleteNote(note: ClinicalNote): void {
    if (!confirm('Delete this note? This action cannot be undone.')) return;
    this.deletingId = note._id;

    this.http.delete(`${this.apiBase}/api/notes/${note._id}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notes = this.notes.filter(n => n._id !== note._id);
          this.deletingId = null;
        },
        error: (err) => {
          this.error = err?.error?.error || 'Failed to delete note.';
          this.deletingId = null;
        }
      });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  typeBadgeClass(type: NoteType): string {
    const map: Record<NoteType, string> = {
      observation: 'badge-observation',
      diagnostic: 'badge-diagnostic',
      prognosis: 'badge-prognosis',
      plan: 'badge-plan',
      general: 'badge-general'
    };
    return map[type] || 'badge-general';
  }

  typeLabel(type: NoteType): string {
    const map: Record<NoteType, string> = {
      observation: 'Observation',
      diagnostic: 'Diagnostic',
      prognosis: 'Prognosis',
      plan: 'Care Plan',
      general: 'General'
    };
    return map[type] || type;
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  setFilter(f: NoteType | 'all'): void {
    this.activeFilter = f;
  }

  readonly noteTypes: NoteType[] = ['observation', 'diagnostic', 'prognosis', 'plan', 'general'];

  countByType(type: NoteType | 'all'): number {
    if (type === 'all') return this.notes.length;
    return this.notes.filter(n => n.type === type).length;
  }
}
