# Phase 8: AI Multi-Agent Architecture — v2 Roadmap

**Status:** Roadmap · Not yet implemented  
**Depends on:** Phase 7 (current implementation) fully operational  
**Diagram:** [system-architecture-v2.svg](diagrams/system-architecture-v2.svg)

---

## Overview

Phase 8 adds a clinical decision support layer built on an **Orchestrator + Specialized Agents** pattern. The AI layer integrates as peer microservices behind the existing API Gateway — no changes are required to the current domain services, authentication, or frontend modules. New `/api/ai/*` routes are added to the gateway, and new containers join the existing docker-compose stack.

The design addresses three distinct clinical use cases with two fundamentally different data-flow patterns:

| Pattern | Agents | Trigger |
|---|---|---|
| **Sync / Request-driven** | AI Orchestrator, Medication Agent, Labs Agent | Physician clicks "Get AI Recommendations" |
| **Async / Event-driven** | Comms Agent | Domain service records a change (labs resulted, vitals recorded, medication modified) |

---

## Architecture Principles

1. **Zero breaking changes** — existing v1 services are consumers, not modified
2. **Gateway-enforced auth** — all `/api/ai/*` requests go through the existing JWT validation layer
3. **Recommendations only, never orders** — the system proposes, the physician decides
4. **Full audit trail** — every data access and recommendation is logged at the gateway and audit service level (HIPAA requirement)
5. **Repository pattern inside each agent** — if the LLM provider changes (OpenAI → Anthropic → local Ollama), only the agent's inference layer changes, not the tool definitions or service integrations

---

## Component Reference

### 1. AI Orchestrator Service — Port 5300

The entry point for all synchronous AI requests. Exposes a single endpoint:

```
POST /api/ai/recommend/:patientId
Authorization: Bearer <jwt>
```

**Responsibilities:**
- Assembles the full patient context by calling existing domain services: Patient (5002), Vitals (5003), Labs (5004), Medications (5005), Visits (5006)
- Runs a tool-calling LLM loop: the model is given a set of tools (each mapping to a service API call) and decides what context it needs before making a recommendation
- Delegates assembled context to the Medication Agent and Labs Agent
- Aggregates both agents' outputs into a single structured response
- Returns a `recommendations` object — never takes any action directly

**Response shape:**
```json
{
  "patientId": "...",
  "generatedAt": "2026-03-19T...",
  "medications": { "recommendations": [...], "interactions": [...] },
  "labs": { "recommended": [...], "dataGaps": [...] },
  "requiresApproval": true,
  "approvedBy": null
}
```

---

### 2. Medication Agent

A specialized agent called by the Orchestrator with pre-assembled patient context.

**Tools (each maps to an existing service call):**
- `get_current_medications(patientId)` → Medications Service
- `get_patient_allergies(patientId)` → Patient Service
- `check_drug_interactions(drugList)` → external interaction database or local rule engine
- `get_diagnosis_context(patientId)` → Visits Service (most recent diagnosis codes)

**Outputs:**
- Medication adjustment recommendations with clinical rationale
- Drug-drug interaction flags with severity level
- Contraindication warnings based on allergy profile and comorbidities

---

### 3. Labs Agent

A specialized agent called by the Orchestrator with pre-assembled patient context.

**Tools:**
- `get_recent_labs(patientId, days)` → Labs Service
- `get_vital_trends(patientId, days)` → Vitals Service
- `get_active_conditions(patientId)` → Visits Service

**Outputs:**
- List of recommended diagnostic tests with clinical justification
- Identification of data gaps that limit diagnostic confidence
- Urgency classification (routine / urgent / STAT)

---

### 4. Comms Agent (Async / Event-Driven)

The Comms Agent operates **independently of the Orchestrator**. It subscribes to the Event Bus and reacts to domain events in near-real-time. It does not wait to be invoked — it continuously listens.

**Subscribed event streams:**
- `vitals-recorded` — abnormal vital sign values trigger immediate care team alert
- `labs-resulted` — critical lab values trigger immediate alert; normal/routine values go to daily digest
- `medication-changed` — notifies care team of changes; flags potential interactions with current med list
- `visit-completed` — summarizes encounter and updates care team on patient status

**Escalation rule examples** (all thresholds require clinician sign-off at configuration time):
- SpO2 < 92% → immediate care team page
- Potassium > 6.5 mEq/L → STAT alert
- New medication added while patient is on warfarin → interaction review notification
- All other changes → daily summary digest

**Outputs:**
- Care team in-app alert and/or SMS/email push
- Patient portal notification (for routine status updates, not critical alerts)
- Immutable audit log entry (HIPAA)

---

### 5. Event Bus — Redis Streams

A lightweight message broker that decouples domain services from the Comms Agent.

**Why Redis Streams over Kafka:**
- At the current patient volume (hundreds to low thousands), Redis Streams has sufficient throughput and retention
- Already likely available as a cache layer; no additional infrastructure
- Consumer groups support replay and at-least-once delivery
- Kafka should be re-evaluated if event volume exceeds ~100,000 events/day or if multiple independent consumers are needed

**Message format:**
```json
{
  "eventType": "labs-resulted",
  "patientId": "...",
  "serviceId": "labs-service",
  "timestamp": "2026-03-19T...",
  "payload": { "labId": "...", "value": 7.1, "unit": "mEq/L", "flag": "CRITICAL-HIGH" }
}
```

**Domain services must be updated** to publish events after successful writes — this is the only change required to existing services.

---

## Request-Driven Flow (Sync)

```
Physician UI
    │  click "Get AI Recommendations"
    ▼
Shell App  →  POST /api/ai/recommend/:patientId
    │
    ▼
API Gateway (5000) — validates JWT, routes to AI Orchestrator
    │
    ▼
AI Orchestrator (5300)
    │  ← calls Patient, Vitals, Labs, Medications, Visits services to build context
    │
    ├──▶ Medication Agent  →  returns { recommendations, interactions, contraindications }
    │
    └──▶ Labs Agent        →  returns { recommendedTests, dataGaps, urgency }
    │
    ▼
Aggregated response returned to physician UI
    │
    ▼
Physician reviews → approves or dismisses each recommendation
    │
    ▼
Approved actions executed through existing domain service APIs (by the physician)
```

---

## Event-Driven Flow (Async)

```
Domain Service (e.g. Labs Service) — records a new lab result
    │  publishes → "labs-resulted" event
    ▼
Event Bus (Redis Streams)
    │
    ▼
Comms Agent — consumes event, evaluates escalation rules
    │
    ├──▶ Critical flag?  →  immediate Care Team Alert (in-app + SMS)
    │
    ├──▶ Routine result? →  batch into daily digest
    │
    ├──▶ Patient-facing update? →  Patient Portal notification
    │
    └──▶ All events  →  EHR Audit Log (immutable, HIPAA)
```

---

## Human-in-the-Loop (Mandatory)

This is not optional — it is a hard architectural requirement for clinical decision support under FDA guidance and HIPAA:

- The Medication Agent and Labs Agent **produce recommendations, not orders**
- The Orchestrator response includes `"requiresApproval": true` and `"approvedBy": null`
- The physician UI must present recommendations with a clear approve/dismiss flow
- **No recommendation may be actioned without an explicit physician approval event** being recorded
- The approval event itself must be stored with timestamp, physician ID, and the exact recommendation text that was approved

The Comms Agent notifications are also subject to human-configured rules — the escalation thresholds and channels must be reviewed and approved by a qualified clinician before deployment, and changes to thresholds require a documented change-management process.

---

## HIPAA & Compliance Considerations

| Requirement | Implementation |
|---|---|
| Audit trail for all PHI access | Existing API Gateway structured logging covers Orchestrator calls; Comms Agent must write to its own audit stream |
| Minimum necessary access | Each agent only requests the data fields its tools specifically require |
| De-identification for LLM calls | If using an external LLM API (OpenAI, Anthropic), patient data must be de-identified before transmission — use patient ID as a surrogate, replace names with generated pseudonyms |
| Data residency | Self-hosted LLM (Ollama + Llama 3 or similar) eliminates PHI leaving the on-premises environment entirely |
| Consent for AI recommendations | Recommend adding a patient consent flag to the patient record before AI recommendations are generated for that patient |
| Audit log immutability | EHR Audit Log entries must be append-only with cryptographic integrity (hash chain or signed log entries) |

---

## Technology Recommendations

| Component | Recommended | Notes |
|---|---|---|
| LLM (on-premises) | Ollama + Llama 3.1 70B or Mistral-7B | No PHI leaves the environment; GPU required |
| LLM (cloud, de-identified) | Azure OpenAI or Anthropic Claude API | Business Associate Agreement (BAA) required |
| Tool-calling framework | LangChain.js or Vercel AI SDK | Both support structured tool-calling with JSON schemas |
| Event Bus | Redis Streams (current scale) | Upgrade to Apache Kafka when event volume requires it |
| Notification channels (in-app) | WebSocket push via existing Shell App | |
| Notification channels (external) | Twilio (SMS), SendGrid (email), Firebase (mobile push) | |
| Agent runtime | Node.js (consistent with existing services) | Python is also viable if an ML team is involved |

---

## Integration with Current Architecture

The following changes are required to existing v1 components:

**docker-compose.yml additions:**
- `patientrecord-ai-orchestrator` — port 5300
- `patientrecord-medication-agent` — internal only (not gateway-exposed directly)
- `patientrecord-labs-agent` — internal only
- `patientrecord-comms-agent` — internal only
- `patientrecord-redis` — port 6379 (Event Bus)

**API Gateway (5000) additions:**
- Route `/api/ai/*` → AI Orchestrator (5300)
- No auth changes needed — existing JWT middleware applies

**Domain service additions (minimal):**
- After successful write operations, publish event to Redis Streams
- Estimated: ~10 lines of code per service, no schema changes

**Frontend (Shell App) additions:**
- New "AI Recommendations" panel accessible to `physician` role
- Physician approval flow UI component
- Optional: real-time notification bell connected to Event Bus via WebSocket

---

## Implementation Roadmap

### Phase 8.1 — Foundation
- [ ] Add Redis to docker-compose stack
- [ ] Instrument existing domain services to publish events (Labs, Vitals, Medications, Visits)
- [ ] Stand up AI Orchestrator skeleton with `/api/ai/recommend/:patientId` endpoint
- [ ] Add gateway route for `/api/ai/*`

### Phase 8.2 — Sync Agents
- [ ] Implement Medication Agent with tool-calling (start with rule-based before LLM)
- [ ] Implement Labs Agent with tool-calling
- [ ] Implement physician approval flow in the frontend
- [ ] Implement audit logging for all AI recommendations and approvals

### Phase 8.3 — Comms Agent
- [ ] Implement Comms Agent with Redis Streams consumer group
- [ ] Define and configure escalation rules with clinical input
- [ ] Implement care team in-app notification (WebSocket)
- [ ] Implement patient portal notification

### Phase 8.4 — LLM Integration
- [ ] Replace rule-based agents with LLM tool-calling (de-identified or on-premises)
- [ ] Evaluate and sign BAA if using cloud LLM provider
- [ ] Load test and tune LLM response latency
- [ ] Clinical validation of recommendation quality before production rollout

---

## Open Decisions

1. **LLM provider** — on-premises (Ollama) vs. cloud (Azure OpenAI with BAA) vs. hybrid
2. **De-identification strategy** — which fields can be sent to an external LLM, what stays on-premises
3. **Medication interaction database** — commercial (Wolters Kluwer, First Databank) vs. open (DrugBank, OpenFDA)
4. **Escalation rule governance** — which clinician signs off, how changes are version-controlled
5. **Patient consent model** — opt-in per patient, or institution-wide with patient opt-out
6. **Regulatory pathway** — if recommendations go beyond "decision support" to "diagnosis", FDA 510(k) clearance may be required
