# PatientRecords Modernization Plan

## Objectives
- Modernize the legacy AngularJS app to latest Angular with a modular, testable architecture.
- Introduce a Node.js backend and a Spark-service for all CRUD and analytics against Delta Lake tables.
- Make storage pluggable: MinIO for dev; S3, ADLS Gen2, or GCS for production via configuration only.
- Provide a configurable, role-based dashboard (Physician, Nurse, Physical Therapist, Admin) with user overrides.
- Enforce soft deletes, auditability, security baselines, observability, and performance SLAs.

## Architecture Overview
Services and data flow (ports shown):

```
Frontend (Angular/Nginx :8080)
        |
        v
Backend API (NestJS :3000, JWT/RBAC)
        |
        v
Spark-Service (Livy+Spark :8998, Delta connectors)
        |
        v
Object Storage (MinIO dev / S3 / ADLS / GCS)
       (Delta Lake tables)
```

Key principles:
- Backend never touches object storage directly; all reads/writes go through Spark-service.
- Storage provider is selected via environment; credentials are isolated to the Spark-service.

## Frontend (Angular)
- Latest Angular using standalone components, Angular CDK for drag-drop, Material or Bootstrap for UI.
- Routes: `/dashboard` (role-configured panels), `/patient/:id` (details), guarded by `AuthGuard` and `RoleGuard`.
- Components:
  - `PatientSearchComponent` (autocomplete with debounced queries)
  - `PanelListComponent` (drag-drop reorder with persistence)
  - `VitalSignsComponent`, `LabsComponent`, `DemographicsComponent`, `PhysicianVisitsComponent`, `HospitalVisitsComponent`, `MedicationComponent`
  - `SignOnComponent` (JWT sign-in and user status)
- State: `AuthService` (JWT), `PatientStore` (Signals/RxJS) for selected patient and dashboard layout.

## Backend (Node.js)
- Framework: NestJS (TypeScript) for modules, DTO validation, guards, and testing utilities.
- Modules & endpoints:
  - Auth: `POST /auth/login`, `POST /auth/refresh`
  - Patients: `GET /api/patients`, `GET /api/patients/:id`, `GET /api/patients/search?q`
  - Vitals: `GET /api/patients/:id/vitals?from=&to=&type=`
  - Labs: `GET /api/patients/:id/labs?...`
  - Visits: `GET /api/patients/:id/physician-visits?...`, `GET /api/patients/:id/hospital-visits?...`
  - Medications: `GET /api/patients/:id/medications?...`
  - Dashboard config: `GET /dashboard/config`, `PUT /dashboard/config`, `GET /dashboard/registry`
- Spark-only CRUD: Backend calls `SparkService` (Livy/Databricks SQL) for all SELECT/MERGE/UPDATE operations.
- RBAC: JWT includes `role`; guards enforce route access; DTOs validated via `class-validator`.

## Spark & Delta Lake
- Spark-service: Livy + Spark 3.x packaged with Delta Lake and cloud storage connectors; session pooling with retries/timeouts.
- Delta tables:
  - `patients`, `demographics`, `vitals`, `labs`, `visits_physician`, `visits_hospital`, `medications`
  - `dashboard_role_configs`, `dashboard_user_overrides`, `audit_events`
- Partitioning: Time-series tables partitioned by `date` (or `year/month`); Z-Order on `patientId`, `date` for pruning.
- Ingestion: Initial Spark job to normalize current JSON data into Delta tables; ongoing upserts via MERGE.

## Soft Delete Policy
- All deletes are logical; no physical removal.
- Fields on mutable tables: `is_deleted` (bool), `deleted_at` (timestamp), `deleted_by` (user id), `delete_reason` (string).
- Delete operation (via Spark): `UPDATE ... SET is_deleted=true, deleted_at=current_timestamp(), deleted_by=?, delete_reason=? WHERE id=?`.
- Restore operation: `UPDATE ... SET is_deleted=false, deleted_at=null, deleted_by=null, delete_reason=null WHERE id=?`.
- Query default: Exclude soft-deleted rows unless `includeDeleted=true` is explicitly requested.
- Audit: Append immutable record to `audit_events` for every delete/restore.

## Pluggable Storage Providers
- Providers: `delta-minio` (dev), `delta-s3`, `delta-adls`, `delta-gcs`.
- Config factory emits Hadoop/Spark options per provider (e.g., `fs.s3a.*`, ADLS OAuth, GCS connector) from environment variables.
- Credentials live only in Spark-service; backend holds no object store keys.
- Switching providers requires only environment changes and URI paths.

## Dashboard Configuration & RBAC
- Panel registry: Metadata per component (key, title, icon, route, requiredRoles, defaultEnabled).
- Role defaults: `dashboard_role_configs` (role → component enable/order/config).
- User overrides: `dashboard_user_overrides` (user → enable/order/config).
- Effective layout: Role defaults overridden by user settings; filtered by `requiredRoles`.
- Drag-drop persistence: `PUT /dashboard/config` stores per-user order.

## Security & Compliance
- TLS everywhere; encryption at rest on object stores.
- Secrets via environment/secrets (Docker/K8s); key rotation runbooks (KMS/Key Vault).
- HIPAA-minded controls: minimum necessary access, auditable actions, consent/reporting.
- Least privilege: Backend restricted to Livy/SQL; Spark-service scoped to buckets/containers.

## Observability & Performance
- Logging: Structured logs with correlation IDs; propagate Livy statement/session IDs.
- Metrics: Prometheus/OpenMetrics for API latencies, Spark job timings, queue/deadletter counts.
- Tracing: OpenTelemetry across frontend → backend → Spark-service.
- SLAs: Reads < 300ms p95 for simple queries; aggregates < 2s p95; load tests with k6/Gatling.
- Caching: Redis for hot paths (e.g., demographics/header); clear invalidation rules.

## Data Governance & Quality
- DQ rules: Validate vitals units/ranges, lab value sanity checks; schema constraints.
- Lifecycle: Compaction cadence (OPTIMIZE), retention/time travel policies; conservative VACUUM respecting compliance.
- Lower envs: Mask or synthesize PII.

## Containerization & DevOps
- Docker Compose (dev):
  - `frontend` (Nginx:8080), `backend` (Nest:3000), `spark-service` (Livy:8998), `minio` (9000/9001).
  - Single bridge network; health checks; env-driven provider selection.
- CI/CD: Build/test/lint; security scans; artifact signing; blue/green deployments.
- IaC: Terraform/ARM for object store, networking, secrets, and CI/CD pipelines.

## Milestones & Estimates
- M1 (1.5–2 weeks): Scaffolds, Compose up, auth stub, registry/config (mock), provider config factory.
- M2 (2–3 weeks): Delta schemas, ingestion, Patients/Demographics, Vital Signs trends, soft-delete defaults, basic observability/security.
- M3 (3–4 weeks): Labs, Physician/Hospital Visits, Medication; drag-drop persistence; RBAC defaults/overrides; audit logging; SLAs/load tests; DQ rules.
- M4 (2–3 weeks): Tracing; key rotation; provider swap validation (MinIO → S3/ADLS/GCS by env only); cost/capacity planning; runbooks and docs.
- Total: 9–12 weeks with 2 FTE engineers + part-time DevOps.

## Next Steps
1. Confirm provider for production (S3/ADLS/GCS) and access model (IAM/principals).
2. Start M1 scaffolding and compose stack with MinIO.
3. Define precise Delta schemas and run ingestion of current JSON data.
4. Implement `SparkService` and stabilize DTOs for frontend wiring.
5. Begin panel implementation and dashboard configuration APIs.
