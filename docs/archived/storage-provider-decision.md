# Storage Provider Decision (draft)

This document summarizes options for production storage provider and recommended environment/access models for the `PatientRecords` project.

## Background
The modernization plan specifies MinIO for local/dev and S3/ADLS Gen2/GCS for production. The Spark-service (Livy+Spark) is the component that will hold cloud credentials and access object storage (Delta tables).

## Options
- delta-minio (dev)
  - Local MinIO (S3-compatible). Good for local dev and integration testing.
  - Env examples: `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`, `MINIO_ENDPOINT`.
- delta-s3 (AWS S3)
  - Production-ready, broad ecosystem support (S3A connector). Use IAM roles where possible.
  - Auth: IAM role (preferred for EC2/EKS) or `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` for CI/service principals.
  - Env examples: `AWS_REGION`, `AWS_S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`.
- delta-adls (Azure Data Lake Storage Gen2)
  - Native for Azure. Use service principal (client id/secret) or Managed Identity.
  - Env examples: `AZURE_STORAGE_ACCOUNT`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID`.
- delta-gcs (Google Cloud Storage)
  - Use Workload Identity (GKE) or service account JSON key.
  - Env examples: `GOOGLE_APPLICATION_CREDENTIALS` (path) or in-cluster Workload Identity.

## Recommendation (decision pending)
If you already operate on a specific cloud, choose the native provider for production (S3 for AWS, ADLS for Azure, GCS for GCP). If there is no existing cloud preference, I recommend `delta-s3` (S3) because of wide connector support and simplicity of developer tooling.

For dev and CI, keep `delta-minio` as the default provider.

## Access model guidance
- Always prefer cloud-native identity mechanisms (IAM roles, Managed Identities, Workload Identity) over long-lived keys.
- Keep credentials scoped to the Spark-service only; the backend API should not have object-store keys.
- Use environment variables or secret mounts (Docker secrets / K8s secrets / vault) - never check secrets into repo.

## Required next steps (implementation within `PatientRecords`)
1. Decide production provider (`delta-s3` | `delta-adls` | `delta-gcs`).
2. Add `PatientRecords/.env.example` with provider selection and non-secret keys (e.g., `STORAGE_PROVIDER=delta-s3`).
3. Implement provider config factory in `spark-service` that maps `STORAGE_PROVIDER` → Spark/Hadoop options.
4. Add MinIO service to dev `docker-compose` for local testing (M1 task).
5. Create Ops runbook for storing/rotating credentials (Terraform or cloud IAM guidance).

## Suggested env variables (examples)
- `STORAGE_PROVIDER` = `delta-minio` | `delta-s3` | `delta-adls` | `delta-gcs`

S3 example:
- `AWS_REGION`
- `AWS_S3_BUCKET`
- `AWS_ACCESS_KEY_ID` (prefer not to use)
- `AWS_SECRET_ACCESS_KEY` (prefer not to use)

ADLS example:
- `AZURE_STORAGE_ACCOUNT`
- `AZURE_CLIENT_ID`
- `AZURE_CLIENT_SECRET`
- `AZURE_TENANT_ID`

GCS example:
- `GOOGLE_APPLICATION_CREDENTIALS` (file path to JSON key) or use Workload Identity

MinIO example (dev):
- `MINIO_ROOT_USER`
- `MINIO_ROOT_PASSWORD`
- `MINIO_ENDPOINT` (`http://minio:9000`)

---

Please confirm which production provider you prefer (S3 / ADLS / GCS) and whether you want me to:
- Add an `.env.example` and MinIO dev service to `PatientRecords/docker-compose.yml`, and
- Implement a simple provider-factory skeleton inside `PatientRecords/spark-service` that emits example Spark options.

I'll wait for your choice before implementing the provider-specific files.
