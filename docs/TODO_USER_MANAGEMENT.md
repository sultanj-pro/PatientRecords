# TODO: Implement Production User Management System

**Status:** Not Started  
**Priority:** High (for production deployment)  
**Date Created:** February 26, 2026

## Current State

The application uses a **development-only authentication system**:
- No user database
- Stateless JWT tokens
- Role assignment based on username pattern:
  - `admin` → admin role
  - `doc*` → physician role
  - other → nurse role
- Any username can login without credentials

**Location:** [backend/server.js](../backend/server.js#L197)

## Required Implementation

### 1. User MongoDB Collection
Create `users` collection with schema:
```javascript
{
  username: { type: String, unique: true, required: true },
  email: { type: String, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['admin', 'physician', 'nurse'], required: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
  lastLogin: { type: Date }
}
```

### 2. Authentication Changes
- Hash passwords using bcrypt before storage
- Validate username + password on `/auth/login`
- Return JWT token only if credentials valid
- Track last login timestamp

### 3. New Endpoints Needed
- `POST /auth/register` - Create new user (admin only)
- `POST /auth/change-password` - User password change
- `POST /auth/forgot-password` - Password reset flow
- `DELETE /auth/logout` - Invalidate tokens (optional)

### 4. Security Considerations
- Use bcrypt for password hashing (min 10 rounds)
- Implement rate limiting on login endpoint
- Add password complexity requirements
- Consider JWT refresh token rotation
- Add user session tracking

### 5. Admin Panel (Future)
- User CRUD operations
- Role assignment/modification
- Account deactivation
- Login audit logs

## Impact Areas
- backend/server.js - Auth endpoint modifications
- Frontend login form - Add password field (currently username-only)
- Database schema - Add users collection
- Documentation - Update auth API docs

## Testing Requirements
- Valid credentials → token issued
- Invalid credentials → 401 error
- Password validation rules enforced
- Role-based access control working
- Token refresh mechanism tested

---

**Implementation Notes:**
- This blocks any production-grade deployment
- Current system suitable for demos/development only
- Consider JWT token revocation list (blacklist) for logout
- May need to add multi-factor authentication later
