# Role-Based Module Loading

**Status:** ✅ Implemented — registry-driven, configurable at runtime

---

## Overview

Role-based module loading dynamically shows or hides micro-frontend modules based on the authenticated user's role. The system is registry-driven: visibility rules are stored in the Registry Service and can be changed at runtime through the Admin Dashboard without any code deployment.

---

## Roles

The system has three roles. Role is derived from the username at JWT issuance — no role field stored in the database.

| Username pattern | Assigned role |
|-----------------|---------------|
| `admin` | `admin` |
| Starts with `doc` | `physician` |
| Anything else | `nurse` |

Demo credentials: `admin / admin` · `doctor / doctor` · `nurse / nurse`

---

## Module Access Matrix

| Module | Port | admin | physician | nurse |
|--------|------|-------|-----------|-------|
| Demographics | 4201 | ✓ | ✓ | ✓ |
| Vitals | 4202 | ✓ | ✓ | ✓ |
| Labs | 4203 | ✓ | ✓ | ✗ |
| Medications | 4204 | ✓ | ✓ | ✗ |
| Visits | 4205 | ✓ | ✓ | ✗ |
| Care Team | 4206 | ✓ | ✓ | ✗ |
| Procedures | 4207 | ✓ | ✓ | ✗ |
| Admin Panel | — | ✓ | ✗ | ✗ |

> **Note:** The nurse column above reflects the default registry configuration. Any module can be enabled or disabled per role at runtime through the Admin Dashboard (`/admin`). No code deployment is required.

---

## Architecture

### 1. Role Derivation (Auth Service)

At `/auth/login`, the Auth Service inspects the username:

```js
function roleFromUsername(username) {
  if (username === 'admin') return 'admin';
  if (username.startsWith('doc')) return 'physician';
  return 'nurse';
}
```

The role is embedded in the JWT as a single string: `{ role: 'physician' }`.

### 2. Registry Service (Port 5100)

The Registry Service stores module metadata including per-role visibility:

```json
{
  "name": "demographics",
  "port": 4201,
  "enabled": true,
  "allowedRoles": ["admin", "physician", "nurse"]
}
```

The shell app fetches the current registry at startup via `GET /api/modules`. Modules not in `allowedRoles` for the user's role are not loaded or displayed.

### 3. Shell App — Module Loader Service

On login, the shell app:
1. Extracts `role` from the JWT
2. Calls `GET /api/modules` to get the registry
3. Filters modules where `allowedRoles.includes(role)`
4. Dynamically loads only the allowed modules via Webpack Module Federation

### 4. Admin Dashboard — Runtime Management

Admin users can:
- Enable or disable any module system-wide
- Add or remove role from a module's `allowedRoles`

Changes take effect on next user login (registry re-fetched).

---

## Data Flow

```
User Login (username/password)
        ↓
Auth Service derives role from username
        ↓
JWT issued with { role: 'physician' }
        ↓
Shell App receives JWT
        ↓
GET /api/modules → Registry Service returns module list
        ↓
Filter: modules where allowedRoles.includes('physician')
        ↓
Webpack Module Federation loads allowed remotes
        ↓
Dashboard displays tabs for allowed modules only
        ↓
User clicks module tab
        ↓
Module component fetches patient data from API
        ↓
Data displayed
```

---

## Module Load Timing

| Load type | Approximate time |
|-----------|-----------------|
| First load (cold, network fetch) | ~500–700 ms |
| Subsequent load (cached) | ~10–50 ms |

Modules are cached in memory after the first load. Navigating away and back does not re-fetch the remote bundle.