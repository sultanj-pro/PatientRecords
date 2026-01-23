import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Patient {
  patientid: number;
  firstname: string;
  lastname: string;
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
}
