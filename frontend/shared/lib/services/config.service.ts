import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Shared configuration service
 * Provides environment and API configuration to all modules
 */
@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private apiUrl = 'http://localhost:8001';
  private appName = 'PatientRecords';
  private appVersion = '1.0.0';

  constructor(private http: HttpClient) {}

  getApiUrl(): string {
    return this.apiUrl;
  }

  getAppName(): string {
    return this.appName;
  }

  getAppVersion(): string {
    return this.appVersion;
  }

  getEndpoint(resource: string): string {
    return `${this.apiUrl}${resource}`;
  }

  /**
   * Get dashboard configuration for current user role
   * Used to determine which modules are visible
   */
  getDashboardConfig(role: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/api/config/dashboard?role=${role}`);
  }
}
