# PatientRecords

Modernized patient records dashboard.

## Structure

- frontend/ — Angular app (components, routing, services)
- backend/ — Node/NestJS API (auth, RBAC, Spark client)
- spark-service/ — Spark + Livy service (Delta connectors)
- docs/ — design docs and plans
- scripts/ — local dev and utility scripts
- .github/workflows/ — CI pipelines (to be added)

## Next

- Scaffold Angular/NestJS projects
- Add Dockerfiles and dev compose
- Implement Spark-only CRUD and RBAC dashboard
