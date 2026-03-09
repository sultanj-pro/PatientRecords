# PatientRecords - Installation & Setup Guide

## Table of Contents

1. [Overview](#overview)
2. [Quick Start (5 minutes)](#quick-start-5-minutes)
3. [System Requirements](#system-requirements)
4. [Installation Process](#installation-process)
5. [Configuration](#configuration)
6. [Verification & Testing](#verification--testing)
7. [Common Issues & Troubleshooting](#common-issues--troubleshooting)
8. [Post-Installation Setup](#post-installation-setup)
9. [Operations & Maintenance](#operations--maintenance)
10. [Uninstallation](#uninstallation)

---

## Overview

PatientRecords is a containerized micro-frontend healthcare information system. This guide covers the complete installation and setup process for all environments (development, staging, production).

**Installation Time**: 15-30 minutes (depending on network speed and system performance)

**Key Components**:
- Angular 17 Micro-frontend shell with 5 clinical modules
- Node.js Express REST API
- MongoDB database
- Docker containerization
- All running via Docker Compose orchestration

---

## Quick Start (5 minutes)

### Windows (PowerShell)

```powershell
# 1. Clone the repository
git clone <repository-url>
cd PatientRecords

# 2. Run validation (recommended first-time)
.\setup-validate.ps1

# 3. Run installation
.\setup-install.ps1 -Environment development

# 4. Access the application
# Open browser: http://localhost:4200
```

### Linux/macOS (Bash)

```bash
# 1. Clone the repository
git clone <repository-url>
cd PatientRecords

# 2. Run validation (recommended first-time)
chmod +x setup-validate.sh
./setup-validate.sh

# 3. Run installation
chmod +x setup-install.sh
./setup-install.sh --environment development

# 4. Access the application
# Open browser: http://localhost:4200
```

---

## System Requirements

### Minimum Hardware (Development)

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| OS | Windows 10, macOS 10.14, Ubuntu 18.04 | Windows 11, macOS 12+, Ubuntu 20.04+ |
| CPU | 2 cores | 4 cores |
| RAM | 4 GB | 8 GB |
| Disk Space | 20 GB | 50 GB (with backups) |
| Network | 100 Mbps | 1 Gbps |

### Required Software

| Software | Minimum Version | Installation |
|----------|-----------------|--------------|
| Docker | 20.10.0 | [docker.com](https://www.docker.com/products/docker-desktop) |
| Docker Compose | 2.0.0 | Usually included with Docker Desktop |
| Git | 2.20.0 | [git-scm.com](https://git-scm.com) |
| Node.js | 18.0.0 | (Optional, for local development) [nodejs.org](https://nodejs.org) |

### Platform-Specific Notes

**Windows 10/11:**
- WSL 2 backend recommended for Docker
- PowerShell 5.1+ (built-in) or PowerShell Core 7.0+ (recommended)
- Administrator privileges may be required for Docker installation

**macOS:**
- Apple Silicon (M1/M2) supported via Docker Desktop
- Intel Macs also fully supported
- May need to grant Docker permissions via System Preferences

**Linux:**
- Docker daemon must be running
- User must be in `docker` group or have sudo access
- Most distributions supported (Ubuntu, CentOS, Debian, etc.)

---

## Installation Process

### Step 1: Prerequisites Validation

Before installing, validate your system has all required tools.

**Windows:**
```powershell
.\setup-validate.ps1
```

**Linux/macOS:**
```bash
./setup-validate.sh
```

**What it checks:**
- ✓ Operating system and version
- ✓ System resources (RAM, disk space)
- ✓ Docker and Docker Compose installation and versions
- ✓ Git installation
- ✓ Required ports availability
- ✓ Project structure

**If validation fails**, follow the error messages to install missing tools.

### Step 2: Environment Configuration

Copy the environment template and customize for your environment:

```bash
# Copy template
cp .env.default .env

# Edit for your environment (use your preferred editor)
# nano .env          # Linux/macOS
# notepad .env       # Windows
```

**Key Configuration Variables**:

```env
# Environment type
NODE_ENV=development

# MongoDB connection
MONGODB_URI=mongodb://admin:admin@patientrecord-mongodb:27017/patientrecords?authSource=admin
MONGO_INITDB_ROOT_USERNAME=admin
MONGO_INITDB_ROOT_PASSWORD=admin

# JWT Security (CRITICAL)
JWT_SECRET=your-very-secret-jwt-key-must-be-32-chars-minimum-change-this

# API URLs
VITE_API_URL=http://localhost:5001
```

**⚠️ SECURITY WARNING**: The default credentials are for development only. For any production use:
1. Change `JWT_SECRET` to a strong random value
2. Change `MONGO_INITDB_ROOT_PASSWORD` to a secure password
3. Never commit the `.env` file with real credentials

### Step 3: Run Installation Script

The installation script automates the complete setup:

**Windows (PowerShell):**
```powershell
.\setup-install.ps1 -Environment development
```

**Linux/macOS (Bash):**
```bash
./setup-install.sh --environment development
```

**Installation script performs:**
1. ✓ Validates prerequisites
2. ✓ Initializes environment configuration
3. ✓ Creates data directories
4. ✓ Builds Docker images
5. ✓ Deploys containers
6. ✓ Initializes database
7. ✓ Verifies all services

**Script Options:**

```powershell
# Windows - Development mode (default)
.\setup-install.ps1

# Windows - Production mode
.\setup-install.ps1 -Environment production

# Windows - Skip validation (already run)
.\setup-install.ps1 -NoValidation

# Windows - Skip docker build (using existing images)
.\setup-install.ps1 -NoBuild

# Linux/macOS - Similar options
./setup-install.sh --environment production
./setup-install.sh --no-validation
./setup-install.sh --no-build
```

### Step 4: Verify Installation

After the script completes, verify all services are running:

```bash
# Check all containers
docker-compose ps

# Expected output:
# NAME                       STATUS
# patientrecord-shell        Up X minutes
# patientrecord-demographics Up X minutes
# patientrecord-vitals       Up X minutes
# patientrecord-labs         Up X minutes
# patientrecord-medications  Up X minutes
# patientrecord-visits       Up X minutes
# patientrecord-backend      Up X minutes
# patientrecord-mongo        Up X minutes (healthy)
```

### Step 5: Access the Application

Open your browser and navigate to:

- **Shell App (Main UI)**: http://localhost:4200
- **Backend API**: http://localhost:5001
- **API Documentation**: http://localhost:5001/api-docs

---

## Configuration

### Environment Files

The system uses environment variables for configuration. Use `.env` file for local development and Docker Compose expansion.

**Template Location**: `.env.default` (documented example)
**Active Configuration**: `.env` (your customized copy)

### Key Configuration Sections

#### 1. Environment Selection

```env
# Options: development, staging, production
NODE_ENV=development
```

#### 2. Backend API

```env
PORT=5001
JWT_SECRET=your-secret-key-here
JWT_EXPIRATION=3600  # seconds (1 hour)
```

#### 3. MongoDB Configuration

```env
MONGODB_URI=mongodb://admin:admin@patientrecord-mongodb:27017/patientrecords?authSource=admin
MONGODB_DATABASE=patientrecords
```

#### 4. Frontend URLs

```env
VITE_API_URL=http://localhost:5001
REACT_APP_API_URL=http://localhost:5001
```

#### 5. Security Headers

```env
CORS_ALLOWED_ORIGINS=http://localhost:4200,http://localhost:4201,http://localhost:4202,http://localhost:4203,http://localhost:4204,http://localhost:4205
ENABLE_HTTPS=false  # Enable for production
```

#### 6. Feature Flags

```env
FEATURE_ALLERGIES=true
FEATURE_AUDIT_LOGGING=false
FEATURE_RBAC=false
```

### Environment-Specific Configurations

#### Development

```env
NODE_ENV=development
DEBUG_MODE=true
SEED_SAMPLE_DATA=true
LOG_LEVEL=debug
CORS_DEBUG=true
```

**Features:**
- Sample patients seeded automatically
- Debug logging enabled
- CORS relaxed for development
- Hot reload support

#### Staging

```env
NODE_ENV=staging
DEBUG_MODE=false
SEED_SAMPLE_DATA=false
LOG_LEVEL=info
```

**Features:**
- Production-like configuration
- No sample data seeding
- Standard logging level
- CORS restricted to staging domain

#### Production

```env
NODE_ENV=production
DEBUG_MODE=false
ENABLE_HTTPS=true
LOG_LEVEL=info
CORS_DEBUG=false
```

**Additional Production Configuration:**
- Implement secrets management (AWS Secrets Manager, HashiCorp Vault)
- Enable HTTPS with valid SSL certificate
- Configure database replication and backups
- Implement centralized logging
- Enable monitoring and alerting

### Custom Configuration

To add custom environment variables:

1. **Add to `.env.default`** (as documentation)
2. **Update application code** to read the variable:
   ```javascript
   const customVar = process.env.CUSTOM_VAR || 'default';
   ```
3. **Update `.env`** with your value
4. **Restart containers**:
   ```bash
   docker-compose restart
   ```

---

## Verification & Testing

### Automated Verification

The installation script performs automatic verification. To re-run:

```bash
# View service status
docker-compose ps

# Check individual service logs
docker logs patientrecord-backend
docker logs patientrecord-mongo

# Test API connectivity
curl http://localhost:5001/health

# Test DB connectivity
docker exec patientrecord-mongo mongosh -u admin -p admin --eval "db.adminCommand('ping')"
```

### Manual Verification

#### 1. Web Frontend

**Shell App** - http://localhost:4200
- Expected: Patient Records login page
- Actions: Should load without errors

**Modules** (accessible after login):
- Demographics: http://localhost:4201
- Vitals: http://localhost:4202
- Labs: http://localhost:4203
- Medications: http://localhost:4204
- Visits: http://localhost:4205

#### 2. Backend API

**Health Check:**
```bash
curl -i http://localhost:5001/health
# Expected: 200 OK response
```

**API Documentation:**
- Open browser to: http://localhost:5001/api-docs
- Swagger UI should display all available endpoints

**Sample API Call:**
```bash
# Get list of patients (requires authentication)
curl -X GET http://localhost:5001/api/patients \
  -H "Authorization: Bearer <token>"
```

#### 3. Database

**Connection Test:**
```bash
# Access MongoDB shell
docker exec -it patientrecord-mongo mongosh -u admin -p admin

# List databases
show dbs

# Connect to app database
use patientrecords

# Check collections
show collections

# Count patients
db.patients.countDocuments()

# View sample patient
db.patients.findOne()
```

### Health Monitoring

**Check all services:**
```bash
# View container status over time
docker-compose ps --all

# Watch logs in real-time
docker-compose logs -f

# Check resource usage
docker stats

# View network connections
docker network ls
docker network inspect patientrecords_app-net
```

---

## Common Issues & Troubleshooting

### Issue 1: Ports Already in Use

**Symptom**: `Error: Port X already in use`

**Solution:**

```bash
# Check which process is using the port (Linux/macOS)
lsof -i :4200

# Find process by port (Windows PowerShell)
netstat -ano | findstr :4200

# Kill the process (Linux/macOS)
kill -9 <PID>

# Stop Docker container using the port
docker stop <container-id>

# Restart services
docker-compose up -d
```

### Issue 2: Docker Daemon Not Running

**Symptom**: `Cannot connect to Docker daemon`

**Solution:**

- **Windows/macOS**: Open Docker Desktop and wait for startup
- **Linux**: Start Docker daemon:
  ```bash
  sudo systemctl start docker
  sudo systemctl enable docker  # Auto-start on reboot
  ```

### Issue 3: MongoDB Connection Timeout

**Symptom**: `Cannot connect to MongoDB` or backend fails to connect

**Solution:**

```bash
# Check MongoDB container status
docker-compose logs patientrecord-mongo

# Restart MongoDB
docker-compose restart patientrecord-mongo

# Wait for startup (30-60 seconds)
docker exec patientrecord-mongo mongosh -u admin -p admin --eval "db.adminCommand('ping')"

# If still failing, rebuild
docker-compose down
docker-compose up -d
```

### Issue 4: Frontend Not Loading Modules

**Symptom**: Modules show blank or 404 errors

**Solution:**

```bash
# Verify all frontend containers running
docker-compose ps | grep 420

# Check frontend module logs
docker logs patientrecord-demographics

# Verify module ports responding
curl http://localhost:4201
curl http://localhost:4202

# Rebuild frontend modules
docker-compose build --no-cache patientrecord-demographics patientrecord-vitals ...
docker-compose up -d
```

### Issue 5: Browser Cache Issues

**Symptom**: Changes not visible, old code still running

**Solution:**

```bash
# Clear browser cache
# Chrome: Ctrl+Shift+Delete (Windows) or Cmd+Shift+Delete (Mac)
# Firefox: Ctrl+Shift+Delete (Windows) or Cmd+Shift+Delete (Mac)

# Force rebuild without cache
docker-compose build --no-cache
docker-compose down
docker-compose up -d
```

### Issue 6: Permissions Errors (Docker)

**Symptom**: `Permission denied while trying to connect to Docker daemon`

**Solution (Linux):**

```bash
# Add current user to docker group
sudo usermod -aG docker $USER

# Apply new group membership without logout
newgrp docker

# Verify
docker ps
```

### Issue 7: Database Migration Errors

**Symptom**: `migrations fail` or `collections not found`

**Solution:**

```bash
# Manually run database initialization
docker exec patientrecord-backend node init-db.js

# If database corrupted, reset completely
docker-compose down -v  # Remove all volumes
docker-compose up -d    # Recreate with fresh data
```

### Debug Mode Activation

Enable detailed logging:

**Update `.env`:**
```env
NODE_ENV=development
DEBUG_MODE=true
LOG_LEVEL=debug
API_REQUEST_LOG=true
```

**Restart containers:**
```bash
docker-compose restart
```

**View detailed logs:**
```bash
docker-compose logs -f --tail 100
docker logs patientrecord-backend -f
```

---

## Post-Installation Setup

### 1. Database Backup

Set up backup procedures (especially for production):

```bash
# Manual backup
docker exec patientrecord-mongo mongodump --out=/data/backup --username admin --password admin --authenticationDatabase admin

# Copy to host
docker cp patientrecord-mongo:/data/backup ./backups
```

### 2. User Management

Create application users:

```bash
# Access MongoDB
docker exec -it patientrecord-mongo mongosh -u admin -p admin

# Create new user
db.users.insertOne({
  email: "doctor@example.com",
  password: "hashed_password",
  roles: ["doctor"],
  createdAt: new Date()
})
```

### 3. HTTPS/SSL Setup (Production)

**Prerequisites**: Valid SSL certificate

**Steps**:
1. Obtain SSL certificate (Let's Encrypt for free, or CA-signed)
2. Place certificate files in a secure location
3. Update `.env`:
   ```env
   ENABLE_HTTPS=true
   SSL_CERT_PATH=/path/to/cert.pem
   SSL_KEY_PATH=/path/to/key.pem
   ```
4. Configure reverse proxy (nginx recommended)
5. Restart containers

### 4. Monitoring Setup

**For Development**: Use Docker Dashboard
```bash
docker stats
```

**For Production**: Implement centralized monitoring:
- Prometheus for metrics
- Grafana for visualization
- ELK Stack for logging

### 5. Scheduled Backups

Create automated backup script:

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

docker exec patientrecord-mongo mongodump \
  --out="$BACKUP_DIR" \
  --username admin \
  --password "$MONGO_PASSWORD" \
  --authenticationDatabase admin

# Keep only last 30 days
find /backups -type d -mtime +30 -exec rm -rf {} \;
```

Schedule with cron (Linux) or Task Scheduler (Windows):

```bash
# Add to crontab
0 2 * * * /path/to/backup.sh  # Run daily at 2 AM
```

---

## Operations & Maintenance

### Daily Operations

**Start Services:**
```bash
docker-compose up -d
```

**Stop Services:**
```bash
docker-compose down
```

**View Logs:**
```bash
docker-compose logs -f
```

**Restart Services:**
```bash
docker-compose restart
```

### Health Checks

**Manual Health Check:**
```bash
# Create script: health-check.sh
#!/bin/bash

echo "Checking services..."
curl -f http://localhost:4200 || echo "Shell App down"
curl -f http://localhost:5001/health || echo "Backend down"
docker exec patientrecord-mongo mongosh -u admin -p admin --eval "db.adminCommand('ping')" || echo "MongoDB down"
```

### Updating Configuration

To update environment variables without downtime:

```bash
# 1. Edit .env
nano .env

# 2. Restart affected services
docker-compose restart patientrecord-backend

# 3. Verify changes
docker logs patientrecord-backend
```

### Updating Application

To deploy new version:

```bash
# 1. Pull latest code
git pull origin main

# 2. Rebuild images
docker-compose build --no-cache

# 3. Restart services
docker-compose up -d
```

### Database Maintenance

**Optimize MongoDB:**
```bash
docker exec patientrecord-mongo mongosh -u admin -p admin <<EOF
use patientrecords
db.patients.createIndex({mrn: 1})
db.patients.createIndex({email: 1})
db.compact()
EOF
```

**Check Database Size:**
```bash
docker exec patientrecord-mongo mongosh -u admin -p admin <<EOF
use patientrecords
db.stats()
EOF
```

---

## Uninstallation

### Preserve Data

If you want to keep the database:

```bash
# Stop containers but keep volumes
docker-compose down

# Backup database
docker run --rm -v patientrecords_mongo_data:/data -v $(pwd)/backups:/backup \
  mongo:7 mongodump --out=/backup
```

### Complete Cleanup

Remove everything including data:

```bash
# Stop all containers
docker-compose down

# Remove all images
docker rmi patientrecord-shell patientrecord-backend patientrecord-mongo \
    patientrecord-demographics patientrecord-vitals patientrecord-labs \
    patientrecord-medications patientrecord-visits

# Remove data volumes
docker volume rm patientrecords_mongo_data

# Remove configuration
rm .env
```

---

## Getting Help

### Documentation

- [Deployment Assessment](DEPLOYMENT_ASSESSMENT.md) - Comprehensive system evaluation
- [Architecture Overview](../README.md#system-architecture) - System design
- [API Documentation](http://localhost:5001/api-docs) - API reference

### Common Resources

- Docker Compose: https://docs.docker.com/compose/
- MongoDB: https://docs.mongodb.com/
- Angular: https://angular.io/docs

### Support

For issues or questions:
1. Check [Common Issues](#common-issues--troubleshooting) section
2. Review logs: `docker-compose logs`
3. Run validation: `./setup-validate.ps1` or `./setup-validate.sh`
4. Check GitHub issues
5. Contact development team

---

## Verification Checklist

Before declaring installation successful:

- [ ] All 8 containers running: `docker-compose ps`
- [ ] Shell App accessible: http://localhost:4200
- [ ] Backend API accessible: http://localhost:5001
- [ ] API docs available: http://localhost:5001/api-docs
- [ ] MongoDB connected and healthy
- [ ] Sample data loaded (development): 5 patients visible
- [ ] No errors in: `docker-compose logs`
- [ ] All modules load on dashboard
- [ ] Can navigate between modules
- [ ] Browser console has no critical errors

---

## Next Steps

After successful installation:

1. **Review Getting Started Guide** - Understand the system
2. **Explore the Dashboard** - Familiarize yourself with the UI
3. **Test Different Modules** - Clinical workflows
4. **Review Security Settings** - Update credentials, enable HTTPS
5. **Set Up Backups** - Implement disaster recovery
6. **Configure Monitoring** - Set up health checks and alerting

---

**Installation Guide Version**: 1.0  
**Last Updated**: 2026-02-05  
**Maintained By**: DevOps/Engineering Team  
