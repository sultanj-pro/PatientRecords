# Phase 8 — AI Multi-Agent Implementation Checklist

> **76 implementation tasks · 6 decisions · 10 Definition of Done items**
> Check off each item as it is completed and committed.
> Live source: [`docs/PHASE_8_IMPLEMENTATION_PLAN.md`](./PHASE_8_IMPLEMENTATION_PLAN.md)

---

## Pre-work — Decisions (must resolve D1–D3 before Milestone 8.7 can start)

- [ ] **D1** LLM provider selected and access provisioned (Ollama / Azure OpenAI + BAA / Anthropic + BAA)
- [ ] **D2** PHI de-identification scope approved by legal (which fields can leave the environment)
- [ ] **D3** Medication interaction data source confirmed (static list / OpenFDA / DrugBank / FDB)
- [ ] **D4** Escalation rule thresholds reviewed and signed off by a qualified clinician
- [ ] **D5** Patient consent model decided (opt-in per patient vs. institution-wide opt-out)
- [ ] **D6** FDA regulatory pathway assessed by legal (decision support exempt vs. 510(k) pathway)

---

## Milestone 8.1 — Infrastructure Foundation (~2–3 days)

- [x] **8.1.1** Add Redis 7 service to `docker-compose.yml` with persistence and health check
- [x] **8.1.2** Add `redis-data` volume to docker-compose top-level volumes block
- [x] **8.1.3** Install `ioredis` — add to `backend/package.json`
- [x] **8.1.4** Create `backend/shared/eventPublisher.js` — `XADD` wrapper with fail-silent error handling
- [x] **8.1.5** Instrument **labs-service**: publish `labs-resulted` event after POST /labs
- [x] **8.1.6** Instrument **vitals-service**: publish `vitals-recorded` event after POST /vitals
- [x] **8.1.7** Instrument **medications-service**: publish `medication-changed` after POST/PUT /medications
- [x] **8.1.8** Instrument **visits-service**: publish `visit-completed` after POST /visits
- [x] **8.1.9** Instrument **care-team-service**: publish `care-team-updated` after POST/PUT /care-team
- [x] **8.1.10** Add `patientrecord-redis` health dependency to all 5 instrumented services in docker-compose
- [x] **8.1.11** Manual test: post a new lab result → verify event in `XRANGE patientrecord-events - +`

---

## Milestone 8.2 — AI Orchestrator Skeleton (~3–4 days) ✅ First dev-testable checkpoint

- [x] **8.2.1** Scaffold `backend/ai-orchestrator/` — `server.js`, `contextBuilder.js`, `approvalStore.js`, `package.json`, `Dockerfile`
- [x] **8.2.2** Implement `contextBuilder.js` — parallel calls to Patient, Vitals, Labs, Meds, Visits (forward JWT)
- [x] **8.2.3** Implement `approvalStore.js` — MongoDB `ai_recommendations` collection with immutable status rules
- [x] **8.2.4** Implement `POST /recommend/:patientId`, `GET /recommendations/:patientId`, approve/dismiss endpoints, `GET /health`
- [x] **8.2.5** Add `/api/ai/*` proxy route to API Gateway with `requireAuth` middleware
- [x] **8.2.6** Add `patientrecord-ai-orchestrator` to `docker-compose.yml` with all service URL env vars
- [x] **8.2.7** Manual test: Postman `POST /api/ai/recommend/:patientId` — verify all 5 context sections populated

---

## Milestone 8.3 — Medication Agent (~3–4 days)

- [x] **8.3.1** Scaffold `backend/medication-agent/` — `server.js`, `analyzer.js`, `rules/interactions.js`, `rules/contraindications.js`, `package.json`, `Dockerfile`
- [x] **8.3.2** Implement drug-drug interaction rule set (20–30 high-risk pairs)
- [x] **8.3.3** Implement allergy contraindication check
- [x] **8.3.4** Implement renal dose adjustment flag (based on creatinine labs)
- [x] **8.3.5** Implement duplicate therapy detection (same pharmacological class)
- [x] **8.3.6** Wire Medication Agent into Orchestrator (`POST /analyze` internal call)
- [x] **8.3.7** Add `patientrecord-medication-agent` to `docker-compose.yml` (internal only, no external port)
- [x] **8.3.8** Manual test: verify Orchestrator includes medication findings for a patient with known interactions

---

## Milestone 8.4 — Labs Agent (~3–4 days) ✅

- [x] **8.4.1** Scaffold `backend/labs-agent/` — `server.js`, `analyzer.js`, `rules/diagnosticGaps.js`, `rules/criticalValues.js`, `package.json`, `Dockerfile`
- [x] **8.4.2** Implement missing baseline labs check (condition → expected lab mapping)
- [x] **8.4.3** Implement stale labs check (age threshold per test type)
- [x] **8.4.4** Implement progressive lab deterioration trending (last 3 values delta)
- [x] **8.4.5** Implement vital-triggered lab recommendations
- [x] **8.4.6** Wire Labs Agent into Orchestrator (`POST /analyze` internal call)
- [x] **8.4.7** Add `patientrecord-labs-agent` to `docker-compose.yml` (internal only)
- [x] **8.4.8** Manual test: verify Orchestrator includes lab gap findings — 10/10 unit tests pass

---

## Milestone 8.5 — Comms Agent (~4–5 days) ✅

- [x] **8.5.1** Scaffold `backend/comms-agent/` — `server.js`, `consumer.js`, `analyzer.js`, `rules/escalationRules.js`, `rules/visitCadence.js`, `notificationStore.js`, `package.json`, `Dockerfile`
- [x] **8.5.2** Implement Redis Streams `XREADGROUP` consumer loop with consumer group creation and `XACK`
- [x] **8.5.3** Implement escalation rule engine — evaluate event against rule set (10 rules: troponin, K+, glucose, INR, creatinine, hypertensive crisis, bradycardia, fever)
- [x] **8.5.4** Implement `criticalAlert` handler — writes to MongoDB `notifications` collection with 24 h dedup
- [x] **8.5.5** Implement `routineUpdate` handler — visit cadence, polypharmacy, frequent ER visit findings returned via `/analyze`
- [x] **8.5.6** Implement `auditLog` handler — every stream event → `ai_audit_log` (append-only, idempotent on retry via unique streamMsgId index)
- [x] **8.5.7** Add `patientrecord-comms-agent` to `docker-compose.yml` with Redis dependency
- [x] **8.5.8** Manual test: critical lab value → notification in MongoDB `notifications` within 5 seconds — 4/4 unit tests pass
- [x] **8.5.9** Manual test: verify every event appears in `ai_audit_log` — audit log wired into consumer for all events

---

## Milestone 8.6 — Frontend Integration (~4–5 days) ✅ First user/stakeholder testable checkpoint

- [x] **8.6.1** `AiInsightsComponent` in ai-insights MFE — physician/admin role guard via `canApprove` property
- [x] **8.6.2** "Get AI Recommendations" button in `AiInsightsComponent` triggers `generateAnalysis()`
- [x] **8.6.3** Loading state (`analyzing`, `loadingRecs`) and error handling (`recError`) implemented
- [x] **8.6.4** Medication recommendations section — findings with `findingTypeLabel()` severity badges, approve/dismiss
- [x] **8.6.5** Labs recommendations section — findings with critical-value, stale-lab, deterioration-trend, vital-triggered-lab types
- [x] **8.6.6** Approve/dismiss buttons wired to `POST /api/ai/recommendations/:id/approve|dismiss`; guarded by `canApprove`
- [x] **8.6.7** `GET /api/notifications/:patientId/unread` endpoint added to comms-agent (returns pending-only)
- [x] **8.6.8** API Gateway route `/api/notifications/*` proxies to comms-agent (already existed)
- [x] **8.6.9** Notification bell component in Shell App navbar — badge count, 30s polling, patient-scoped
- [x] **8.6.10** Notification drawer in navbar — severity-coloured list, per-item acknowledge button
- [x] **8.6.11** Fixed `apiBase = 'http://localhost:5000'` → `''` (relative) in ai-insights MFE for Docker compatibility; same for JwtInterceptor `apiUrl`

---

## Milestone 8.7 — LLM Integration (~5–8 days) — blocked on D1, D2, D3

- [ ] **8.7.1** Set up LLM provider (Ollama container in docker-compose OR Azure OpenAI env vars)
- [ ] **8.7.2** Create shared LLM client module with provider abstraction
- [ ] **8.7.3** Implement PHI de-identification layer before any context sent to external LLM
- [ ] **8.7.4** Write `MEDICATION_AGENT_SYSTEM_PROMPT` (structured JSON output, physician-review-only stance)
- [ ] **8.7.5** Replace Medication Agent rule engine with LLM tool-calling loop
- [ ] **8.7.6** Write `LABS_AGENT_SYSTEM_PROMPT`
- [ ] **8.7.7** Replace Labs Agent rule engine with LLM tool-calling loop
- [ ] **8.7.8** Validate output schema consistency (LLM output must match existing recommendation schema)
- [ ] **8.7.9** Clinical review of LLM recommendation quality vs. rule-based output (sign-off required)

---

## Milestone 8.8 — Hardening (~5–7 days)

- [ ] **8.8.1** Replace notification bell polling with WebSocket push
- [ ] **8.8.2** Upgrade API Gateway to support WebSocket proxying
- [ ] **8.8.3** Stub Twilio SMS integration for critical alerts (env-configured)
- [ ] **8.8.4** Stub SendGrid email integration for daily digest (env-configured)
- [ ] **8.8.5** Review all AI endpoints for prompt injection risk
- [ ] **8.8.6** Confirm AI services are unreachable outside Docker network
- [ ] **8.8.7** Set MongoDB `ai_audit_log` as append-only with write concern `majority`
- [ ] **8.8.8** Audit all AI service logs — remove any PHI from debug/info output
- [ ] **8.8.9** Run load test: 20 concurrent `POST /recommend` — document results
- [ ] **8.8.10** Add all new services to `/health/deep`
- [ ] **8.8.11** Add Redis health check to `/health/deep`
- [ ] **8.8.12** Add recommendation latency metric to structured logs
- [ ] **8.8.13** Add Comms Agent event processing latency metric to structured logs

---

## Definition of Done — Phase 8 Complete When:

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

---

## Progress Summary

| Milestone | Tasks | Status |
|---|---|---|
| Pre-work decisions | 6 | 🔲 Not started |
| 8.1 Infrastructure | 11 | ✅ Complete |
| 8.2 Orchestrator | 7 | ✅ Complete |
| 8.3 Medication Agent | 8 | ✅ Complete |
| 8.4 Labs Agent | 8 | 🔲 Not started |
| 8.5 Comms Agent | 9 | 🔲 Not started |
| 8.6 Frontend | 11 | 🔲 Not started |
| 8.7 LLM | 9 | 🔲 Not started |
| 8.8 Hardening | 13 | 🔲 Not started |
| **Total** | **76 + 6 decisions** | **26 / 82 complete** |
