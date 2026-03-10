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
    // Check for returnUrl in multiple places (in priority order)
    // 1. From query params (explicit deep link)
    // 2. From sessionStorage (saved by auth guard)
    // 3. Default to /dashboard
    
    this.route.queryParams.subscribe(params => {
      const paramReturnUrl = params['returnUrl'];
      console.log('[Login] returnUrl from query params:', paramReturnUrl);
      
      if (paramReturnUrl) {
        this.returnUrl = paramReturnUrl;
        this.sessionExpired = true;
      } else {
        // Try to get from sessionStorage (saved by guardian auth guard)
        const storedReturnUrl = sessionStorage.getItem('returnUrl');
        console.log('[Login] returnUrl from sessionStorage:', storedReturnUrl);
        
        if (storedReturnUrl && storedReturnUrl !== '/login') {
          this.returnUrl = storedReturnUrl;
        }
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

