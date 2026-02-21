import { Injectable } from '@angular/core';

/**
 * Service for JWT token management and expiration detection
 * Handles decoding, validation, and expiration checking
 */
@Injectable({
  providedIn: 'root'
})
export class TokenService {
  private readonly tokenKey = 'jwt_token';

  /**
   * Decode JWT token payload (Base64 decode)
   * JWT format: header.payload.signature
   */
  decodeToken(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid token format');
      }

      // Decode Base64 payload
      const payload = parts[1];
      const decoded = atob(payload);
      return JSON.parse(decoded);
    } catch (error) {
      console.error('Token decode error:', error);
      return null;
    }
  }

  /**
   * Get current token from localStorage
   */
  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  /**
   * Get token expiration timestamp (Unix seconds)
   */
  getTokenExpiration(): number | null {
    const token = this.getToken();
    if (!token) return null;

    const payload = this.decodeToken(token);
    return payload?.exp || null;
  }

  /**
   * Check if token has expired
   * Returns true if current time >= expiration time
   */
  isTokenExpired(): boolean {
    const expirationTimestamp = this.getTokenExpiration();
    if (!expirationTimestamp) return true; // No token or can't decode = expired

    const currentTimestamp = Math.floor(Date.now() / 1000);
    return currentTimestamp >= expirationTimestamp;
  }

  /**
   * Check if token is expiring soon
   * @param minutesBuffer - Number of minutes before expiration to consider "expiring soon"
   * Returns true if token expires within the buffer time
   */
  isTokenExpiringSoon(minutesBuffer: number = 5): boolean {
    const expirationTimestamp = this.getTokenExpiration();
    if (!expirationTimestamp) return true; // No token = treat as expired

    const currentTimestamp = Math.floor(Date.now() / 1000);
    const bufferSeconds = minutesBuffer * 60;
    const expirationThreshold = expirationTimestamp - bufferSeconds;

    return currentTimestamp >= expirationThreshold;
  }

  /**
   * Get remaining time until token expiration in milliseconds
   * Returns null if token doesn't exist or can't be decoded
   * Returns negative value if token already expired
   */
  getTimeUntilExpiration(): number | null {
    const expirationTimestamp = this.getTokenExpiration();
    if (!expirationTimestamp) return null;

    const currentTimestamp = Math.floor(Date.now() / 1000);
    const remainingSeconds = expirationTimestamp - currentTimestamp;
    return remainingSeconds * 1000; // Convert to milliseconds
  }

  /**
   * Get token expiration as Date object
   */
  getExpirationDate(): Date | null {
    const expirationTimestamp = this.getTokenExpiration();
    if (!expirationTimestamp) return null;

    return new Date(expirationTimestamp * 1000);
  }

  /**
   * Get formatted expiration time for display
   */
  getFormattedExpiration(): string | null {
    const date = this.getExpirationDate();
    if (!date) return null;

    return date.toLocaleString();
  }

  /**
   * Clear token from storage (used during logout)
   */
  clearToken(): void {
    localStorage.removeItem(this.tokenKey);
  }
}
