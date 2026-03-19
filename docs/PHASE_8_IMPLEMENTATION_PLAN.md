# Phase 8 Implementation Plan — AI Multi-Agent System

**Branch:** `feature/phase8-ai-multiagent`  
**Base:** `feature/microservices-architecture` (Phase 7 complete)  
**Roadmap reference:** [PHASE_8_AI_MULTIAGENT_ROADMAP.md](PHASE_8_AI_MULTIAGENT_ROADMAP.md)  
**Architecture diagram:** [system-architecture-v2.svg](diagrams/system-architecture-v2.svg)

---

## Legal Disclaimer

> **Completing this implementation plan does not make the system certified, compliant, or cleared under any regulatory framework.**
>
> The HIPAA-aligned practices, audit logging, human-in-the-loop controls, and security hardening described in this plan represent sound engineering practice for handling sensitive health data. They do **not** constitute HIPAA certification, FDA clearance, or any other regulatory approval — and no such claim should be made.
>
> Milestone 8.8 (Hardening) is an engineering milestone, not a compliance certification milestone. Independent legal, clinical, and regulatory review is required before this system is used in any patient-facing or clinical-decision context.

---

## Guiding Constraints

- No changes to existing domain service business logic (auth, patient, vitals, labs, medications, visits, care-team, registry)
- Every existing API endpoint and docker-compose service continues to work unchanged
- All new services follow the same Node.js/Express pattern as current microservices
- All PHI handling reviewed before any external LLM API is called
- Human-in-the-loop approval is wired in from day one — not retrofitted later

---

## Milestone Overview

| Milestone | Focus | Deliverable |
|---|---|---|
| **8.1** | Infrastructure foundation | Redis + event publishing in domain services |
| **8.2** | AI Orchestrator skeleton | Gateway route + context assembly + approval model |
| **8.3** | Medication Agent | Rule-based first, LLM tool-calling second |
| **8.4** | Labs Agent | Rule-based first, LLM tool-calling second |
| **8.5** | Comms Agent | Event subscription + notification dispatch |
| **8.6** | Frontend integration | Recommendations panel + approval flow UI |
| **8.7** | LLM integration | Replace rule-based with real LLM (on-premises or cloud) |
| **8.8** | Hardening | Security audit, load test, HIPAA review, observability |

Each milestone ends with a working, committable state. Later milestones do not depend on LLM being wired in — rule-based stubs keep everything testable end-to-end early.

---

## Milestone 8.1 — Infrastructure Foundation

**Goal:** Redis Event Bus running in docker-compose; domain services publishing events on write; no other changes to service logic.

### Tasks

#### 8.1.1 — Add Redis to docker-compose

**File:** `docker-compose.yml`

```yaml
patientrecord-redis:
  image: redis:7-alpine
  container_name: patientrecord-redis
  ports:
    - "6379:6379"
  command: redis-server --appendonly yes
  volumes:
    - redis-data:/data
  networks:
    - patientrecord-network
  restart: unless-stopped
  healthcheck:
    test: ["CMD", "redis-cli", "ping"]
    interval: 10s
    timeout: 5s
    retries: 3
```

Add `redis-data` to the top-level `volumes:` block.

**Acceptance criteria:** `docker compose up` includes Redis; `docker exec patientrecord-redis redis-cli ping` returns `PONG`.

---

#### 8.1.2 — Create shared event publisher module

**New file:** `backend/shared/eventPublisher.js`

Responsibilities:
- Connect to Redis using `ioredis`
- Expose `publish(streamName, eventType, patientId, payload)` function
- Write to a Redis Stream (`XADD`)
- Fail silently (log error, do not crash the domain service) — events are best-effort, not transactional
- Include `serviceId`, `timestamp`, `eventType`, `patientId`, and `payload` in every message

Install dependency: `ioredis` — add to `backend/package.json`

**Message schema:**
```json
{
  "eventType": "labs-resulted",
  "serviceId": "labs-service",
  "patientId": "...",
  "timestamp": "2026-03-19T12:00:00.000Z",
  "payload": {}
}
```

**Acceptance criteria:** Unit test confirms `XADD` is called with correct fields; Redis stream `patientrecord-events` is visible via `XRANGE patientrecord-events - +`.

---

#### 8.1.3 — Instrument domain services to publish events

Add a call to `eventPublisher.publish()` after successful DB writes in each service. No changes to request/response contracts.

| Service | Event to publish | Trigger |
|---|---|---|
| labs-service | `labs-resulted` | POST /labs (new result created) |
| vitals-service | `vitals-recorded` | POST /vitals |
| medications-service | `medication-changed` | POST /medications or PUT /medications/:id |
| visits-service | `visit-completed` | POST /visits |
| care-team-service | `care-team-updated` | POST/PUT /care-team |

Pattern for each service — add after `await db.save()`:
```js
await eventPublisher.publish('patientrecord-events', 'labs-resulted', patientId, {
  labId: result._id,
  testName: result.testName,
  value: result.value,
  unit: result.unit,
  flag: result.flag   // 'NORMAL' | 'HIGH' | 'LOW' | 'CRITICAL-HIGH' | 'CRITICAL-LOW'
});
```

**Acceptance criteria:** Post a new lab result via the API; run `XRANGE patientrecord-events - +` in Redis CLI; see the event appear within 1 second.

---

#### 8.1.4 — Add docker-compose health dependency

Services that publish events should add `patientrecord-redis` to their `depends_on` with condition `service_healthy`, so they don't start before Redis is ready.

**Affected services:** labs-service, vitals-service, medications-service, visits-service, care-team-service (add alongside existing mongo dependency)

---

**8.1 Commit message:**
```
feat(8.1): add Redis Event Bus and domain service event publishing

- docker-compose: Redis 7 with persistence and health check
- backend/shared/eventPublisher.js: ioredis XADD wrapper (fail-silent)
- labs, vitals, medications, visits, care-team: publish events on write
- Stream name: patientrecord-events
```

---

## Milestone 8.2 — AI Orchestrator Skeleton

**Goal:** New `ai-orchestrator` service running on port 5300 behind the gateway; assembles patient context from existing services; returns a structured (empty) recommendation response; physician approval model wired in.

### Tasks

#### 8.2.1 — Scaffold ai-orchestrator service

**New directory:** `backend/ai-orchestrator/`

```
backend/ai-orchestrator/
  server.js          # Express app, health endpoint, /recommend route
  contextBuilder.js  # Calls domain services to assemble patient data
  approvalStore.js   # Pending/approved/dismissed recommendation records
  package.json
  Dockerfile
```

**Port:** 5300  
**Base image:** same `node:20-alpine` as other services

`server.js` routes:
```
POST /recommend/:patientId     → triggers context assembly + agent delegation
GET  /recommendations/:patientId → returns history of recommendations
POST /recommendations/:id/approve  → physician approves a recommendation
POST /recommendations/:id/dismiss  → physician dismisses a recommendation
GET  /health                   → standard health response
```

---

#### 8.2.2 — Context builder

`contextBuilder.js` calls the following existing service endpoints (internal Docker network URLs):

```js
const context = await buildPatientContext(patientId, authHeader);
// Calls in parallel:
//   GET http://patientrecord-patient-service:3000/patients/:id
//   GET http://patientrecord-vitals-service:3000/vitals/:patientId
//   GET http://patientrecord-labs-service:3000/labs/:patientId
//   GET http://patientrecord-medications-service:3000/medications/:patientId
//   GET http://patientrecord-visits-service:3000/visits/:patientId
// Returns assembled { patient, vitals, labs, medications, visits }
```

Forward the `Authorization` header from the original request so the domain services validate the JWT normally.

**Acceptance criteria:** `POST /recommend/:patientId` returns a JSON object with all five context sections populated.

---

#### 8.2.3 — Approval store

Use MongoDB (existing `patientrecord-mongo` instance, new `ai_recommendations` collection).

Schema:
```js
{
  _id: ObjectId,
  patientId: String,
  generatedAt: Date,
  context: Object,          // snapshot of patient context at generation time
  recommendations: Array,   // array of { id, type, text, rationale, status }
  status: 'pending' | 'partially-approved' | 'approved' | 'dismissed',
  reviewedBy: String,       // physician userId
  reviewedAt: Date
}
```

**Rules:**
- `requiresApproval: true` is always set in the response
- No recommendation is actioned by the system — approval is purely a record
- Approved/dismissed status is immutable once set

---

#### 8.2.4 — Gateway route addition

**File:** `backend/server.js` (API Gateway)

Add proxy route:
```js
app.use('/api/ai', requireAuth, proxy('http://patientrecord-ai-orchestrator:3000'));
```

This reuses the existing `requireAuth` middleware — no new auth logic.

---

#### 8.2.5 — Add to docker-compose

```yaml
patientrecord-ai-orchestrator:
  build: ./backend/ai-orchestrator
  container_name: patientrecord-ai-orchestrator
  environment:
    - MONGO_URI=mongodb://patientrecord-mongo:27017/patientrecords
    - PATIENT_SERVICE_URL=http://patientrecord-patient-service:3000
    - VITALS_SERVICE_URL=http://patientrecord-vitals-service:3000
    - LABS_SERVICE_URL=http://patientrecord-labs-service:3000
    - MEDS_SERVICE_URL=http://patientrecord-medications-service:3000
    - VISITS_SERVICE_URL=http://patientrecord-visits-service:3000
  depends_on:
    patientrecord-mongo:
      condition: service_healthy
    patientrecord-api-gateway:
      condition: service_healthy
  networks:
    - patientrecord-network
  restart: unless-stopped
```

---

**8.2 Commit message:**
```
feat(8.2): AI Orchestrator skeleton with context assembly and approval store

- backend/ai-orchestrator: new Express service on port 5300
- contextBuilder: parallel calls to all 5 domain services
- approvalStore: MongoDB ai_recommendations collection
- gateway: /api/ai/* route added with requireAuth middleware
- docker-compose: ai-orchestrator service added
```

---

## Milestone 8.3 — Medication Agent

**Goal:** Medication Agent produces real (rule-based) recommendations; Orchestrator delegates to it and returns results.

### Tasks

#### 8.3.1 — Scaffold medication-agent service

**New directory:** `backend/medication-agent/`

```
backend/medication-agent/
  server.js          # Express, /analyze route (internal only — not gateway-exposed)
  rules/
    interactions.js  # Known drug-drug interaction pairs
    contraindications.js  # Drug-condition contraindications
  analyzer.js        # Core rule engine
  package.json
  Dockerfile
```

**Port:** internal Docker network only — no external port mapping  
**Invoked by:** AI Orchestrator via `http://patientrecord-medication-agent:3000/analyze`

---

#### 8.3.2 — Rule engine (Phase 8.3 — no LLM yet)

Input: `{ patient, medications, visits }` (subset of patient context)

Rules to implement:
1. **Drug-drug interactions** — maintain a curated list of high-risk pairs (warfarin + NSAIDs, SSRIs + MAOIs, etc.)
2. **Allergy contraindications** — flag any medication matching a documented patient allergy class
3. **Renal dose adjustment** — if recent labs show elevated creatinine, flag medications requiring renal dose adjustment
4. **Duplicate therapy** — flag two medications in the same pharmacological class

Output per finding:
```json
{
  "type": "interaction" | "contraindication" | "dose-adjustment" | "duplicate",
  "severity": "critical" | "major" | "moderate" | "minor",
  "medications": ["drugA", "drugB"],
  "text": "Human-readable recommendation",
  "rationale": "Clinical basis for the flag",
  "evidenceLevel": "established" | "probable" | "suspected"
}
```

**Data sources for interaction rules:**
- Start with a curated static list (20-30 high-risk pairs) — sufficient for a working prototype
- Phase 8.7 replaces static rules with LLM reasoning over the full medication list

---

#### 8.3.3 — Orchestrator integration

`backend/ai-orchestrator/server.js` — after context assembly:
```js
const medResponse = await axios.post(
  `${process.env.MEDICATION_AGENT_URL}/analyze`,
  { patient: context.patient, medications: context.medications, visits: context.visits }
);
recommendation.medications = medResponse.data;
```

---

#### 8.3.4 — Add to docker-compose

Internal service, no external port:
```yaml
patientrecord-medication-agent:
  build: ./backend/medication-agent
  container_name: patientrecord-medication-agent
  networks:
    - patientrecord-network
  restart: unless-stopped
```

---

**8.3 Commit message:**
```
feat(8.3): Medication Agent with rule-based interaction and contraindication analysis

- backend/medication-agent: internal Express service
- rules/interactions.js: curated high-risk drug pairs
- rules/contraindications.js: allergy and condition-based rules
- analyzer: interaction, allergy, renal, duplicate-therapy checks
- orchestrator: delegates medication context to medication-agent
```

---

## Milestone 8.4 — Labs Agent

**Goal:** Labs Agent produces diagnostic gap analysis and test recommendations.

### Tasks

#### 8.4.1 — Scaffold labs-agent service

**New directory:** `backend/labs-agent/`

```
backend/labs-agent/
  server.js
  rules/
    diagnosticGaps.js   # Condition → expected labs mapping
    criticalValues.js   # Per-test critical value thresholds
  analyzer.js
  package.json
  Dockerfile
```

---

#### 8.4.2 — Rule engine

Input: `{ patient, labs, vitals, visits }` (subset of patient context)

Rules to implement:
1. **Missing baseline labs** — given active conditions (from visits), flag labs that should be present but are not (e.g. HbA1c for diabetic patients, INR for warfarin patients)
2. **Stale labs** — flag test results older than a clinically relevant threshold (e.g. CBC > 90 days, lipid panel > 1 year)
3. **Progressive lab deterioration** — compare the last 3 values of a test; flag downward trends above a threshold delta
4. **Vital-triggered labs** — if recent vitals show abnormality, recommend confirming labs (e.g. elevated BP → BMP, U/A)

Output per finding:
```json
{
  "type": "missing" | "stale" | "trending" | "vital-triggered",
  "urgency": "STAT" | "urgent" | "routine",
  "test": "Test name",
  "reason": "Human-readable rationale",
  "basedOn": "clinical basis"
}
```

---

#### 8.4.3 — Orchestrator integration and docker-compose

Same pattern as 8.3.3 and 8.3.4.

---

**8.4 Commit message:**
```
feat(8.4): Labs Agent with diagnostic gap and trending analysis

- backend/labs-agent: internal Express service
- rules/diagnosticGaps.js: condition-to-required-lab mapping
- rules/criticalValues.js: per-test critical thresholds
- analyzer: missing, stale, trending, vital-triggered checks
- orchestrator: delegates labs context to labs-agent
```

---

## Milestone 8.5 — Comms Agent

**Goal:** Comms Agent subscribes to the Redis event stream and dispatches notifications to care team and patient based on configurable rules.

### Tasks

#### 8.5.1 — Scaffold comms-agent service

**New directory:** `backend/comms-agent/`

```
backend/comms-agent/
  server.js           # Express health endpoint + admin rule config API
  consumer.js         # Redis Streams consumer loop (XREADGROUP)
  dispatcher.js       # Routes events to notification handlers
  handlers/
    criticalAlert.js  # Immediate care team notification
    routineUpdate.js  # Batches into daily digest
    auditLog.js       # Every event → MongoDB audit collection
  rules/
    escalationRules.js  # Configurable thresholds (loaded from DB or env)
  package.json
  Dockerfile
```

---

#### 8.5.2 — Redis consumer group

`consumer.js` creates a consumer group on startup and runs a read loop:

```js
// Create group idempotently
await redis.xgroup('CREATE', 'patientrecord-events', 'comms-agent-group', '$', 'MKSTREAM').catch(() => {});

// Read loop
while (true) {
  const messages = await redis.xreadgroup(
    'GROUP', 'comms-agent-group', 'comms-agent-1',
    'COUNT', 10, 'BLOCK', 5000,
    'STREAMS', 'patientrecord-events', '>'
  );
  if (messages) await processMessages(messages);
}
```

After successful processing, acknowledge with `XACK`.

---

#### 8.5.3 — Escalation rules

Implement as a simple JSON config (Phase 8.5) — upgradeable to DB-backed in Phase 8.7:

```js
const escalationRules = [
  { eventType: 'vitals-recorded', field: 'payload.spo2',   operator: 'lt', threshold: 92,   action: 'criticalAlert',  channel: ['in-app', 'sms'] },
  { eventType: 'vitals-recorded', field: 'payload.systolic', operator: 'gt', threshold: 180, action: 'criticalAlert',  channel: ['in-app'] },
  { eventType: 'labs-resulted',   field: 'payload.flag',   operator: 'eq', threshold: 'CRITICAL-HIGH', action: 'criticalAlert', channel: ['in-app', 'sms'] },
  { eventType: 'labs-resulted',   field: 'payload.flag',   operator: 'eq', threshold: 'CRITICAL-LOW',  action: 'criticalAlert', channel: ['in-app', 'sms'] },
  { eventType: 'medication-changed', field: null,          operator: null,  threshold: null,  action: 'routineUpdate', channel: ['in-app'] },
  { eventType: 'visit-completed',    field: null,          operator: null,  threshold: null,  action: 'routineUpdate', channel: ['in-app'] },
];
```

All rules stored — every event hits `auditLog` regardless of escalation outcome.

---

#### 8.5.4 — Notification channels (Phase 8.5 — in-app only)

Phase 8.5 implements in-app notifications via a `notifications` MongoDB collection that the frontend can poll. External channels (SMS, email, push) are stubbed and implemented in Phase 8.8.

Notification document:
```json
{
  "recipientRole": "physician" | "nurse" | "patient",
  "patientId": "...",
  "eventType": "...",
  "urgency": "critical" | "routine",
  "message": "...",
  "read": false,
  "createdAt": "..."
}
```

---

#### 8.5.5 — Audit log

Every consumed event (regardless of escalation) writes to `ai_audit_log` in MongoDB:
```json
{
  "eventType": "...",
  "patientId": "...",
  "sourceService": "...",
  "receivedAt": "...",
  "escalated": true | false,
  "actionTaken": "criticalAlert" | "routineUpdate" | "none",
  "notificationIds": []
}
```

---

**8.5 Commit message:**
```
feat(8.5): Comms Agent with Redis Streams consumer and in-app notifications

- backend/comms-agent: XREADGROUP consumer with consumer group
- escalationRules: configurable thresholds for critical vs routine events
- criticalAlert: immediate in-app notification (DB-backed)
- routineUpdate: daily digest batching
- auditLog: every event logged to ai_audit_log (HIPAA)
- docker-compose: comms-agent added with Redis dependency
```

---

## Milestone 8.6 — Frontend Integration

**Goal:** Physician can request AI recommendations from the patient view, see them in a structured panel, and approve or dismiss each one.

### Tasks

#### 8.6.1 — AI Recommendations panel (Shell App or Demographics module)

New Angular component: `AiRecommendationsComponent`

- Accessible to `physician` role only (guard matches existing role system)
- "Get AI Recommendations" button in the patient detail view
- Calls `POST /api/ai/recommend/:patientId` via the existing API service pattern
- Displays loading state while Orchestrator assembles context (can take 2-5 seconds)

---

#### 8.6.2 — Recommendation display

Two sections in the panel:

**Medications section:**
- List each finding with severity badge (critical / major / moderate / minor)
- Show affected drug names and rationale text
- Per-item approve / dismiss buttons
- Approved items highlighted green; dismissed items greyed out

**Labs section:**
- List each gap/recommendation with urgency badge (STAT / urgent / routine)
- Test name, reason, clinical basis
- Per-item approve / dismiss buttons

---

#### 8.6.3 — Approval API integration

On approve:
```
POST /api/ai/recommendations/:id/approve
{ "recommendationIndex": 0 }
```

On dismiss:
```
POST /api/ai/recommendations/:id/dismiss
{ "recommendationIndex": 0, "reason": "optional physician note" }
```

Approved/dismissed state is persisted immediately; UI reflects the change without page reload.

---

#### 8.6.4 — Notification bell

New component in the Shell App navigation bar (visible to all roles):
- Polls `GET /api/notifications/unread` every 30 seconds (or WebSocket in Phase 8.8)
- Badge shows unread count
- Click opens a notification drawer with messages from the Comms Agent
- "Mark as read" action per notification

Add `/api/notifications/*` route to the API Gateway pointing to a new `notification-service` or extend the Comms Agent with a notification query API.

---

**8.6 Commit message:**
```
feat(8.6): Frontend AI recommendations panel and notification bell

- AiRecommendationsComponent: physician-only, per-patient
- Medication and Labs recommendation sections with approve/dismiss
- Approval state persisted via orchestrator API
- Notification bell in shell nav: polls unread, badge count, drawer
```

---

## Milestone 8.7 — LLM Integration

**Goal:** Replace rule-based medication and labs analysis with real LLM tool-calling. Domain service integrations unchanged — only the agent inference layer changes.

### Pre-conditions

- [ ] PHI de-identification strategy approved
- [ ] LLM provider selected (on-premises Ollama OR cloud with signed BAA)
- [ ] Clinical review of Phase 8.3/8.4 rule-based output quality

### Tasks

#### 8.7.1 — LLM provider setup

**Option A — On-premises (recommended for PHI compliance):**
```yaml
patientrecord-ollama:
  image: ollama/ollama
  container_name: patientrecord-ollama
  ports:
    - "11434:11434"
  volumes:
    - ollama-models:/root/.ollama
  networks:
    - patientrecord-network
  # Requires GPU-enabled Docker host for performance
```
Pull model: `ollama pull llama3.1:70b` (or `mistral:7b` for lower hardware requirements)

**Option B — Azure OpenAI:**
- Configure endpoint and API key via environment variables
- Ensure PHI is de-identified before transmission (replace patient name with UUID surrogate)

---

#### 8.7.2 — Tool-calling integration in Medication Agent

Replace rule engine with LLM tool-calling loop:

```js
const tools = [
  { name: 'get_drug_interactions', description: 'Look up interactions for a list of drugs', parameters: { drugs: 'string[]' } },
  { name: 'get_contraindications',  description: 'Check contraindications given conditions and allergies', parameters: { drugs: 'string[]', conditions: 'string[]', allergies: 'string[]' } },
];

const response = await llm.chat({
  messages: [{ role: 'system', content: MEDICATION_AGENT_SYSTEM_PROMPT }, { role: 'user', content: buildPrompt(context) }],
  tools,
  toolHandler: async (toolCall) => { /* resolve tool to local rule lookup or external DB */ }
});
```

`MEDICATION_AGENT_SYSTEM_PROMPT` instructs the model it is a clinical decision support tool, outputs must be structured JSON matching the existing recommendation schema, and it must never suggest a specific dose — only flag and recommend physician review.

---

#### 8.7.3 — Tool-calling integration in Labs Agent

Same pattern as 8.7.2 with labs-specific tools:
- `assess_lab_gaps(conditions, presentLabs)` → returns missing expected tests
- `evaluate_lab_trend(testName, historicalValues)` → returns trend analysis

---

**8.7 Commit message:**
```
feat(8.7): LLM tool-calling integration for Medication and Labs agents

- medication-agent: LLM tool-calling loop replaces static rule engine
- labs-agent: LLM tool-calling loop replaces static rule engine
- Shared LLM client module with provider abstraction (Ollama / Azure OpenAI)
- System prompts enforce structured JSON output and physician-review-only stance
- De-identification layer applied before any context is sent to external LLM
```

---

## Milestone 8.8 — Hardening

**Goal:** Production-ready: real-time notifications, external alert channels, load testing, security audit, observability.

### Tasks

#### 8.8.1 — WebSocket real-time notifications
- Replace 30-second polling with a WebSocket connection in the Shell App
- API Gateway upgraded to support WebSocket proxying
- Comms Agent pushes to connected clients immediately on critical events

#### 8.8.2 — External notification channels
- SMS via Twilio: critical alerts only
- Email via SendGrid: daily digest + critical out-of-hours
- Mobile push via Firebase: patient notifications (if mobile app exists)
- Channel preferences configurable per care team member in the Admin Dashboard

#### 8.8.3 — Security audit
- Review all AI service endpoints for injection risk (prompt injection via patient data)
- Confirm JWT auth is enforced at gateway; AI services unreachable from outside Docker network
- Validate audit log immutability (append-only MongoDB collection with write concern `majority`)
- Review PHI data paths — confirm no unintended logging of patient data in debug outputs

#### 8.8.4 — Load testing
- Baseline: `POST /api/ai/recommend/:patientId` must respond within 10 seconds for rule-based agents; 30 seconds for LLM agents
- Comms Agent: must process 1,000 events/minute without queue backlog
- Run `k6` or `Artillery` load tests; document results

#### 8.8.5 — Observability
- Add `GET /health` to all new services (matching existing service pattern)
- Add all new services to API Gateway's `/health/deep` check
- Add Redis health check to `/health/deep`
- Log AI recommendation generation time as a structured metric
- Log Comms Agent event processing latency as a structured metric

---

**8.8 Commit message:**
```
feat(8.8): Phase 8 hardening - real-time notifications, security, observability

- WebSocket: replace notification polling with push
- External channels: Twilio SMS, SendGrid email stubs (configure via env)
- Security: prompt injection review, audit log write concern, PHI log scrub
- Load test results: documented in docs/PHASE_8_LOAD_TEST_RESULTS.md
- Health checks: all new services added to /health/deep
- Metrics: recommendation latency and event processing latency logged
```

---

## Dependencies Map

```
8.1 (Redis + events)
  └─▶ 8.2 (Orchestrator) ─┬─▶ 8.3 (Medication Agent)
                           ├─▶ 8.4 (Labs Agent)
                           └─▶ 8.6 (Frontend) ─▶ 8.8 (Hardening)
  └─▶ 8.5 (Comms Agent) ──────────────────────▶ 8.8 (Hardening)

8.7 (LLM) can be inserted between any 8.3/8.4 commit and 8.8
Requires: PHI decision + LLM provider choice + clinical validation
```

---

## New Containers Summary

| Container | Port (external) | Port (internal) | Role |
|---|---|---|---|
| `patientrecord-redis` | 6379 | 6379 | Event Bus |
| `patientrecord-ai-orchestrator` | — (gateway routed) | 3000 | Orchestrator |
| `patientrecord-medication-agent` | — (internal only) | 3000 | Sync agent |
| `patientrecord-labs-agent` | — (internal only) | 3000 | Sync agent |
| `patientrecord-comms-agent` | — (internal only) | 3000 | Async agent |
| `patientrecord-ollama` *(optional)* | 11434 | 11434 | LLM runtime |

Total with Phase 8 complete: **23 containers** (17 current + 5 new + 1 optional)

---

## Open Decisions (must resolve before 8.7)

| Decision | Owner | Options |
|---|---|---|
| LLM provider | Architect + Legal | Ollama on-premises / Azure OpenAI (BAA) / Anthropic (BAA) |
| PHI de-identification scope | Clinical + Legal | Which fields can leave the environment; surrogate key strategy |
| Medication interaction data source | Clinical | Static curated list / DrugBank API / commercial (FDB, MediSpan) |
| Escalation rule governance | Clinical lead | Who reviews and signs off thresholds before 8.5 deploys to prod |
| Patient consent model | Legal + Clinical | Opt-in per patient / institution-wide opt-out |
| FDA regulatory pathway | Legal | Decision support (likely exempt) vs. diagnostic aid (may need 510k) |

---

## Definition of Done — Phase 8

- [ ] All 5 new services pass health check in `/health/deep`
- [ ] `POST /api/ai/recommend/:patientId` returns structured recommendations in < 10 seconds (rule-based)
- [ ] Every recommendation has `requiresApproval: true`; approval/dismiss recorded in MongoDB
- [ ] Every domain service write publishes an event visible in Redis stream
- [ ] Critical lab value triggers care team in-app notification within 5 seconds
- [ ] Every AI event logged in `ai_audit_log` (HIPAA)
- [ ] No patient data logged in console/debug output
- [ ] Load test: 20 concurrent recommendation requests complete without error
- [ ] All new services included in docker-compose with health checks
- [ ] Frontend physician approval flow end-to-end tested
