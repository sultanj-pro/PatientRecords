# PatientRecords - Customer Deployment Guide

**Version**: 1.0  
**Date**: February 26, 2026  
**For**: Healthcare Organizations deploying PatientRecords

---

## Table of Contents

1. [Overview](#overview)
2. [System Requirements](#system-requirements)
3. [Quick Start (15 minutes)](#quick-start-15-minutes)
4. [Detailed Installation](#detailed-installation)
5. [Configuration](#configuration)
6. [Verification](#verification)
7. [Troubleshooting](#troubleshooting)
8. [Support](#support)

---

## Overview

PatientRecords is a containerized healthcare information system delivered as pre-built Docker images. This guide explains how to deploy it in your environment.

### What You Receive

- **8 Pre-built Docker images** with PatientRecords application code
- **docker-compose.prod.yml** - Configuration for running all services
- **.env.default** - Environment configuration template
- **This deployment guide** - Step-by-step instructions
- **Support contact information** - For technical assistance

### System Architecture

```
┌─────────────────────────────────────────────────┐
│     Shell App (Port 4200)                       │
│  ├─ Demographics Module (Port 4201)             │
│  ├─ Vitals Module (Port 4202)                   │
│  ├─ Labs Module (Port 4203)                     │
│  ├─ Medications Module (Port 4204)              │
│  └─ Visits Module (Port 4205)                   │
├─────────────────────────────────────────────────┤
│     Backend API (Port 5001)                     │
├─────────────────────────────────────────────────┤
│     MongoDB Database (Port 27017)               │
└─────────────────────────────────────────────────┘
```

---

## System Requirements

### Infrastructure

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| OS | Linux, macOS, Windows 10+ | Linux (Ubuntu 20.04+) |
| CPU | 2 cores | 4+ cores |
| RAM | 4 GB | 8+ GB |
| Disk Space | 20 GB | 50 GB |
| Network | 100 Mbps | 1 Gbps |

### Required Software

| Software | Version | How to Install |
|----------|---------|----------------|
| Docker | 20.10+ | https://docs.docker.com/get-docker/ |
| Docker Compose | 2.0+ | Included with Docker Desktop |
| git | 2.20+ | https://git-scm.com/downloads |

### Administrator Privileges Required

**⚠️ IMPORTANT**: All Docker operations require administrator or elevated privileges:

- **Windows**: Run PowerShell as Administrator (right-click PowerShell → Run as Administrator)
- **Linux**: Use `sudo` before docker commands, OR add your user to the docker group:
  ```bash
  sudo usermod -aG docker $USER
  # Log out and back in for group changes to take effect
  ```
- **macOS**: Docker Desktop will prompt for your password. Ensure your user has sudo privileges.

Without proper privileges, Docker commands will fail with "permission denied" errors. Contact your system administrator if you lack the required access.

### Registry Access

You need access to pull images from our image registry:

```
Registry: registry.patientrecords.local
```

**Registry credentials**: Your system administrator should have provided these.

---

## Quick Start (15 minutes)

> **⚠️ Before you start**: Ensure you have administrator/elevated privileges on your system. See [Administrator Privileges Required](#administrator-privileges-required) above.

### For Linux/macOS

```bash
# 1. Clone or extract package
git clone <your-repo> PatientRecords
cd PatientRecords

# 2. Configure environment
cp .env.default .env
nano .env  # Edit: Change passwords, configure your domain

# 3. Deploy
docker-compose -f docker-compose.prod.yml up -d

# 4. Verify
docker-compose -f docker-compose.prod.yml ps
# All 8 containers should show "Up"

# 5. Access
# Open browser: http://localhost:4200
```

### For Windows (PowerShell)

**Important**: Right-click PowerShell and select "Run as Administrator" before proceeding.

```powershell
# 1. Clone or extract package
git clone <your-repo> PatientRecords
cd PatientRecords

# 2. Configure environment
Copy-Item .env.default .env
notepad .env  # Edit: Change passwords, configure your domain

# 3. Deploy
docker-compose -f docker-compose.prod.yml up -d

# 4. Verify
docker-compose -f docker-compose.prod.yml ps
# All 8 containers should show "Up"

# 5. Access
# Open browser: http://localhost:4200
```

---

## Detailed Installation

### Step 1: Get the Package

#### Option A: From Git Repository
```bash
git clone https://github.com/your-org/PatientRecords.git
cd PatientRecords
```

#### Option B: From Archive
```bash
unzip PatientRecords.zip
cd PatientRecords
```

### Step 2: Set Up Environment Configuration

```bash
# Copy the template
cp .env.default .env

# Edit with your configuration
nano .env  # Linux/macOS
# OR
notepad .env  # Windows
```

**Critical values to change** (see Configuration section below):
- `JWT_SECRET` - Change to a strong random value
- `MONGO_INITDB_ROOT_PASSWORD` - Change to a secure password
- `MONGODB_URI` - Update if using external MongoDB
- `VITE_API_URL` / `REACT_APP_API_URL` - Set to your domain

### Step 3: Configure Registry Access (if required)

If the registry requires authentication:

```bash
# Log in to registry
docker login registry.patientrecords.local

# When prompted, enter your registry credentials
```

### Step 4: Pull and Start Containers

```bash
# Pull the latest images
docker-compose -f docker-compose.prod.yml pull

# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Wait 30 seconds for services to stabilize
sleep 30
```

### Step 5: Verify Deployment

```bash
# Check all containers are running
docker-compose -f docker-compose.prod.yml ps

# Expected output (8 containers):
# NAME                    STATUS
# patientrecord-shell     Up 2 minutes
# patientrecord-demographics  Up 2 minutes
# patientrecord-vitals    Up 2 minutes
# patientrecord-labs      Up 2 minutes
# patientrecord-medications   Up 2 minutes
# patientrecord-visits    Up 2 minutes
# patientrecord-backend   Up 2 minutes
# patientrecord-mongo     Up 2 minutes (healthy)

# Check logs for errors
docker-compose -f docker-compose.prod.yml logs

# If any container failed, see troubleshooting below
```

### Step 6: Access the Application

Open your web browser and navigate to:

```
http://localhost:4200
```

You should see the PatientRecords login screen.

---

## Configuration

### Environment Variables (.env)

The `.env.default` file has sensible defaults. You only need to change the **highlighted items** for your environment.

#### Security Configuration

```env
# MUST CHANGE: JWT Secret (minimum 32 characters, random)
# Generate with: openssl rand -base64 32
JWT_SECRET=CHANGE_THIS_TO_A_STRONG_RANDOM_VALUE

# MUST CHANGE: MongoDB Root Password (minimum 8 characters, complex)
MONGO_INITDB_ROOT_PASSWORD=CHANGE_THIS_SECURE_PASSWORD

# MUST CHANGE: MongoDB Connection URI
# Local example: mongodb://admin:PASSWORD@patientrecord-mongo:27017/patientrecords?authSource=admin
# External MongoDB: mongodb://admin:PASSWORD@your-mongodb-host:27017/patientrecords?authSource=admin
MONGODB_URI=mongodb://admin:CHANGE_THIS@patientrecord-mongo:27017/patientrecords?authSource=admin
```

#### Network Configuration

```env
# CHANGE: Your application domain
VITE_API_URL=https://your-domain.com/api
REACT_APP_API_URL=https://your-domain.com/api

# CHANGE: CORS allowed origins (where requests come from)
CORS_ALLOWED_ORIGINS=https://your-domain.com,https://api.your-domain.com

# Production: Enable HTTPS
ENABLE_HTTPS=true
```

#### Optional Configuration

```env
# Environment: production (already set)
NODE_ENV=production

# Debug: Keep false in production
DEBUG_MODE=false

# Logging: info for production
LOG_LEVEL=info

# Session timeout (in milliseconds): 30 minutes default
SESSION_TIMEOUT=1800000
```

### Using External MongoDB

If you have an existing MongoDB database:

```env
# Don't use Docker MongoDB container
# Instead, set MONGODB_URI to your database

MONGODB_URI=mongodb://username:password@your-mongo-host:27017/patientrecords?authSource=admin

# You can remove MongoDB service from docker-compose if not needed
# Or keep it running in case you need local database later
```

---

## Verification

### Service Status

```bash
# Check all containers running
docker-compose -f docker-compose.prod.yml ps

# Check specific service
docker-compose -f docker-compose.prod.yml ps patientrecord-backend

# View service logs
docker-compose -f docker-compose.prod.yml logs patientrecord-backend
```

### Application Access

**Frontend Application**: http://localhost:4200
- Should load login page
- No JavaScript errors in browser console

**Backend API**: http://localhost:5001
- Health endpoint: http://localhost:5001/health
- API docs: http://localhost:5001/api-docs

**Database**: 
```bash
# Connect to MongoDB
docker-compose -f docker-compose.prod.yml exec patientrecord-mongo mongosh -u admin -p <password>

# In mongo shell:
use patientrecords
show collections
db.patients.countDocuments()  # Should show 5+ test patients
```

---

## Troubleshooting

### Issue 1: Services Won't Start

**Error**: `ERROR: for patientrecord-mongo Cannot start service`

**Solution**:
```bash
# Check Docker daemon is running
docker ps

# Check logs
docker-compose -f docker-compose.prod.yml logs

# Restart services
docker-compose -f docker-compose.prod.yml restart

# Check if ports are in use
netstat -an | grep 4200
```

---

### Issue 2: Cannot Access http://localhost:4200

**Symptom**: Browser shows "Connection refused"

**Solution**:
```bash
# Verify container is running
docker-compose -f docker-compose.prod.yml ps patientrecord-shell

# Check container logs
docker-compose -f docker-compose.prod.yml logs patientrecord-shell

# Try accessing API instead (different port)
curl http://localhost:5001/health

# If API works but port 4200 doesn't, shell app container may be stuck
docker-compose -f docker-compose.prod.yml restart patientrecord-shell
```

---

### Issue 3: Database Connection Error

**Error**: `MongoNetworkError: connect ECONNREFUSED 127.0.0.1:27017`

**Solution**:
```bash
# Check MongoDB is running
docker-compose -f docker-compose.prod.yml ps patientrecord-mongo

# Check MongoDB logs
docker-compose -f docker-compose.prod.yml logs patientrecord-mongo

# Verify MONGODB_URI is correct in .env
grep MONGODB_URI .env

# If using external MongoDB, verify network connectivity
ping your-mongodb-host

# Restart MongoDB
docker-compose -f docker-compose.prod.yml restart patientrecord-mongo
```

---

### Issue 4: Ports Already in Use

**Error**: `Error: Port 4200 already in use`

**Solution**:
```bash
# Find what's using the port
lsof -i :4200  # macOS/Linux
netstat -ano | findstr :4200  # Windows

# Stop the process using the port, OR change docker-compose ports:
# Edit docker-compose.prod.yml:
#   ports:
#     - "8200:4200"  # Use 8200 instead of 4200
```

---

### Issue 5: Authentication Fails

**Symptom**: Login page shows but login fails

**Solution**:
```bash
# Check backend API
curl http://localhost:5001/health

# Check backend logs
docker-compose -f docker-compose.prod.yml logs patientrecord-backend

# Verify JWT_SECRET is set
grep JWT_SECRET .env

# If error is about MongoDB, see Issue 3 above
```

---

### Getting More Help

1. **Check logs**: `docker-compose -f docker-compose.prod.yml logs`
2. **Check specific service**: `docker-compose -f docker-compose.prod.yml logs <service-name>`
3. **Tail logs in real-time**: `docker-compose -f docker-compose.prod.yml logs -f`
4. **Contact support**: [Support information below]

---

## Operations

### Starting/Stopping Services

```bash
# Start services
docker-compose -f docker-compose.prod.yml up -d

# Stop services (preserves data)
docker-compose -f docker-compose.prod.yml down

# Stop and remove all data (careful!)
docker-compose -f docker-compose.prod.yml down -v

# Restart services
docker-compose -f docker-compose.prod.yml restart
```

### Viewing Logs

```bash
# View all logs
docker-compose -f docker-compose.prod.yml logs

# Follow logs in real-time
docker-compose -f docker-compose.prod.yml logs -f

# View specific service
docker-compose -f docker-compose.prod.yml logs patientrecord-backend

# Last 50 lines of specific service
docker-compose -f docker-compose.prod.yml logs patientrecord-backend --tail 50
```

### Database Backup

```bash
# Backup MongoDB
docker-compose -f docker-compose.prod.yml exec patientrecord-mongo mongodump \
  -u admin -p <password> \
  --out=/data/backup

# Copy backup to host
docker cp patientrecord-mongo:/data/backup ./mongodb-backup

# List backups
ls -la ./mongodb-backup
```

### Updating to New Version

```bash
# Pull new images
docker-compose -f docker-compose.prod.yml pull

# Stop current version
docker-compose -f docker-compose.prod.yml down

# Start new version
docker-compose -f docker-compose.prod.yml up -d

# Verify
docker-compose -f docker-compose.prod.yml ps
```

---

## Support

### Need Help?

1. **Check troubleshooting section above** - Most common issues covered
2. **Review Docker logs**: `docker-compose -f docker-compose.prod.yml logs`
3. **Contact support**:
   - Email: support@patientrecords.io
   - Phone: [support number]
   - Hours: 8am-6pm [timezone]

### Provide When Reporting Issues

- Full error message (from logs)
- Which container is having issues
- When the problem started
- What you were doing when it happened
- Your environment (OS, Docker version, etc.)

---

## Security Notes

- ⚠️ **Never commit .env with real credentials to git**
- ⚠️ **Rotate secrets regularly** (at least quarterly)
- ✅ **Keep Docker images updated** - Pull new versions regularly
- ✅ **Monitor logs** for errors and security events
- ✅ **Back up database regularly** (daily minimum)
- ✅ **Use HTTPS in production** (configure reverse proxy with SSL certificate)

---

## Next Steps

1. **Read**: This entire guide (15 minutes)
2. **Prepare**: Ensure Docker, Docker Compose, git are installed
3. **Configure**: Copy .env.default → .env, edit values
4. **Deploy**: Run docker-compose up -d
5. **Verify**: Check all containers running
6. **Access**: Open http://localhost:4200

---

**Document Version**: 1.0  
**Last Updated**: February 26, 2026  
**For Support**: Contact your system administrator or support team
