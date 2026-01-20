Storage providers and switching (MinIO, JDBC)
============================================

This project supports pluggable storage providers for the `spark-service`.
Providers live under `spark-service/providers` and must export at least `getOptions()`.
Providers may optionally export `testConnection()` to validate connectivity from CI.

Available providers (in this repo):

- `delta-minio` — MinIO / S3-compatible object store (default for local dev)
- `jdbc` — JDBC-style provider (Postgres example) that exposes `jdbc.url`, `jdbc.user`, `jdbc.password`

Switching providers
-------------------
- Set the environment variable `STORAGE_PROVIDER` to the provider name (e.g. `jdbc` or `delta-minio`).
- For `jdbc`, set `JDBC_URL`, `JDBC_USER`, and `JDBC_PASSWORD` in the environment (or via CI secrets).

Example (local `.env`):

  STORAGE_PROVIDER=jdbc
  JDBC_URL=postgres://pr_user:pr_pass@clonet-postgresql:5432/patientrecords
  JDBC_USER=pr_user
  JDBC_PASSWORD=pr_pass

In Docker Compose
-----------------
The compose override `docker-compose.override.postgres.yml` uses env substitution so the Docker step
can inject `JDBC_URL`, `JDBC_USER`, and `JDBC_PASSWORD` at runtime. See `docs/CI-SECRETS.md` for CI details.

Testing providers
-----------------
- The `spark-service` exposes two helpful endpoints:
  - `GET /provider-options` — returns `provider` and its `options` as JSON
  - `GET /provider-test` — runs `testConnection()` if implemented by the provider

- Use the included helper to poll the test endpoint until it succeeds:

  ```bash
  # run locally against the service
  node spark-service/test-provider.js --url http://localhost:8998 --timeout 120
  ```

CI notes
--------
- The integration workflow passes JDBC secrets into the `docker compose` step via `env:` (no .env file).
- Ensure the GitHub Secrets `PR_DB_HOST`, `PR_DB_NAME`, `PR_DB_USER`, `PR_DB_PASSWORD` are set.
