# PatientRecords - Quick Deployment Guide

**For**: Customers deploying PatientRecords on their own servers  
**What you have**: Pre-built Docker images, ready to run

---

## What's in This Package

This folder contains everything you need to run PatientRecords:

- `docker-compose.yml` - Configuration to run all 8 services
- `.env.default` - Settings template (you'll customize this)
- `seed.ps1` or `seed.sh` - Script to load sample patient data
- `patients-seed.json` - Sample patient data file

**That's it.** You don't need source code or any build tools.

---

## Before You Start - Checklist

- [ ] Docker installed on your server (https://docs.docker.com/get-docker/)
- [ ] Running as Administrator (Windows) or with sudo (Linux)
- [ ] About 20 GB free disk space
- [ ] You're comfortable with command line/terminal

---

## Quick Setup (5 minutes)

### Step 1: Customize Configuration
```powershell
# Windows: Right-click here and select "Open with Notepad"
notepad .env.default

# Change these three values:
JWT_SECRET=my-secure-random-password
MONGO_INITDB_ROOT_PASSWORD=another-secure-password
VITE_API_URL=http://your-server-ip:5001

# Save as: .env (remove the ".default" part)
```

**Linux/Mac:**
```bash
cp .env.default .env
nano .env
# Change the same 3 values above
# Save with Ctrl+O, Enter, Ctrl+X
```

### Step 2: Start Services
```powershell
# Windows (PowerShell as Administrator):
docker-compose up -d

# Linux/Mac:
sudo docker-compose up -d
```

Wait 30 seconds for everything to start.

### Step 3: Load Sample Data
```powershell
# Windows:
.\seed.ps1

# Linux/Mac:
./seed.sh
```

### Step 4: Open PatientRecords
Open your browser and go to:
```
http://localhost:4200
```

Login with username: `admin` (password can be blank)

**Done!** You now have PatientRecords running with 3 sample patients.

---

## Common Issues & Solutions

### "Script cannot be run" (Windows)
**Problem**: Using Command Prompt instead of PowerShell.

**Fix**: 
1. Close Command Prompt
2. Right-click PowerShell icon → "Run as Administrator"
3. Run `.\seed.ps1` again

### "Permission denied" (any system)
**Problem**: Not running as Administrator/sudo.

**Fix**:
- **Windows**: Right-click PowerShell → "Run as Administrator"
- **Linux/Mac**: Add `sudo` before commands: `sudo docker-compose up -d`

### Nothing appears at http://localhost:4200
**Problem**: Services still starting (takes 30-60 seconds).

**Fix**: 
1. Wait 60 seconds
2. Check status: `docker-compose ps`
3. All 8 containers should say "Up"

### "Port already in use"
**Problem**: Something else is using ports 4200, 5001, or 27017.

**Fix**: Edit `.env` and change ports, or close the other application.

---

## Day-to-Day Commands

```powershell
# Check if services are running
docker-compose ps

# View what's happening
docker-compose logs

# Stop everything (keeps your data)
docker-compose down

# Start again
docker-compose up -d

# Restart everything
docker-compose restart

# Remove everything AND delete data (careful!)
docker-compose down -v
```

---

## Support

**If something doesn't work:**

1. Check the "Common Issues" section above
2. Run: `docker-compose logs`
3. Contact support with the error message

---

## What's Next?

Once you're comfortable with this test environment, contact us for:
- Production configuration help
- Data migration from your existing system
- User account setup
- Custom configuration
