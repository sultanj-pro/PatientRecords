# PatientRecords Modernization Plan

(See original plan in parent repo docs for detailed architecture.)

This repo hosts the modernized implementation with:
- Angular frontend (standalone components, CDK drag-drop)
- Node.js backend (NestJS, JWT/RBAC)
- Spark-service for CRUD via Delta Lake on object storage
- Pluggable storage providers (MinIO dev; S3/ADLS/GCS prod)

Refer to the parent doc for milestones, tables, and policies.
