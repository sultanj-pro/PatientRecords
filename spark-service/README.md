# spark-service (stub)

This is a minimal stub for the `spark-service` used during M1 development. It exposes:

- `GET /health` — quick liveness check
- `GET /provider-options` — returns example Spark/Hadoop options from `provider-factory.js`

Usage:

1. From `PatientRecords/spark-service` run `npm install` (requires Node 18+).
2. Start: `npm start`.

This stub is intended to be replaced by the full Livy/Spark client implementation that manages sessions and executes queries against Delta tables.
