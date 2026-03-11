import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { PatientContextService } from '../../core/services/patient-context.service';
import { PatientSearchComponent } from '../patient-search/patient-search.component';

@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [CommonModule, PatientSearchComponent],
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.css']
})
export class NavigationComponent implements OnInit {
  currentUsername: string | null = null;
  currentRole: string | null = null;
  selectedPatient: any = null;
  searchVisible: boolean = false;

  @ViewChild(PatientSearchComponent) patientSearch!: PatientSearchComponent;

  constructor(
    private authService: AuthService,
    private router: Router,
    private patientContextService: PatientContextService
  ) {}

  ngOnInit(): void {
    this.currentUsername = this.authService.getUsername();
    this.currentRole = this.authService.getRole();
    
    // Subscribe to selected patient changes
    this.patientContextService.getSelectedPatient().subscribe(patient => {
      this.selectedPatient = patient;
      if (patient) {
        this.searchVisible = false; // Hide search when patient selected
      }
    });
  }

  toggleSearch(): void {
    this.searchVisible = !this.searchVisible;
    if (this.searchVisible) {
      // Focus on search input after it becomes visible
      setTimeout(() => {
        const input = document.querySelector('.header-search-input') as HTMLInputElement;
        if (input) input.focus();
      }, 0);
    }
  }

  getFullName(): string {
    if (this.selectedPatient) {
      const firstName = this.selectedPatient.firstName || this.selectedPatient.firstname || '';
      const lastName = this.selectedPatient.lastName || this.selectedPatient.lastname || '';
      return `${firstName} ${lastName}`.trim();
    }
    return '';
  }

  onLogout(): void {
    this.authService.logout();
    // Use setTimeout to ensure Angular has time to clean up the component
    setTimeout(() => {
      this.router.navigate(['/login']);
    }, 0);
  }
}
