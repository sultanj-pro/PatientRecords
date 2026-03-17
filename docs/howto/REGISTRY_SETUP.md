# PatientRecords - Docker Registry Setup Guide

**For**: DevOps & Infrastructure Team  
**Version**: 1.0  
**Date**: February 26, 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Quick Setup](#quick-setup)
4. [Production Setup](#production-setup)
5. [Security Configuration](#security-configuration)
6. [Registry Management](#registry-management)
7. [Backup & Monitoring](#backup--monitoring)
8. [Troubleshooting](#troubleshooting)

---

## Overview

Docker Registry v2 is a stateless server that stores and distributes Docker images.

### Why Self-Hosted Registry?

- **Security**: Images stay within your infrastructure (no public Docker Hub)
- **Control**: Full control over image versioning and access
- **Performance**: Internal network access faster than public registry
- **Compliance**: Meet data residency and audit requirements
- **Cost**: No per-image licensing fees

### Registry Endpoints

| Environment | URL | Available To |
|-------------|-----|---|
| Development | `localhost:5000` | Local developers |
| Production | `registry.patientrecords.local` | Internal staff + authorized customers |
| Cloud Backup | Optional: `backup.registry.internal` | Disaster recovery |

---

## Architecture

### Simple Architecture (Development)

```
Developer Workstation
        ↓
  docker push/pull
        ↓
Registry Container (port 5000)
        ↓
Storage Volume
```

### Production Architecture (Recommended)

```
Customers/CI/CD
        ↓ HTTPS
    Nginx Proxy (443)
        ↓
Registry Container (5000)
        ↓
Persistent Volume
        ↓
Network Storage (NFS/EBS)
```

### High-Availability Architecture

```
Customers
  ↓  ↓  ↓
Load Balancer
  ↓  ↓  ↓
Registry-1  Registry-2  Registry-3
        ↓
Shared Storage (NFS)
```

---

## Quick Setup

### 1. Deploy Registry Container (5 minutes)

```bash
# Create registry data directory
mkdir -p /data/registry

# Run registry container
docker run -d \
  --name registry \
  -p 5000:5000 \
  -v /data/registry:/var/lib/registry \
  --restart unless-stopped \
  registry:2

# Verify running
docker ps | grep registry
```

**Test Registry**:
```bash
# List images (should be empty)
curl http://localhost:5000/v2/_catalog

# Response: {"repositories":[]}
```

### 2. Tag and Push Test Image

```bash
# Pull a test image
docker pull nginx:latest

# Tag for local registry
docker tag nginx:latest localhost:5000/test/nginx:latest

# Push to registry
docker push localhost:5000/test/nginx:latest

# Verify
curl http://localhost:5000/v2/_catalog
# Response: {"repositories":["test/nginx"]}
```

### 3. Pull from Registry

```bash
# Pull from registry
docker pull localhost:5000/test/nginx:latest

# Run container
docker run -d --name test-nginx localhost:5000/test/nginx:latest

# Clean up
docker stop test-nginx
docker rm test-nginx
docker rmi localhost:5000/test/nginx:latest
```

---

## Production Setup

### 1. Prerequisites

- Docker 20.10+ installed
- Nginx reverse proxy configured
- SSL/TLS certificate (self-signed or from CA)
- DNS entry: `registry.patientrecords.local`
- Network access to registry server from all client machines
- Minimum 100GB storage for images

### 2. Create Registry Configuration

Create `registry-config.yml`:

```yaml
# Docker Registry v2 configuration
version: 0.1

log:
  level: info
  fields:
    service: registry
    environment: production

storage:
  delete:
    enabled: true  # Allow image deletion
  cache:
    blobdescriptor: inmemory
  filesystem:
    rootdirectory: /var/lib/registry

auth:
  htpasswd:
    realm: PatientRecords Registry
    path: /etc/docker/registry/htpasswd

http:
  addr: :5000
  headers:
    X-Content-Type-Options: [nosniff]
    X-Frame-Options: [DENY]
    X-XSS-Protection: [1; mode=block]

health:
  storagedriver:
    enabled: true
    interval: 10s
    threshold: 5
```

### 3. Create Authentication File

Generate user credentials:

```bash
# Install htpasswd utility
apt-get install -y apache2-utils  # Ubuntu/Debian
# OR
yum install -y httpd-tools  # CentOS/RHEL

# Create htpasswd file (first user)
htpasswd -Bbc /data/registry/htpasswd developer ChangeMe123!

# Add more users
htpasswd -Bb /data/registry/htpasswd ci-system ChangeMe456!
htpasswd -Bb /data/registry/htpasswd customer-pull ReadOnlyPass789!

# View users
cat /data/registry/htpasswd

# Output:
# developer:$2y$05$...hash...
# ci-system:$2y$05$...hash...
# customer-pull:$2y$05$...hash...
```

### 4. Deploy Registry with Config

```bash
# Stop old registry
docker stop registry
docker rm registry

# Run registry with config and auth
docker run -d \
  --name registry \
  -p 127.0.0.1:5000:5000 \
  -v /data/registry:/var/lib/registry \
  -v /data/registry/registry-config.yml:/etc/docker/registry/config.yml \
  -v /data/registry/htpasswd:/etc/docker/registry/htpasswd \
  --restart unless-stopped \
  registry:2

# Verify running
docker logs registry
```

### 5. Setup Nginx Reverse Proxy

Create `/etc/nginx/sites-available/registry`:

```nginx
upstream registry {
    server localhost:5000;
}

server {
    listen 80;
    server_name registry.patientrecords.local;
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name registry.patientrecords.local;

    # SSL Certificates
    ssl_certificate /etc/ssl/certs/registry.crt;
    ssl_certificate_key /etc/ssl/private/registry.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Disable caching for registry
    add_header 'Docker-Distribution-API-Version' 'registry/2.0' always;

    client_max_body_size 5000m;

    location / {
        proxy_pass http://registry;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Docker client compatibility
        proxy_buffering off;
        proxy_request_buffering off;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }
}
```

Enable nginx configuration:

```bash
# Create symlink
ln -s /etc/nginx/sites-available/registry /etc/nginx/sites-enabled/

# Test nginx config
nginx -t

# Reload nginx
systemctl reload nginx

# Verify
curl -k https://registry.patientrecords.local/v2/_catalog
# Should prompt for HTTP Basic Auth
```

---

## Security Configuration

### 1. SSL/TLS Certificate

#### Self-Signed (Development)

```bash
openssl req -x509 -newkey rsa:4096 -keyout registry.key -out registry.crt -days 365 -nodes \
  -subj "/CN=registry.patientrecords.local"

# Copy to nginx
cp registry.crt /etc/ssl/certs/
cp registry.key /etc/ssl/private/
chmod 600 /etc/ssl/private/registry.key
```

#### CA-Signed (Production)

Work with your certificate provider (Let's Encrypt, internal CA, etc.)

```bash
# For Let's Encrypt with Certbot
certbot certonly --standalone -d registry.patientrecords.local

# Copy certificates
cp /etc/letsencrypt/live/registry.patientrecords.local/fullchain.pem /etc/ssl/certs/registry.crt
cp /etc/letsencrypt/live/registry.patientrecords.local/privkey.pem /etc/ssl/private/registry.key
```

### 2. Client Certificate Trust

#### For Self-Signed Certificates

Each client must trust the certificate:

**Linux/macOS**:
```bash
# Copy server certificate to client
scp user@registry-server:/etc/ssl/certs/registry.crt ./

# Add to Docker daemon
mkdir -p /etc/docker/certs.d/registry.patientrecords.local
cp registry.crt /etc/docker/certs.d/registry.patientrecords.local/ca.crt

# Restart Docker daemon
systemctl restart docker

# Test
docker login registry.patientrecords.local
```

**Windows**:
```powershell
# Copy server certificate to client
scp user@registry-server:/etc/ssl/certs/registry.crt ./registry.crt

# Import to trusted root
certutil -addstore -f "Root" registry.crt

# For Docker Desktop, place in:
# mkdir $env:APPDATA\Docker\certs.d\registry.patientrecords.local
# Copy registry.crt to that directory

# Restart Docker Desktop
```

### 3. Authentication

#### User Permissions

Different roles need different access levels:

```bash
# Developer: push/pull images
htpasswd -Bb /data/registry/htpasswd dev-team password123

# CI System: push (build) and pull (deploy)
htpasswd -Bb /data/registry/htpasswd ci-pipeline password456

# Customers: pull only (read-only)
htpasswd -Bb /data/registry/htpasswd customer-001 readonly789

# Admins: full access
htpasswd -Bb /data/registry/htpasswd admin-user adminpass123
```

**Note**: Registry doesn't natively support role-based access control (RBAC). For RBAC, consider:
- Harbor (Docker Registry wrapper with RBAC)
- Nexus Repository Manager
- Artifactory

### 4. Network Security

```bash
# Restrict registry access to internal network only
# (Already done with 127.0.0.1:5000 in docker run)

# Add firewall rules
ufw allow 443/tcp  # HTTPS
ufw allow 22/tcp   # SSH for management
# Do NOT expose port 5000 publicly
```

---

## Registry Management

### 1. List Repositories

```bash
# View all repositories
curl -u developer:ChangeMe123! \
  https://registry.patientrecords.local/v2/_catalog

# Response:
# {
#   "repositories": [
#     "patientrecords/shell",
#     "patientrecords/backend",
#     "patientrecords/demographics",
#     ...
#   ]
# }
```

### 2. List Image Tags

```bash
# View tags for specific image
curl -u developer:ChangeMe123! \
  https://registry.patientrecords.local/v2/patientrecords/backend/tags/list

# Response:
# {
#   "name": "patientrecords/backend",
#   "tags": ["v1.0.0", "v1.0.1", "v1.1", "v1", "latest"]
# }
```

### 3. Delete Images

```bash
# Get image digest
curl -I -u developer:ChangeMe123! \
  https://registry.patientrecords.local/v2/patientrecords/backend/manifests/v1.0.0 \
  -H "Accept: application/vnd.docker.distribution.manifest.v2+json"

# Note the Docker-Content-Digest header

# Delete with digest
curl -X DELETE -u developer:ChangeMe123! \
  https://registry.patientrecords.local/v2/patientrecords/backend/manifests/sha256:abc123...

# Run garbage collection (remove unreferenced blobs)
docker exec registry /bin/registry garbage-collect /etc/docker/registry/config.yml
```

### 4. Client Login

```bash
# For developers
docker login registry.patientrecords.local
# Username: developer
# Password: ChangeMe123!

# For CI/CD pipeline
docker login -u ci-pipeline -p ChangeMe456! registry.patientrecords.local

# For customers
docker login -u customer-001 -p readonly789 registry.patientrecords.local
```

---

## Backup & Monitoring

### 1. Backup Strategy

**What to Back Up**:
- Image data: `/data/registry`
- Registry configuration: `/data/registry/registry-config.yml`
- Authentication: `/data/registry/htpasswd`

```bash
# Create backup
tar -czf /backups/registry-backup-$(date +%Y%m%d).tar.gz \
  /data/registry \
  /etc/docker/registry/

# Store backup
scp /backups/registry-backup-*.tar.gz backup-server:/backups/

# Backup frequency: Daily or after major releases
```

**Restore from Backup**:
```bash
# Stop registry
docker stop registry
docker rm registry

# Extract backup
tar -xzf /backups/registry-backup-20260226.tar.gz -C /

# Start registry
docker run -d \
  --name registry \
  -p 127.0.0.1:5000:5000 \
  -v /data/registry:/var/lib/registry \
  registry:2
```

### 2. Storage Monitoring

```bash
# Check registry size
du -sh /data/registry

# Monitor disk usage
df -h /data

# Set up alert if usage exceeds 80%
```

### 3. Registry Health Check

```bash
# Check registry health endpoint
curl -u developer:ChangeMe123! \
  https://registry.patientrecords.local/v2/

# Should return: {}

# Check specific storage driver health
docker logs registry | grep -i health
```

### 4. Logging & Monitoring

View registry logs:

```bash
# Recent logs
docker logs registry

# Follow logs
docker logs -f registry

# Log output location
docker exec registry tail -f /var/log/registry/registry.log
```

**Recommended Monitoring Tools**:
- Prometheus + Grafana (metrics)
- ELK Stack (logs)
- Sentry (error tracking)

---

## Troubleshooting

### Issue 1: Can't Login to Registry

**Error**: `Unauthorized: authentication required`

**Solutions**:

```bash
# 1. Verify credentials
docker login registry.patientrecords.local
# Enter username and password from htpasswd

# 2. Check if user exists
grep developer /data/registry/htpasswd

# 3. Verify registry is running
docker ps | grep registry

# 4. Check registry logs
docker logs registry
```

### Issue 2: Pull Fails - "Unknown Repository"

**Error**: `name unknown: repository not found`

**Solutions**:

```bash
# 1. Verify image exists in registry
curl -u developer:ChangeMe123! \
  https://registry.patientrecords.local/v2/_catalog

# 2. Verify correct image name
# Should be: registry.patientrecords.local/patientrecords/backend:v1.0.0
# Wrong: registry.patientrecords.local/backend:v1.0.0

# 3. Check if image was pushed
docker push registry.patientrecords.local/patientrecords/backend:v1.0.0

# 4. Then try pulling
docker pull registry.patientrecords.local/patientrecords/backend:v1.0.0
```

### Issue 3: SSL Certificate Error

**Error**: `x509: certificate signed by unknown authority`

**Solutions**:

```bash
# 1. Add certificate to Docker daemon
mkdir -p /etc/docker/certs.d/registry.patientrecords.local
scp admin@registry:/etc/ssl/certs/registry.crt \
  /etc/docker/certs.d/registry.patientrecords.local/ca.crt

# 2. Restart Docker
systemctl restart docker

# 3. Test
docker pull registry.patientrecords.local/patientrecords/backend:latest
```

### Issue 4: Registry Runs Out of Disk Space

**Solutions**:

```bash
# 1. Check current usage
du -sh /data/registry

# 2. Delete old images (if not needed)
curl -X DELETE -u developer:ChangeMe123! \
  https://registry.patientrecords.local/v2/patientrecords/old-service/manifests/sha256:...

# 3. Run garbage collection
docker exec registry /bin/registry garbage-collect /etc/docker/registry/config.yml

# 4. Expand storage
# Mount larger volume
# Restore backup after expansion
```

### Issue 5: Registry Performance is Slow

**Solutions**:

```bash
# 1. Check if registry container has resource limits
docker inspect registry | grep -A 10 HostConfig

# 2. Increase resources if needed
docker stop registry
docker rm registry
docker run -d \
  --name registry \
  --memory=2g \
  --cpus=2 \
  -p 127.0.0.1:5000:5000 \
  -v /data/registry:/var/lib/registry \
  registry:2

# 3. Check if storage is slow (network or disk)
# Run: fio --name=random-reads --rw=randread --size=100m /data/registry
```

---

## Database Schema Cleanup

```bash
# Get registry database info
docker exec registry ls -la /var/lib/registry/docker/registry/v2

# Clean up unused blobs
docker exec registry /bin/registry garbage-collect /etc/docker/registry/config.yml -m

# -m flag: do a dry run first
# Then remove -m flag to actually delete
```

---

## Additional Tools

### Registry Web UI

For visual management, use **Docker Registry Browser**:

```bash
docker run -d \
  --name registry-ui \
  -p 8080:8080 \
  --link registry:registry \
  -e REGISTRY_HOST=registry \
  -e REGISTRY_PORT=5000 \
  -e REGISTRY_PROTOCOL=http \
  joxit/docker-registry-ui:latest

# Access at http://localhost:8080
```

---

## Maintenance Schedule

| Task | Frequency | Command |
|------|-----------|---------|
| Check disk usage | Daily | `du -sh /data/registry` |
| Monitor logs | Daily | `docker logs registry` |
| Backup registry | Weekly | `tar -czf backup.tar.gz /data/registry` |
| Cleanup old images | Monthly | `docker exec registry garbage-collect ...` |
| Security audit | Monthly | Review htpasswd, SSL certs |
| Database optimization | Quarterly | Full garbage collection |
| Capacity planning | Quarterly | `du -sh` and project growth |

---

**Document Version**: 1.0  
**Last Updated**: February 26, 2026  
**Maintenance**: Infrastructure Team  
