# PatientRecords - Build & Release Guide

**For**: Internal Development & DevOps Team  
**Version**: 1.0  
**Date**: February 26, 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Versioning Strategy](#versioning-strategy)
3. [Build Process](#build-process)
4. [Registry Setup](#registry-setup)
5. [Release Checklist](#release-checklist)
6. [Troubleshooting](#troubleshooting)

---

## Overview

This document describes how to build PatientRecords images and release them to the registry for customer deployment.

### Release Workflow

```
Development
    ↓
Create Release Branch (release/v1.0.0)
    ↓
Update Version Numbers
    ↓
Build Docker Images
    ↓
Tag Images (v1.0.0, latest)
    ↓
Push to Registry (registry.patientrecords.local)
    ↓
Create Release Notes
    ↓
Notify Customers
    ↓
Release Complete
```

---

## Versioning Strategy

### Semantic Versioning: MAJOR.MINOR.PATCH

```
v1.0.0  = Major.Minor.Patch
│  │  └─ Patch: Bug fixes (v1.0.1)
│  └──── Minor: New features, backward compatible (v1.1.0)
└─────── Major: Breaking changes (v2.0.0)
```

### Examples

| Version | When Used | Example Changes |
|---------|-----------|-----------------|
| v1.0.0 | Initial release | First stable version |
| v1.0.1 | Security patch | Fix vulnerability |
| v1.1.0 | New feature | Add allergies display |
| v2.0.0 | Breaking change | Database schema redesign |

### Image Tags in Registry

```
registry.patientrecords.local/patientrecords/shell:v1.0.0
registry.patientrecords.local/patientrecords/shell:v1.0
registry.patientrecords.local/patientrecords/shell:v1
registry.patientrecords.local/patientrecords/shell:latest
```

**Tag Strategy**:
- **Specific**: `v1.0.0` - Exact version (customers use this)
- **Minor**: `v1.0` - Latest of v1.0.x
- **Major**: `v1` - Latest of v1.x.x
- **Latest**: `latest` - Very latest (for testing, not production)

---

## Build Process

### Prerequisites

Required tools:
- Docker 20.10+
- Git configured with SSH/HTTPS
- Access to registry.patientrecords.local
- Write permissions to image registry

### Step 1: Create Release Branch

```bash
# Create release branch from main
git checkout main
git pull origin main

# Create release branch
git checkout -b release/v1.0.0

# OR for patch releases
git checkout -b release/v1.0.1
```

### Step 2: Update Version Numbers

Update version in these locations:

**backend/package.json**:
```json
{
  "version": "1.0.0",
  ...
}
```

**frontend/shell-app/package.json**:
```json
{
  "version": "1.0.0",
  ...
}
```

**docs/CUSTOMER_DEPLOYMENT_GUIDE.md** (update example image tags):
```markdown
image: registry.patientrecords.local/patientrecords/shell:v1.0.0
```

**Commit version bumps**:
```bash
git add .
git commit -m "Bump version to v1.0.0"
```

### Step 3: Build Docker Images

```bash
# Build all images with semantic version tag
docker-compose build \
  --build-arg VERSION=1.0.0 \
  --no-cache

# This builds with tag: patientrecord-shell, patientrecord-backend, etc.
```

**OR build individual images**:
```bash
# Backend
docker build -f backend/Dockerfile \
  -t patientrecord-backend:v1.0.0 \
  -t patientrecord-backend:latest \
  backend/

# Shell app
docker build -f frontend/shell-app/Dockerfile \
  -t patientrecord-shell:v1.0.0 \
  -t patientrecord-shell:latest \
  frontend/

# Similar for other modules...
```

### Step 4: Tag Images for Registry

Before pushing to registry, tag with full registry path:

```bash
# Tag backend image
docker tag patientrecord-backend:v1.0.0 \
  registry.patientrecords.local/patientrecords/backend:v1.0.0

docker tag patientrecord-backend:v1.0.0 \
  registry.patientrecords.local/patientrecords/backend:v1.0

docker tag patientrecord-backend:v1.0.0 \
  registry.patientrecords.local/patientrecords/backend:v1

docker tag patientrecord-backend:v1.0.0 \
  registry.patientrecords.local/patientrecords/backend:latest

# Repeat for all other images:
# - patientrecord-shell
# - patientrecord-demographics
# - patientrecord-vitals
# - patientrecord-labs
# - patientrecord-medications
# - patientrecord-visits
# - patientrecord-mongodb
```

**Script to automate tagging** (`tag-images.sh`):
```bash
#!/bin/bash
VERSION=${1:-v1.0.0}
REGISTRY="registry.patientrecords.local"

IMAGES=(
  "patientrecord-shell"
  "patientrecord-demographics"
  "patientrecord-vitals"
  "patientrecord-labs"
  "patientrecord-medications"
  "patientrecord-visits"
  "patientrecord-backend"
  "patientrecord-mongodb"
)

for image in "${IMAGES[@]}"; do
  # Extract version number without 'v' prefix
  VERSION_NUM=${VERSION#v}
  
  # Tag with registry prefix
  docker tag "$image:$VERSION" "$REGISTRY/patientrecords/${image#patientrecord-}:$VERSION"
  docker tag "$image:$VERSION" "$REGISTRY/patientrecords/${image#patientrecord-}:${VERSION_NUM%.*}"
  docker tag "$image:$VERSION" "$REGISTRY/patientrecords/${image#patientrecord-}:${VERSION_NUM%%.*}"
  docker tag "$image:$VERSION" "$REGISTRY/patientrecords/${image#patientrecord-}:latest"
done
```

Usage:
```bash
chmod +x tag-images.sh
./tag-images.sh v1.0.0
```

### Step 5: Push to Registry

#### Log In to Registry

```bash
# For password authentication
docker login registry.patientrecords.local

# Credentials: [provided by registry admin]
```

#### Push All Images

```bash
# Push all tagged images
docker push registry.patientrecords.local/patientrecords/backend:v1.0.0
docker push registry.patientrecords.local/patientrecords/backend:v1.0
docker push registry.patientrecords.local/patientrecords/backend:v1
docker push registry.patientrecords.local/patientrecords/backend:latest

# Repeat for all other images...
```

**Script to automate push** (`push-images.sh`):
```bash
#!/bin/bash
VERSION=${1:-v1.0.0}
REGISTRY="registry.patientrecords.local"

SERVICES=(
  "shell"
  "demographics"
  "vitals"
  "labs"
  "medications"
  "visits"
  "backend"
  "mongodb"
)

for service in "${SERVICES[@]}"; do
  echo "Pushing $service..."
  
  docker push "$REGISTRY/patientrecords/$service:$VERSION"
  docker push "$REGISTRY/patientrecords/$service:${VERSION%.*}"
  docker push "$REGISTRY/patientrecords/$service:${VERSION%%.*}"
  docker push "$REGISTRY/patientrecords/$service:latest"
  
  echo "✓ $service pushed"
done

echo "All images pushed successfully!"
```

Usage:
```bash
chmod +x push-images.sh
./push-images.sh v1.0.0
```

---

## Registry Setup

### Docker Registry v2 (Self-Hosted)

If you don't have a registry yet, deploy Docker Registry:

```bash
# Run Docker Registry container
docker run -d \
  -p 5000:5000 \
  --name registry \
  -v registry-data:/var/lib/registry \
  registry:2

# Registry is now accessible at: localhost:5000
# For remote access, set up nginx reverse proxy with HTTPS
```

### HTTPS Setup (Required for Production)

```bash
# Create nginx configuration
docker run -d \
  -p 443:443 \
  -p 80:80 \
  -v /path/to/cert.pem:/etc/nginx/cert.pem \
  -v /path/to/key.pem:/etc/nginx/key.pem \
  -v /path/to/nginx.conf:/etc/nginx/nginx.conf \
  --name registry-proxy \
  nginx

# Then docker login registry.patientrecords.local will work
```

### Registry Cleanup

```bash
# List images in registry
curl -X GET http://registry:5000/v2/_catalog

# Delete image (requires garbage collection)
# Deleting is complex; consider using registry UI instead
```

---

## Release Checklist

### Pre-Release (1 week before)

- [ ] Merge all feature branches to main
- [ ] Run full test suite
- [ ] Update README.md with new features
- [ ] Update CHANGELOG.md with version changes
- [ ] Code review by 2+ team members
- [ ] Security scan for vulnerabilities
- [ ] Load test for performance regressions

### Build Day

- [ ] Create `release/v1.x.x` branch from main
- [ ] Update version numbers in package.json files
- [ ] Update documentation with new version tag
- [ ] Build all Docker images: `docker-compose build`
- [ ] Run image tests:
  ```bash
  docker-compose -f docker-compose.prod.yml up -d
  docker-compose -f docker-compose.prod.yml logs
  # Verify all containers start
  # Test application access
  ```
- [ ] Tag all images with version
- [ ] Test pull from registry:
  ```bash
  docker-compose -f docker-compose.prod.yml pull
  docker-compose -f docker-compose.prod.yml up -d
  # Verify application works with pulled images
  ```
- [ ] Push to registry: `./push-images.sh v1.0.0`
- [ ] Verify images in registry:
  ```bash
  curl http://registry:5000/v2/_catalog
  ```

### Post-Release

- [ ] Create Git tag: `git tag v1.0.0`
- [ ] Push tag to repository: `git push origin v1.0.0`
- [ ] Create release notes on GitHub/GitLab
- [ ] Update customer documentation with release details
- [ ] Notify customers of new release
- [ ] Create deployment guide download link
- [ ] Monitor for issues in customer reports

### Release Notes Template

```markdown
# Release v1.0.0

**Release Date**: February 26, 2026

## New Features
- Feature 1 description
- Feature 2 description

## Bug Fixes
- Bug fix 1 description
- Bug fix 2 description

## Security Fixes
- Security issue 1 description

## Breaking Changes
- None (this is a minor release)

## Upgrade Instructions
1. Pull new images: `docker-compose -f docker-compose.prod.yml pull`
2. Restart services: `docker-compose -f docker-compose.prod.yml restart`
3. Verify: All containers should restart without errors

## Image Tags
- registry.patientrecords.local/patientrecords/shell:v1.0.0
- registry.patientrecords.local/patientrecords/backend:v1.0.0
- (all 8 images available with v1.0.0 tag)
```

---

## Troubleshooting

### Issue 1: Images Won't Build

**Error**: `docker: build "patientrecord-backend" is not allowed`

**Solution**:
```bash
# Make sure Dockerfile exists in backend/
ls -la backend/Dockerfile

# Check Docker daemon is running
docker ps

# Try single image build
docker build -f backend/Dockerfile -t patientrecord-backend:v1.0.0 backend/
```

### Issue 2: Registry Push Fails

**Error**: `unauthorized: authentication required`

**Solution**:
```bash
# Log in to registry first
docker login registry.patientrecords.local

# Verify login worked
docker info

# Then retry push
docker push registry.patientrecords.local/patientrecords/backend:v1.0.0
```

### Issue 3: Image Not Pulling from Registry

**Error**: `image not found: registry.patientrecords.local/patientrecords/backend:v1.0.0`

**Solution**:
```bash
# Verify image is in registry
curl -X GET http://registry:5000/v2/_catalog

# Verify you're connected to correct registry
docker info

# Pull manually first
docker pull registry.patientrecords.local/patientrecords/backend:v1.0.0

# Then try docker-compose pull
docker-compose -f docker-compose.prod.yml pull
```

---

## Complete Release Script

```bash
#!/bin/bash
# complete-release.sh - Automate entire release process

VERSION=${1:-v1.0.0}
REGISTRY="registry.patientrecords.local"

echo "======================="
echo "PatientRecords Release: $VERSION"
echo "======================="

# Step 1: Create release branch
echo "Creating release branch..."
git checkout -b "release/$VERSION"

# Step 2: Build images
echo "Building images..."
docker-compose build --no-cache

# Step 3: Tag images
echo "Tagging images..."
./tag-images.sh "$VERSION"

# Step 4: Test images
echo "Testing images..."
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
sleep 30
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml down

# Step 5: Push to registry
echo "Pushing to registry..."
./push-images.sh "$VERSION"

# Step 6: Create Git tag
echo "Creating Git tag..."
git tag "$VERSION"
git push origin "$VERSION"

# Step 7: Success
echo ""
echo "✓ Release $VERSION completed!"
echo "  Images available at: registry.patientrecords.local/patientrecords/*:$VERSION"
echo "  Next: Create release notes and notify customers"
```

Usage:
```bash
chmod +x complete-release.sh
./complete-release.sh v1.0.0
```

---

## Rollback Procedure

If there's an issue with a release:

```bash
# Revert to previous version
docker-compose -f docker-compose.prod.yml pull  # Pulls previous version tag
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d

# OR specifically pull previous version
docker-compose pull --policy=never  # Uses already downloaded images
```

---

**Document Version**: 1.0  
**Last Updated**: February 26, 2026  
**Maintenance**: DevOps Team  
