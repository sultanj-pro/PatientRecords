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
    // Get returnUrl from sessionStorage (saved by auth guard)
    // Never use query params to avoid recursive nesting
    
    this.route.queryParams.subscribe(params => {
      const storedReturnUrl = sessionStorage.getItem('returnUrl');
      console.log('[Login] returnUrl from sessionStorage:', storedReturnUrl);
      
      if (storedReturnUrl && storedReturnUrl !== '/login') {
        this.returnUrl = storedReturnUrl;
      }
      
      console.log('[Login] Final returnUrl set to:', this.returnUrl);

      // If already authenticated and have valid token, redirect to returnUrl or dashboard
      if (this.authService.hasValidToken()) {
        console.log('[Login] Already authenticated, redirecting to:', this.returnUrl);
        this.router.navigateByUrl(this.returnUrl || '/dashboard');
      }
    });
  }

  onLogin(): void {
    if (!this.username.trim()) {
      this.error = 'Please enter a username';
      return;
    }

    this.loading = true;
    this.error = '';

    console.log('[Login] onLogin called, returnUrl is:', this.returnUrl);

    this.authService.login(this.username).subscribe(
      () => {
        this.loading = false;
        console.log('[Login] Login successful, navigating to:', this.returnUrl);
        // Navigate to returnUrl or dashboard
        this.router.navigateByUrl(this.returnUrl || '/dashboard');
      },
      (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Login failed. Please try again.';
      }
    );
  }
}

