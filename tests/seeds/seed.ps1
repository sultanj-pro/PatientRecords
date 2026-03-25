# PatientRecords Database Seeding Script
# Runs all seed scripts in the correct order:
#   1. seed-clear.js            — clears all data
#   2. seed-patients.js         — 10 patients (IDs 20001-20010) with demographics + allergies
#   3. seed-vitals.js           — vitals per patient
#   4. seed-labs.js             — lab results per patient
#   5. seed-medications.js      — medications per patient
#   6. seed-visits.js           — visit history per patient
#   7. seed-care-team.js        — care team members per patient
#   8. seed-clinical-notes.js   — clinical notes via API (requires running stack)
# Usage: .\seed.ps1

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

function Run-Step {
    param([string]$Label, [string]$Script)
    Write-Host ""
    Write-Host "[$Label]" -ForegroundColor Cyan
    node "$ScriptDir\$Script"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: $Label failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "  Done." -ForegroundColor Green
}

Write-Host "Seeding PatientRecords database..." -ForegroundColor Cyan

Run-Step "1/8 Clear all data"                          "seed-clear.js"
Run-Step "2/8 Patients (10 records, IDs 20001-20010)"  "seed-patients.js"
Run-Step "3/8 Vitals"                                  "seed-vitals.js"
Run-Step "4/8 Labs"                                    "seed-labs.js"
Run-Step "5/8 Medications"                             "seed-medications.js"
Run-Step "6/8 Visits"                                  "seed-visits.js"
Run-Step "7/8 Care Team"                               "seed-care-team.js"
Run-Step "8/8 Clinical Notes (requires running stack)" "seed-clinical-notes.js"

Write-Host ""
Write-Host "All seed steps completed successfully." -ForegroundColor Green
Write-Host ""
Write-Host "Access the application:"
Write-Host "  UI:  http://localhost:4200"
Write-Host "  API: http://localhost:5000/api-docs"
Write-Host ""
