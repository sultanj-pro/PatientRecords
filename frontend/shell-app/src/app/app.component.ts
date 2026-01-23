import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { NavigationComponent } from './components/navigation/navigation.component';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavigationComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  isAuthenticated: boolean = false;

  constructor(private authService: AuthService) {
    this.isAuthenticated = this.authService.isAuthenticatedSync();
    this.authService.isAuthenticated().subscribe((auth) => {
      this.isAuthenticated = auth;
    });
  }
}
