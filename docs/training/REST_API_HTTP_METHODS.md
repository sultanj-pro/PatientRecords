# HTTP Methods — REST API Design

## The Core Mental Model

The URL identifies the **resource**. The method describes what you want to **do** to it.

---

## The Methods

| Method | Intent | Body? | Idempotent? | Safe? |
|--------|--------|-------|-------------|-------|
| GET | Read | No | Yes | Yes |
| POST | Create | Yes | No | No |
| PUT | Replace (full update) | Yes | Yes | No |
| PATCH | Modify (partial update) | Yes | Yes* | No |
| DELETE | Remove | No | Yes | No |

**Idempotent** — calling it 10 times has the same effect as calling it once.  
**Safe** — never changes server state.

---

## URL Shapes

Every resource has two URL shapes:

```
Collection:  /medications        ← the whole list
Member:      /medications/:id    ← one specific record
```

---

## Full CRUD Pattern

```
GET    /medications         → list all
POST   /medications         → create new
GET    /medications/:id     → get one
PUT    /medications/:id     → replace (send full object)
PATCH  /medications/:id     → partial update (send only what changed)
DELETE /medications/:id     → remove
```

This pattern is universal — REST, Express, Django, Rails, Spring, Laravel. The technology changes, the shape does not.

---

## PUT vs PATCH

**PUT** — send the complete replacement object. Omitted fields get blanked out.

```json
PUT /medications/abc123
{
  "name": "Lisinopril",
  "dose": "10mg",
  "frequency": "daily",
  "prescribedBy": "Dr. Smith"
}
```

**PATCH** — send only what changed. Everything else stays as-is.

```json
PATCH /medications/abc123
{
  "dose": "20mg"
}
```

### When to use which

| Scenario | Use |
|----------|-----|
| Edit form — user submits all fields | PUT |
| Toggle a status flag | PATCH |
| Increment a counter | PATCH |
| Replace a record entirely | PUT |

---

## POST is Not Idempotent

```
POST /medications  (same body, called 3 times)
→ creates 3 separate medication records
```

POST always means "create a new thing." This is why duplicate-submission guards matter on forms — submitting twice creates two records.

---

## DELETE is Idempotent

```
DELETE /medications/abc123  →  204 No Content   (record deleted)
DELETE /medications/abc123  →  404 Not Found    (already gone)
```

Both responses are valid. The end state — "that record does not exist" — is the same either way.

---

## Standard Response Codes

| Method | Success Code | Meaning |
|--------|-------------|---------|
| GET | 200 OK | Resource returned |
| POST | 201 Created | New resource created |
| PUT | 200 OK | Resource replaced and returned |
| PATCH | 200 OK | Resource updated and returned |
| DELETE | 204 No Content | Resource deleted, nothing to return |
| Any | 400 Bad Request | Invalid input |
| Any | 401 Unauthorized | Not authenticated |
| Any | 403 Forbidden | Authenticated but not allowed |
| Any | 404 Not Found | Resource does not exist |
| Any | 409 Conflict | State conflict (e.g. duplicate) |
| Any | 500 Internal Server Error | Something went wrong server-side |

---

## PatientRecords Endpoint Reference

### Medications
```
GET    /api/medications/:patientId          ← list all (exists)
POST   /api/medications/:patientId          ← create new (exists)
PUT    /api/medications/:patientId/:id      ← full update (added in CRUD sprint)
DELETE /api/medications/:patientId/:id      ← remove (added in CRUD sprint)
```

### Labs
```
GET    /api/labs/:patientId                 ← list all (exists)
POST   /api/labs/:patientId                 ← create new (exists)
PUT    /api/labs/:patientId/:id             ← full update (added in CRUD sprint)
DELETE /api/labs/:patientId/:id             ← remove (added in CRUD sprint)
```

### Vitals
```
GET    /api/vitals/:patientId               ← list all (exists)
POST   /api/vitals/:patientId               ← create new (exists)
PUT    /api/vitals/:patientId/:id           ← full update (added in CRUD sprint)
DELETE /api/vitals/:patientId/:id           ← remove (added in CRUD sprint)
```
