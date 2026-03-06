import { Component, OnInit, OnDestroy } from '@angular/core';
import { CareTeamService } from './care-team.service';
import { CareTeamMember } from './models/care-team.model';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface EditingMember {
  id: string;
  name: string;
  role: string;
  specialty?: string;
  phone?: string;
  email?: string;
  organization?: string;
  startDate?: string;
  isPrimary: boolean;
}

@Component({
  selector: 'app-care-team',
  templateUrl: './care-team.component.html',
  styleUrls: ['./care-team.component.css']
})
export class CareTeamComponent implements OnInit, OnDestroy {
  careTeamMembers: CareTeamMember[] = [];
  loading = false;
  error: string | null = null;
  
  showAddForm = false;
  editingMemberId: string | null = null;
  deletingMemberId: string | null = null;
  
  currentPatientId: number | null = null;
  
  newMemberForm: Partial<CareTeamMember> = {
    name: '',
    role: '',
    specialty: '',
    phone: '',
    email: '',
    organization: '',
    startDate: new Date(),
    isPrimary: false
  };

  editingMember: EditingMember | null = null;

  private destroy$ = new Subject<void>();
  private lastPatientId: string | null = null;

  // Common roles for dropdown
  commonRoles = [
    'Primary Care Physician',
    'Cardiologist',
    'Pulmonologist',
    'Endocrinologist',
    'Nephrologist',
    'Neurologist',
    'Psychiatrist',
    'Physical Therapist',
    'Occupational Therapist',
    'Nurse',
    'Care Coordinator',
    'Physician Assistant',
    'Nurse Practitioner',
    'Social Worker',
    'Nutritionist'
  ];

  // Common specialties
  commonSpecialties = [
    'Internal Medicine',
    'Cardiology',
    'Pulmonary Medicine',
    'Endocrinology',
    'Nephrology',
    'Neurology',
    'Psychiatry',
    'Physical Medicine',
    'Occupational Therapy',
    'Nursing',
    'Mental Health & Social Services',
    'Nutrition'
  ];

  constructor(
    private careTeamService: CareTeamService
  ) {}

  ngOnInit(): void {
    // Listen for patient context changes from the dashboard
    window.addEventListener('patient-context-changed', (event: any) => {
      console.log('Care Team: Received patient-context-changed event', event.detail);
      const newPatientId = event.detail?.patientId?.toString();
      if (newPatientId && newPatientId !== this.lastPatientId) {
        this.lastPatientId = newPatientId;
        this.currentPatientId = parseInt(newPatientId, 10);
        this.loadCareTeam();
      }
    });

    // Initial load
    this.loadPatientData();
    
    // Watch for patient changes every 500ms (as fallback)
    interval(500)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        const currentPatientId = this.getPatientIdFromStorage();
        if (currentPatientId && currentPatientId !== this.lastPatientId) {
          console.log('Care Team: Patient changed, reloading data', {
            old: this.lastPatientId,
            new: currentPatientId
          });
          this.lastPatientId = currentPatientId;
          this.currentPatientId = parseInt(currentPatientId, 10);
          this.loadCareTeam();
        }
      });

    this.careTeamService.careTeam$
      .pipe(takeUntil(this.destroy$))
      .subscribe(members => {
        this.careTeamMembers = members;
      });

    this.careTeamService.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => {
        this.loading = loading;
      });

    this.careTeamService.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => {
        this.error = error;
      });
  }

  private loadPatientData(): void {
    const patientId = this.getPatientIdFromStorage();
    if (patientId) {
      this.lastPatientId = patientId;
      this.currentPatientId = parseInt(patientId, 10);
      this.loadCareTeam();
    }
  }

  private getPatientIdFromStorage(): string | null {
    const contextStr = localStorage.getItem('__PATIENT_CONTEXT__');
    if (contextStr) {
      try {
        const context = JSON.parse(contextStr);
        if (context.patientId) return context.patientId;
      } catch (e) {
        console.warn('Care Team: Failed to parse patient context:', e);
      }
    }
    return null;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCareTeam(): void {
    if (this.currentPatientId) {
      this.careTeamService.fetchCareTeam(this.currentPatientId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          error: (err) => {
            console.error('Failed to load care team:', err);
          }
        });
    }
  }

  toggleAddForm(): void {
    this.showAddForm = !this.showAddForm;
    if (this.showAddForm) {
      this.resetForm();
    }
  }

  resetForm(): void {
    this.newMemberForm = {
      name: '',
      role: '',
      specialty: '',
      phone: '',
      email: '',
      organization: '',
      startDate: new Date(),
      isPrimary: false
    };
  }

  addCareTeamMember(): void {
    if (!this.newMemberForm.name || !this.newMemberForm.role) {
      this.error = 'Name and role are required';
      return;
    }

    if (!this.currentPatientId) return;

    this.careTeamService.addCareTeamMember(this.currentPatientId, this.newMemberForm)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showAddForm = false;
          this.resetForm();
          this.error = null;
        },
        error: (err) => {
          this.error = 'Failed to add care team member';
          console.error(err);
        }
      });
  }

  startEditing(member: CareTeamMember): void {
    this.editingMemberId = member.id;
    this.editingMember = {
      id: member.id,
      name: member.name,
      role: member.role,
      specialty: member.specialty,
      phone: member.phone,
      email: member.email,
      organization: member.organization,
      startDate: member.startDate ? new Date(member.startDate).toISOString().split('T')[0] : '',
      isPrimary: member.isPrimary
    };
  }

  cancelEditing(): void {
    this.editingMemberId = null;
    this.editingMember = null;
  }

  saveEdit(): void {
    if (!this.editingMember || !this.currentPatientId) return;

    if (!this.editingMember.name || !this.editingMember.role) {
      this.error = 'Name and role are required';
      return;
    }

    const updates: Partial<CareTeamMember> = {
      name: this.editingMember.name,
      role: this.editingMember.role,
      specialty: this.editingMember.specialty,
      phone: this.editingMember.phone,
      email: this.editingMember.email,
      organization: this.editingMember.organization,
      startDate: this.editingMember.startDate ? new Date(this.editingMember.startDate) : undefined,
      isPrimary: this.editingMember.isPrimary
    };

    this.careTeamService.updateCareTeamMember(this.currentPatientId, this.editingMember.id, updates)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.editingMemberId = null;
          this.editingMember = null;
          this.error = null;
        },
        error: (err) => {
          this.error = 'Failed to update care team member';
          console.error(err);
        }
      });
  }

  confirmedDelete(memberId: string): void {
    if (!this.currentPatientId) return;

    this.careTeamService.deleteCareTeamMember(this.currentPatientId, memberId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.deletingMemberId = null;
          this.error = null;
        },
        error: (err) => {
          this.error = 'Failed to delete care team member';
          console.error(err);
        }
      });
  }

  cancelDelete(): void {
    this.deletingMemberId = null;
  }

  getPrimaryMember(): CareTeamMember | undefined {
    return this.careTeamMembers.find(m => m.isPrimary);
  }

  getNonPrimaryMembers(): CareTeamMember[] {
    return this.careTeamMembers.filter(m => !m.isPrimary);
  }

  getMembersByRole(role: string): CareTeamMember[] {
    return this.careTeamMembers.filter(m => m.role.toLowerCase().includes(role.toLowerCase()));
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
}
