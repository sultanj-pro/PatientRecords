import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  username: string = '';
  loading: boolean = false;
  error: string = '';
  sessionExpired: boolean = false;
  private returnUrl: string = '/dashboard';

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Check for returnUrl query param (indicates session timeout)
    this.route.queryParams.subscribe(params => {
      this.returnUrl = params['returnUrl'] || '/dashboard';
      // If returnUrl exists in query params, session expired
      this.sessionExpired = !!params['returnUrl'];
    });

    // If already authenticated and have valid token, redirect to dashboard
    if (this.authService.hasValidToken()) {
      this.router.navigate(['/dashboard']);
    }
  }

  onLogin(): void {
    if (!this.username.trim()) {
      this.error = 'Please enter a username';
      return;
    }

    this.loading = true;
    this.error = '';

    this.authService.login(this.username).subscribe(
      () => {
        this.loading = false;
        // Navigate to returnUrl or dashboard
        this.router.navigate([this.returnUrl]);
      },
      (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Login failed. Please try again.';
      }
    );
  }
}

