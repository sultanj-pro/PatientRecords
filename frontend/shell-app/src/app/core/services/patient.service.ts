import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Patient {
  patientid: number;
  firstname: string;
  lastname: string;
  mrn?: number;
  dateOfBirth?: string;
}

export interface NewPatient {
  firstname: string;
  lastname: string;
  dateOfBirth?: string;
  gender?: string;
  mrn?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PatientService {
  private apiUrl = '/api';

  constructor(private http: HttpClient) {}

  searchPatients(query: string): Observable<Patient[]> {
    return this.http.get<Patient[]>(`${this.apiUrl}/patients`, {
      params: { q: query }
    });
  }

  getPatientById(id: number): Observable<Patient> {
    return this.http.get<Patient>(`${this.apiUrl}/patients/${id}`);
  }

  createPatient(data: NewPatient): Observable<Patient> {
    return this.http.post<Patient>(`${this.apiUrl}/patients`, data);
  }
}
