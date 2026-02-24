import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Patient {
  patientid: number;
  firstname: string;
  lastname: string;
  mrn?: number;
  dateOfBirth?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PatientContextService {
  private selectedPatient$ = new BehaviorSubject<Patient | null>(null);

  constructor() {}

  setSelectedPatient(patient: Patient): void {
    this.selectedPatient$.next(patient);
  }

  getSelectedPatient(): Observable<Patient | null> {
    return this.selectedPatient$.asObservable();
  }

  getCurrentPatient(): Patient | null {
    return this.selectedPatient$.value;
  }

  clearPatient(): void {
    this.selectedPatient$.next(null);
  }
}
