import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { CareTeamMember } from './models/care-team.model';
import { PatientContextService } from './services/patient-context.service';

@Injectable({
  providedIn: 'root'
})
export class CareTeamService {
  private apiBaseUrl = 'http://localhost:5001'; // Backend URL
  private careTeamSubject = new BehaviorSubject<CareTeamMember[]>([]);
  public careTeam$ = this.careTeamSubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  private errorSubject = new BehaviorSubject<string | null>(null);
  public error$ = this.errorSubject.asObservable();

  constructor(
    private http: HttpClient,
    private patientContext: PatientContextService
  ) {}

  /**
   * Fetch care team members for a patient
   */
  fetchCareTeam(patientId: number): Observable<CareTeamMember[]> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    return this.http.get<CareTeamMember[]>(`${this.apiBaseUrl}/api/patients/${patientId}/care-team`).pipe(
      tap(members => {
        this.careTeamSubject.next(members);
        this.loadingSubject.next(false);
      }),
      catchError(error => {
        this.handleError(error);
        this.loadingSubject.next(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Add a new care team member
   */
  addCareTeamMember(patientId: number, member: Partial<CareTeamMember>): Observable<CareTeamMember> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    return this.http.post<CareTeamMember>(
      `${this.apiBaseUrl}/api/patients/${patientId}/care-team`,
      member
    ).pipe(
      tap(newMember => {
        const current = this.careTeamSubject.value;
        this.careTeamSubject.next([...current, newMember]);
        this.loadingSubject.next(false);
      }),
      catchError(error => {
        this.handleError(error);
        this.loadingSubject.next(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Update a care team member
   */
  updateCareTeamMember(patientId: number, memberId: string, updates: Partial<CareTeamMember>): Observable<CareTeamMember> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    return this.http.put<CareTeamMember>(
      `${this.apiBaseUrl}/api/patients/${patientId}/care-team/${memberId}`,
      updates
    ).pipe(
      tap(updatedMember => {
        const current = this.careTeamSubject.value;
        const index = current.findIndex(m => m.id === memberId);
        if (index >= 0) {
          const updated = [...current];
          updated[index] = updatedMember;
          this.careTeamSubject.next(updated);
        }
        this.loadingSubject.next(false);
      }),
      catchError(error => {
        this.handleError(error);
        this.loadingSubject.next(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Delete a care team member
   */
  deleteCareTeamMember(patientId: number, memberId: string): Observable<any> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    return this.http.delete(
      `${this.apiBaseUrl}/api/patients/${patientId}/care-team/${memberId}`
    ).pipe(
      tap(() => {
        const current = this.careTeamSubject.value;
        this.careTeamSubject.next(current.filter(m => m.id !== memberId));
        this.loadingSubject.next(false);
      }),
      catchError(error => {
        this.handleError(error);
        this.loadingSubject.next(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get care team members by role
   */
  getMembersByRole(role: string): CareTeamMember[] {
    return this.careTeamSubject.value.filter(m => m.role.toLowerCase().includes(role.toLowerCase()));
  }

  /**
   * Get primary care physician
   */
  getPrimaryCarePhysician(): CareTeamMember | undefined {
    return this.careTeamSubject.value.find(m => m.isPrimary);
  }

  /**
   * Clear care team data
   */
  clearCareTeam(): void {
    this.careTeamSubject.next([]);
    this.errorSubject.next(null);
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: HttpErrorResponse): void {
    let errorMessage = 'An error occurred while processing care team data';

    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      if (error.status === 404) {
        errorMessage = 'Care team member not found';
      } else if (error.status === 400) {
        errorMessage = error.error?.error || 'Invalid care team data';
      } else if (error.status === 401) {
        errorMessage = 'Unauthorized: Please log in again';
      } else if (error.status >= 500) {
        errorMessage = 'Server error: Please try again later';
      }
    }

    this.errorSubject.next(errorMessage);
    console.error('CareTeamService error:', errorMessage);
  }
}
