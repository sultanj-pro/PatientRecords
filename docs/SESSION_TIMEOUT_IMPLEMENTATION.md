# Session Timeout & Token Refresh Implementation Plan

**Date:** February 21, 2026  
**Status:** Documented (pending implementation)  
**Priority:** High - Session management & UX improvement

---

## Table of Contents
1. [Current State Analysis](#current-state-analysis)
2. [Problem Statement](#problem-statement)
3. [Solution Overview](#solution-overview)
4. [Implementation Strategy](#implementation-strategy)
5. [Detailed Implementation Steps](#detailed-implementation-steps)
6. [Technical Specifications](#technical-specifications)
7. [Key Decision Points](#key-decision-points)
8. [Expected Outcomes](#expected-outcomes)
9. [Testing Checklist](#testing-checklist)
10. [Future Enhancements](#future-enhancements)

---

## Current State Analysis

### ✅ Already in Place
- **Backend `/auth/login` endpoint** - Returns `accessToken` with 1 hour expiration
- **Backend `/auth/refresh` endpoint** - Accepts token and issues new one (uses `ignoreExpiration: true`)
- **AuthService** - Handles login/logout, stores token in localStorage
- **JwtInterceptor** (4 instances) - Adds Bearer token to all HTTP requests
  - `frontend/shell-app/src/app/core/interceptors/jwt.interceptor.ts`
  - `frontend/modules/vitals/src/app/core/interceptors/jwt.interceptor.ts`
  - `frontend/modules/medications/src/app/core/interceptors/jwt.interceptor.ts`
  - `frontend/modules/demographics/src/app/core/interceptors/jwt.interceptor.ts`

### ❌ Missing Components
- **401 Error Handling** - No response interceptor to catch expired token responses
- **Token Refresh Logic** - No automatic refresh when token expires
- **Navigation Preservation** - No mechanism to return user to original location after login
- **Token Expiration Detection** - No client-side token validation before API call
- **Auth Guard** - No route protection checking token validity
- **Session Management** - No tracking of token expiration or refresh status

---

## Problem Statement

**Current Behavior:**
When a JWT token expires (1 hour), the following happens:
1. User continues using the application unaware token is invalid
2. User clicks button/navigates → API returns 401 Unauthorized
3. **User is disconnected with no feedback**
4. **User loses their place in the application**
5. No way to recover without manual login

**User Experience Impact:**
- Lost work/context
- Confusion about authentication state
- Manual intervention required to restore state

**Business Impact:**
- Poor user experience
- Potential data loss
- Reduced productivity

---

## Solution Overview

### Two-Tier Approach

#### **Tier 1: Silent Token Refresh (Recommended)**
- Detect token expiration **before** it expires (5-minute buffer)
- Automatically refresh token in background
- User experiences **zero interruption**
- Seamless continuation of work

#### **Tier 2: Graceful Login Redirect (Fallback)**
- If silent refresh fails (token too stale)
- Capture current URL/route
- Redirect to login with `returnUrl` query parameter
- After re-login, automatically return to previous location
- User loses minimal context

---

## Implementation Strategy

### Phase 1: Backend Modifications (Minor Enhancement)
**File:** `backend/server.js`

**Current State:**
```javascript
app.post('/auth/refresh', (req, res) => {
  const { token } = req.body || {};
  if (!token) return res.status(400).json({ error: 'token required' });
  try {
    const payload = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
    const newToken = signToken(payload.sub, payload.role || 'nurse');
    return res.json({ accessToken: newToken, tokenType: 'Bearer', expiresIn: 3600 });
  } catch (err) {
    return res.status(401).json({ error: 'invalid token' });
  }
});
```

**Enhancement:**
- Consider adding response headers with token expiration time
- Future: Implement separate refresh tokens (HttpOnly cookies)
- Optional: Add refresh token rotation counter

**Recommendation for MVP:** Leave as-is, working well enough

---

### Phase 2: Frontend - Token Service (NEW)
**New File:** `frontend/shared/lib/services/token.service.ts`

**Purpose:** Decode JWT and determine expiration status

**Methods Required:**
- `isTokenExpired()` - Check if token's exp claim has passed
- `isTokenExpiringSoon(minutesBuffer: number)` - Check if expires within N minutes
- `getTokenExpiration()` - Return remaining milliseconds
- `decodeToken(token: string)` - Base64 decode JWT payload
- `getExpirationTimestamp()` - Return exp claim as Date

**Implementation Pattern:**
```typescript
// JWT structure: header.payload.signature
// Decode payload (Base64), parse JSON, check 'exp' claim (Unix timestamp)
// Compare with Date.now() / 1000
```

**Usage:**
```typescript
const tokenService = inject(TokenService);
if (tokenService.isTokenExpiringSoon(5)) {
  // Refresh now
}
```

---

### Phase 3: Frontend - Enhanced AuthService
**File:** `frontend/shell-app/src/app/core/services/auth.service.ts`

**New Methods:**
- `refresh(): Observable<AuthResponse>` - POST to `/auth/refresh`, update localStorage
- `refreshIfNeeded(): Observable<boolean>` - Auto-refresh if expiring soon (5 min buffer)
- `hasValidToken(): boolean` - Synchronously check token exists and not expired
- `saveReturnUrl(url: string): void` - Store current URL for post-login navigation
- `getAndClearReturnUrl(): string | null` - Retrieve and clear stored URL
- `getTokenExpirationDate(): Date | null` - Get when token expires

**Key Changes:**
```typescript
// New dependency
constructor(
  private http: HttpClient,
  private tokenService: TokenService  // NEW
) {}

// New method to refresh token
refresh(): Observable<AuthResponse> {
  const token = this.getToken();
  return this.http
    .post<AuthResponse>(`${this.apiUrl}/auth/refresh`, { token })
    .pipe(
      tap((response) => {
        localStorage.setItem(this.tokenKey, response.accessToken);
        // Token not expired, update authenticated state
        this.isAuthenticated$.next(true);
      }),
      catchError(() => {
        this.logout();
        return throwError(() => new Error('Token refresh failed'));
      })
    );
}

// Check if silent refresh is needed
refreshIfNeeded(): Observable<boolean> {
  if (this.tokenService.isTokenExpiringSoon(5)) {
    return this.refresh().pipe(map(() => true));
  }
  return of(false);
}
```

---

### Phase 4: Enhanced JWT Interceptor (All 4 Files)
**Files to Update:**
- `frontend/shell-app/src/app/core/interceptors/jwt.interceptor.ts`
- `frontend/modules/vitals/src/app/core/interceptors/jwt.interceptor.ts`
- `frontend/modules/medications/src/app/core/interceptors/jwt.interceptor.ts`
- `frontend/modules/demographics/src/app/core/interceptors/jwt.interceptor.ts`

**Current Implementation:**
```typescript
export class JwtInterceptor implements HttpInterceptor {
  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = localStorage.getItem('jwt_token');
    if (token) {
      request = request.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
      });
    }
    return next.handle(request);
  }
}
```

**Enhanced Implementation (Pattern):**
```typescript
export class JwtInterceptor implements HttpInterceptor {
  private hasRetried = false; // Prevent infinite retry loops

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = localStorage.getItem('jwt_token');
    
    if (token) {
      request = request.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
      });
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        // Handle 401 Unauthorized (token expired)
        if (error.status === 401 && !this.hasRetried) {
          this.hasRetried = true;
          
          // Try to refresh token
          return this.authService.refresh().pipe(
            switchMap(() => {
              // Refresh successful, retry original request with new token
              const newToken = localStorage.getItem('jwt_token');
              const retryRequest = request.clone({
                setHeaders: { Authorization: `Bearer ${newToken}` }
              });
              return next.handle(retryRequest);
            }),
            catchError((refreshError) => {
              // Refresh failed, redirect to login
              this.authService.saveReturnUrl(this.router.url);
              this.authService.logout();
              this.router.navigate(['/login'], { 
                queryParams: { returnUrl: this.router.url }
              });
              return throwError(() => refreshError);
            })
          );
        }

        // Reset retry flag for next request
        this.hasRetried = false;
        return throwError(() => error);
      })
    );
  }
}
```

**Key Features:**
- Single retry attempt (prevents infinite loops)
- Automatic token refresh on 401
- Preserves original request URL
- Cascading logout on double failure

---

### Phase 5: Auth Guard (NEW)
**New File:** `frontend/shell-app/src/app/core/guards/auth.guard.ts`

**Purpose:** Protect routes requiring authentication

**Implementation:**
```typescript
@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    if (!this.authService.hasValidToken()) {
      this.authService.saveReturnUrl(state.url);
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: state.url }
      });
      return false;
    }
    return true;
  }
}
```

**Route Configuration:**
```typescript
const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [AuthGuard]  // ← Protected
  },
  // ... other protected routes
];
```

---

### Phase 6: Updated Login Component
**File:** `frontend/shell-app/src/app/components/login/login.component.ts`

**Changes:**
1. Accept `returnUrl` query parameter
2. Extract from ActivatedRoute
3. Show "Session expired" message if redirected due to timeout
4. After successful login, navigate to `returnUrl` or default `/dashboard`

**Implementation Pattern:**
```typescript
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
    // Check for returnUrl query param
    this.route.queryParams.subscribe(params => {
      this.returnUrl = params['returnUrl'] || '/dashboard';
      this.sessionExpired = !!params['returnUrl']; // If returnUrl exists, session expired
    });

    if (this.authService.isAuthenticatedSync()) {
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
```

**Template Update:**
```html
<div *ngIf="sessionExpired" class="session-expired-banner">
  ⚠️ Your session has expired. Please log in again.
</div>
```

---

### Phase 7: Optional - Proactive Token Refresh
**Location:** Shell app initialization or per-route guard

**Purpose:** Refresh token before user encounters 401

**Implementation:**
- Add refresh check in AuthGuard or app initialization
- Scheduled token refresh (e.g., every 50 minutes if token is 1 hour)
- Or refresh on route activation

**Pattern:**
```typescript
// In app.component.ts or main bootstrap
ngOnInit() {
  this.authService.refreshIfNeeded().subscribe(
    (refreshed) => {
      if (refreshed) console.log('Token refreshed proactively');
    }
  );
}
```

---

## Detailed Implementation Steps

### Step-by-Step Execution Order

#### **1. Create TokenService** (1 hour)
- [ ] Create `frontend/shared/lib/services/token.service.ts`
- [ ] Implement JWT decoding logic
- [ ] Add expiration detection methods
- [ ] Unit test token expiration logic

#### **2. Update AuthService** (1.5 hours)
- [ ] Add TokenService dependency
- [ ] Implement `refresh()` method
- [ ] Implement `refreshIfNeeded()` method
- [ ] Implement `hasValidToken()` method
- [ ] Add URL storage (`saveReturnUrl()`, `getAndClearReturnUrl()`)
- [ ] Update error handling to catch 401 before interceptor

#### **3. Create AuthGuard** (30 minutes)
- [ ] Create `frontend/shell-app/src/app/core/guards/auth.guard.ts`
- [ ] Implement route protection logic
- [ ] Apply guard to dashboard and patient routes

#### **4. Update Interceptors** (2 hours)
- [ ] Update all 4 JWT interceptor files simultaneously
- [ ] Add 401 response handling
- [ ] Implement refresh retry logic
- [ ] Add catchError for failed refresh
- [ ] Test 401 handling locally

#### **5. Update LoginComponent** (1 hour)
- [ ] Import ActivatedRoute
- [ ] Extract `returnUrl` query parameter
- [ ] Add `sessionExpired` flag binding
- [ ] Update template with expiry banner
- [ ] Navigate to `returnUrl` after login

#### **6. Update App Routing** (30 minutes)
- [ ] Apply AuthGuard to protected routes
- [ ] Test route protection

#### **7. Integration Testing** (2-3 hours)
- [ ] Test manual token expiration
- [ ] Test silent refresh
- [ ] Test failed refresh + redirect
- [ ] Test returnUrl navigation
- [ ] Cross-module testing (all micro-frontends)

**Total Estimated Time:** 8-10 hours

---

## Technical Specifications

### JWT Token Structure
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyMSIsInJvbGUiOiJudXJzZSIsImlhdCI6MTcwMjgyNDAwMCwiZXhwIjoxNzAyODI3NjAwfQ.XXX
│                                          └─ Payload (Base64) ─┘
└─ Header ─┘                                  └─ Signature ─┘

Payload decoded:
{
  "sub": "user1",           // Subject (username)
  "role": "nurse",          // User role
  "iat": 1702824000,        // Issued at (Unix timestamp)
  "exp": 1702827600         // Expiration (Unix timestamp)
}
```

### API Endpoints
- **POST /auth/login** - `{ username: string }` → `{ accessToken, tokenType, expiresIn, role }`
- **POST /auth/refresh** - `{ token: string }` → `{ accessToken, tokenType, expiresIn }`
- **Protected endpoints** - Require `Authorization: Bearer <token>` header, return 401 if expired

### Storage Keys
- `jwt_token` - Current JWT access token
- `user_role` - User's role (admin, physician, nurse)
- `username` - Current username
- `returnUrl` - (Session only) URL from pre-login navigation

### Error Codes
- `401 Unauthorized` - Token expired or invalid
- `400 Bad Request` - Missing token in refresh request

---

## Key Decision Points

### 1. Refresh Token Strategy

**Current Approach (Selected for MVP):**
- Single token system
- Backend refreshes with `ignoreExpiration: true`
- Simple implementation, works well

**Alternative Approach (Future Enhancement):**
- Dual token system: `accessToken` (short-lived, 1h) + `refreshToken` (long-lived, 7d)
- RefreshToken stored in HttpOnly cookie
- More secure, prevents token theft from localStorage
- More complex implementation

**Decision:** Implement current approach now; migrate to dual tokens in Phase 6

---

### 2. Expiration Buffer Timing

**Proactive Refresh Buffer Options:**
- 5 minutes (conservative, safest)
- 10 minutes (more aggressive)
- 15 minutes (very aggressive, frequent refreshes)

**Decision:** Use 5-minute buffer (good balance)

---

### 3. User Notification Strategy

**Silent Refresh Approach:**
- User unaware refresh happened
- Zero visible changes
- Seamless experience

**Notify User Approach:**
- Show toast: "Session refreshing..."
- Show notification in toolbar
- More transparency but can feel invasive

**Decision:** Silent refresh for normal operation; only notify on session expiry

---

### 4. Retry Logic

**Single Retry (Selected):**
- Try refresh once on 401
- If fails, go to login
- Prevents infinite loops, clear failure path

**Multiple Retries:**
- Retry 2-3 times
- Exponential backoff
- More aggressive recovery
- Risk of circular retry loops

**Decision:** Single retry with clear fallback path

---

### 5. Route Protection Scope

**Options:**
- Protect all routes except login
- Protect only dashboard + patient routes
- Protect all API calls (already doing with interceptor)

**Decision:** AuthGuard on dashboard + patient routes; interceptor handles API-level protection

---

## Expected Outcomes

### Scenario 1: Normal Operation (Token Valid)
1. User logs in, receives 1-hour token
2. User navigates application normally
3. All API requests include Bearer token
4. Token is still valid when user completes tasks

**Result:** ✅ Seamless experience, no changes from current behavior

---

### Scenario 2: Proactive Refresh (Token Expiring Soon)
1. Token created at 10:00 AM
2. At 10:55 AM (5 min before expiry), proactive refresh runs
3. New token issued (valid until 11:55 AM)
4. User unaware of refresh

**Result:** ✅ Session extended automatically, zero interruption

---

### Scenario 3: Silent Refresh (Token Just Expired)
1. Token just expired, user clicks button
2. API returns 401 Unauthorized to interceptor
3. Interceptor calls `authService.refresh()` silently
4. Backend issues new token with `ignoreExpiration: true`
5. Interceptor retries original request with new token
6. Request succeeds, user sees no error

**Result:** ✅ Transparent recovery, work continues uninterrupted

---

### Scenario 4: Session Expired + API Unreachable
1. Token expired 2 hours ago
2. User clicks button → API returns 401
3. Interceptor attempts refresh
4. Backend unreachable or `ignoreExpiration` fails
5. Interceptor catches error, saves current URL, logs out
6. Redirects to `/login?returnUrl=/patients/123/vitals`
7. User logs in
8. System redirects to `/patients/123/vitals` automatically

**Result:** ✅ User returns to previous location, minimal context loss

---

### Scenario 5: Multiple Module Scenario
1. User in shell app + demographics micro-frontend
2. Demographics module makes API call
3. Token expired
4. Demographics JWT interceptor (same code) catches 401
5. Calls shared authService.refresh()
6. Retries request
7. Shell app remains responsive

**Result:** ✅ Cross-module token refresh coordination works seamlessly

---

## Testing Checklist

### Unit Testing
- [ ] TokenService correctly decodes JWT
- [ ] TokenService identifies expired tokens
- [ ] TokenService identifies expiring tokens (within buffer)
- [ ] AuthService.refresh() calls correct endpoint
- [ ] AuthService.refresh() updates localStorage
- [ ] AuthService.hasValidToken() returns correct boolean

### Integration Testing
- [ ] JwtInterceptor adds Bearer token to requests
- [ ] JwtInterceptor catches 401 responses
- [ ] JwtInterceptor initiates refresh on 401
- [ ] JwtInterceptor retries original request after refresh
- [ ] Failed refresh redirects to login with returnUrl

### End-to-End Testing
- [ ] Manual token expiration (modify JWT exp claim)
- [ ] Login → navigate → wait for expiry → click button → auto-refresh
- [ ] Refresh fails → redirect to login → returnUrl works
- [ ] Cross-module refresh (shell calls demographics API which expires)
- [ ] Mobile viewport - returnUrl navigation works on small screens
- [ ] Concurrent requests when token expires (all retry correctly)

### Manual QA Scenarios
1. **Fresh Login**
   - [ ] Login with valid credentials
   - [ ] Token stored in localStorage
   - [ ] Dashboard loads with data
   - [ ] User info displayed correctly

2. **Long Session (Proactive Refresh)**
   - [ ] Stay logged in 50+ minutes
   - [ ] No 401 errors occur
   - [ ] Continue using application normally
   - [ ] Open browser console, verify no errors

3. **Token Expiration**
   - [ ] Manually modify token exp claim in localStorage
   - [ ] Click any button that makes API call
   - [ ] Request succeeds after refresh
   - [ ] No error message shown to user

4. **Failed Refresh**
   - [ ] Stop backend service
   - [ ] Click button that makes API call
   - [ ] Redirected to login automatically
   - [ ] Query param shows returnUrl
   - [ ] Start backend service
   - [ ] Re-login
   - [ ] Automatically returned to previous page

5. **PreservingState Across Micro-Frontends**
   - [ ] Open demographics module (port 4201)
   - [ ] Expire token while viewing demographics
   - [ ] Navigate to vitals module (port 4202)
   - [ ] Both modules handle expired token correctly
   - [ ] Token refresh works in both contexts

---

## Future Enhancements

### Phase 6: Refresh Token Rotation
- Implement separate refresh token with longer lifetime (7 days)
- Store in HttpOnly cookie (more secure than localStorage)
- Refresh token rotation: new refresh token issued with each new access token
- Reduces security impact of compromised access token

### Phase 7: Session Activity Tracking
- Track last user activity (mouse, keyboard, API calls)
- Auto-logout after N minutes of inactivity (e.g., 30 min idle)
- Show "Session will expire in 5 minutes" warning
- User can click "Stay logged in" to start new session

### Phase 8: Biometric Re-authentication
- On session timeout (not inactivity), require face/fingerprint re-auth on supported devices
- Better security + UX than password re-entry

### Phase 9: Audit Logging
- Log all token refresh events
- Log all logout events (normal vs timeout)
- Track patterns (e.g., "user always logs out after 50 minutes")
- Investigate suspicious patterns

### Phase 10: Single Sign-On (SSO)
- Integrate with OAuth2/OIDC provider
- Support multiple users/roles
- Federated login
- Cross-application sessions

---

## Related Files & References

### Current Implementation
- Backend: `backend/server.js` (lines 15-180)
- AuthService: `frontend/shell-app/src/app/core/services/auth.service.ts`
- JwtInterceptor (×4): `frontend/{shell-app,modules/*}/src/app/core/interceptors/jwt.interceptor.ts`
- LoginComponent: `frontend/shell-app/src/app/components/login/login.component.ts`

### New Files to Create
1. `frontend/shared/lib/services/token.service.ts`
2. `frontend/shell-app/src/app/core/guards/auth.guard.ts`

### Files to Modify
1. `frontend/shell-app/src/app/core/services/auth.service.ts` (+150 lines)
2. `frontend/shell-app/src/app/core/interceptors/jwt.interceptor.ts` (+50 lines)
3. `frontend/modules/vitals/src/app/core/interceptors/jwt.interceptor.ts` (+50 lines)
4. `frontend/modules/medications/src/app/core/interceptors/jwt.interceptor.ts` (+50 lines)
5. `frontend/modules/demographics/src/app/core/interceptors/jwt.interceptor.ts` (+50 lines)
6. `frontend/shell-app/src/app/components/login/login.component.ts` (+30 lines)
7. `frontend/shell-app/src/app/components/login/login.component.html` (+3 lines)
8. `frontend/shell-app/src/app/app.routes.ts` (add AuthGuard to routes)

---

## Implementation Notes

### Common Pitfalls to Avoid
1. **Infinite Retry Loop** - Use `hasRetried` flag to prevent infinite 401 retries
2. **Lost User Context** - Always save URL before redirecting to login
3. **Token Not Updated** - Ensure interceptor reads NEW token from localStorage after refresh
4. **Concurrent Request Issues** - Multiple requests might all be retrying same token
   - Solution: Share single refresh Observable via RxJS subject
   - Or use request queuing mechanism
5. **Module Isolation** - All interceptors must use same AuthService instance (provided in root)
6. **Race Conditions** - Refresh request and original request might complete out of order
   - Solution: Use switchMap to ensure retry happens after refresh completes

### Performance Considerations
- Token decoding happens in TokenService (lightweight Base64 operation)
- Proactive refresh happens once per ~50 min (negligible overhead)
- Interceptor overhead: single 401 check per request (trivial)
- No additional network requests under normal operation

### Security Considerations
- Access token remains in localStorage (acceptable for healthcare web app)
- Do NOT store sensitive data in JWT payload (it's Base64 encoded, not encrypted)
- Verify token signature on backend (already doing: `jwt.verify()`)
- HttpOnly cookie preferred for refresh tokens (future enhancement)
- Implement CSRF protection on refresh endpoint (future enhancement)

### Backward Compatibility
- No breaking changes to existing API contracts
- Existing clients continue working (no interceptor changes visible to components)
- Refreshing session is additive feature (doesn't affect current flow)
- Safe to deploy; monitored rollout recommended

---

## Revision History

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2026-02-21 | 1.0 | GitHub Copilot | Initial implementation plan |

---

## Approval & Sign-off

- [ ] Technical Lead: Review and approve
- [ ] Security Review: Approve approach
- [ ] QA Lead: Review testing checklist
- [ ] Product Owner: Confirm UX requirements

---

## Questions & Contact

For questions regarding this implementation plan, contact:
- **Technical Lead:** [name]
- **Security Officer:** [name]

---

**Document Status:** Ready for Implementation  
**Next Step:** Begin Phase 1 - Create TokenService
