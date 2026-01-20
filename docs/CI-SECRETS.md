CI integration: required secrets and quick verification
===============================================

Create these repository secrets in GitHub (Repository Settings → Secrets):

- `PR_DB_HOST` — Postgres host reachable from the compose network (example: `clonet-postgresql`)
- `PR_DB_NAME` — database name (example: `patientrecords`)
- `PR_DB_USER` — DB user with schema privileges (example: `pr_user`)
- `PR_DB_PASSWORD` — password for `PR_DB_USER` (example: `pr_pass`)

How the workflow uses them
- The integration workflow writes a `.env` file from these secrets before running `docker compose`.
- The `docker-compose.override.postgres.yml` file reads `JDBC_URL`, `JDBC_USER`, and `JDBC_PASSWORD` from the generated `.env`.

Quick verification (locally)
1. Copy `.env.example` to `.env` and populate the `JDBC_*` values (or create the GitHub secrets).

   ```bash
   cp .env.example .env
   # edit .env to set JDBC_URL/JDBC_USER/JDBC_PASSWORD OR set the PR_* secrets in Actions
   ```

2. Start the compose stack (override file points the spark-service at the JDBC URL):

   ```bash
   docker compose -f docker-compose.yml -f docker-compose.override.postgres.yml up -d --build
   ```

3. Wait for health endpoints and run the provider test manually:

   ```bash
   curl -sSf http://localhost:3001/health && echo backend OK
   curl -sSf http://localhost:8998/health && echo spark-service OK

   # run the provider test (same command used in CI)
   docker compose exec -T spark-service npm run integration:provider-test
   ```

Triggering the workflow in GitHub
- Open the Actions tab → select "Integration Compose Test" → "Run workflow".

Notes
- Keep real DB credentials out of the repo. Use GitHub Secrets and RBAC-limited DB users for CI.
- If you prefer, modify the workflow to use environment-specific names for secrets (e.g., `PR_DB_HOST_STAGING`).
