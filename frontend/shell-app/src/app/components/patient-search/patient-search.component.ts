import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { PatientService } from '../../core/services/patient.service';
import { PatientContextService } from '../../core/services/patient-context.service';

@Component({
  selector: 'app-patient-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './patient-search.component.html',
  styleUrls: ['./patient-search.component.css']
})
export class PatientSearchComponent implements OnInit {
  searchQuery: string = '';
  patients: any[] = [];
  loading: boolean = false;
  error: string = '';
  private searchSubject = new Subject<string>();

  constructor(
    private patientService: PatientService,
    private patientContextService: PatientContextService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Setup debounced search
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe((query) => {
        if (query.trim()) {
          this.performSearch(query);
        } else {
          this.patients = [];
        }
      });
  }

  onSearchChange(query: string): void {
    this.searchQuery = query;
    this.searchSubject.next(query);
  }

  performSearch(query: string): void {
    this.loading = true;
    this.error = '';

    this.patientService.searchPatients(query).subscribe(
      (results: any) => {
        this.patients = results;
        this.loading = false;
      },
      (err: any) => {
        this.loading = false;
        this.error = 'Failed to search patients';
        console.error('Search error:', err);
      }
    );
  }

  selectPatient(patient: any): void {
    this.patientContextService.setSelectedPatient(patient);
    this.router.navigate(['/dashboard', patient.id || patient.patientid]);
    this.searchQuery = '';
    this.patients = [];
  }

  getFullName(patient: any): string {
    return `${patient.firstname || patient.firstName || ''} ${patient.lastname || patient.lastName || ''}`;
  }
}
