import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Patient } from '../models/index';

@Injectable({
  providedIn: 'root'
})
export class PatientContextService {
  private selectedPatient$ = new BehaviorSubject<Patient | null>(null);

  constructor() {}

  setSelectedPatient(patient: Patient): void {
    console.log('PatientContextService: Setting selected patient', patient);
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
