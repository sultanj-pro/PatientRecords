# PatientRecords

Modernized patient records dashboard.

## Structure

- frontend/ — Angular app (components, routing, services)
- frontend/ — Lightweight placeholder SPA served by nginx (temporary). The full Angular CLI project is planned under `frontend/`.
- backend/ — Node/NestJS API (auth, RBAC, Spark client)
- spark-service/ — Spark + Livy service (Delta connectors)
- docs/ — design docs and plans
- scripts/ — local dev and utility scripts
- .github/workflows/ — CI pipelines (to be added)

## Next

- Scaffold Angular/NestJS projects
- Add Dockerfiles and dev compose
- Implement Spark-only CRUD and RBAC dashboard

## Local run

To run the local dev stack (frontend, backend, spark-service, minio):

```powershell
cd PatientRecords
docker compose up -d --build pr-frontend pr-backend spark-service minio
```

The UI placeholder is served at http://localhost:8081 and the backend API at http://localhost:3001.

CI / Integration tests
----------------------

The repository contains an integration workflow that brings up the compose stack and runs provider tests. Add the CI secrets described in `docs/CI-SECRETS.md` before running the workflow in GitHub Actions.

See [docs/CI-SECRETS.md](docs/CI-SECRETS.md#L1) for exact secret names and quick verification steps.
