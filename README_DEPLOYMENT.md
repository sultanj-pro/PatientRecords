# PatientRecords - Deployment Package

## Quick Start (5 minutes)

1. **Edit settings**
   - Open `.env.default` in a text editor
   - Change `JWT_SECRET`, `MONGO_INITDB_ROOT_PASSWORD`, and `VITE_API_URL`
   - Save as `.env` (remove the ".default")

2. **Start services**
   ```
   docker-compose up -d
   ```
   Wait 30 seconds.

3. **Load sample data**
   ```
   .\seed.ps1        (Windows)
   ./seed.sh         (Linux/Mac)
   ```

4. **Open browser**
   ```
   http://localhost:4200
   ```
   Login: `admin`

---

## Need More Help?

See `CUSTOMER_DEPLOYMENT_GUIDE.md` for detailed instructions and troubleshooting.

---

## Requirements

- Docker installed
- Running as Administrator (Windows) or with sudo (Linux)
- 20 GB disk space
- Access to your terminal
