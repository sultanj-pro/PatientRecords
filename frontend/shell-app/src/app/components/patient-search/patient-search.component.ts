import { Component, OnInit, ViewChild, ElementRef, HostListener } from '@angular/core';
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
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
  @ViewChild('searchContainer') searchContainer!: ElementRef;

  searchQuery: string = '';
  patients: any[] = [];
  loading: boolean = false;
  error: string = '';
  highlightedIndex: number = -1;
  showResults: boolean = false;
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
          this.highlightedIndex = -1;
        }
      });
  }

  onSearchChange(query: string): void {
    this.searchQuery = query;
    this.highlightedIndex = -1;
    this.showResults = true;
    this.searchSubject.next(query);
  }

  onSearchFocus(): void {
    this.showResults = true;
    if (this.searchInput) {
      setTimeout(() => this.searchInput.nativeElement.focus(), 0);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    // Close results if clicking outside the search container
    if (this.searchContainer && !this.searchContainer.nativeElement.contains(event.target)) {
      this.showResults = false;
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    if (this.patients.length === 0 || !this.showResults) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.highlightedIndex = Math.min(this.highlightedIndex + 1, this.patients.length - 1);
        this.scrollToHighlighted();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.highlightedIndex = Math.max(this.highlightedIndex - 1, -1);
        this.scrollToHighlighted();
        break;
      case 'Enter':
        event.preventDefault();
        if (this.highlightedIndex >= 0) {
          this.selectPatient(this.patients[this.highlightedIndex]);
        }
        break;
      case 'Escape':
        event.preventDefault();
        this.showResults = false;
        this.highlightedIndex = -1;
        break;
    }
  }

  private scrollToHighlighted(): void {
    if (this.highlightedIndex >= 0) {
      setTimeout(() => {
        const items = document.querySelectorAll('.patient-item');
        if (items[this.highlightedIndex]) {
          items[this.highlightedIndex].scrollIntoView({ block: 'nearest' });
        }
      }, 0);
    }
  }

  performSearch(query: string): void {
    this.loading = true;
    this.error = '';
    this.highlightedIndex = -1;

    this.patientService.searchPatients(query).subscribe(
      (results: any) => {
        this.patients = results;
        this.loading = false;
        this.showResults = true;
        // Keep focus on input after results load
        if (this.searchInput) {
          setTimeout(() => this.searchInput.nativeElement.focus(), 0);
        }
      },
      (err: any) => {
        this.loading = false;
        this.error = 'Failed to search patients';
        console.error('Search error:', err);
        this.showResults = true;
      }
    );
  }

  selectPatient(patient: any): void {
    this.patientContextService.setSelectedPatient(patient);
    // Keep search query and results cached, just close the dropdown
    this.showResults = false;
    this.highlightedIndex = -1;
    this.router.navigate(['/dashboard', patient.id || patient.patientid]);
  }

  isHighlighted(index: number): boolean {
    return this.highlightedIndex === index;
  }

  getFullName(patient: any): string {
    if (!patient) return '';
    const firstName = patient.firstname || patient.firstName || '';
    const lastName = patient.lastname || patient.lastName || '';
    return `${firstName} ${lastName}`.trim();
  }

  trackByPatientId(index: number, patient: any): any {
    return patient.id || patient.patientid || index;
  }
}
