# PatientRecords Database Seeding Script
# Loads sample patient data from patients-seed.json into MongoDB
# Usage: .\seed.ps1

Write-Host "Seeding database..." -ForegroundColor Cyan
$seedFile = "patients-seed.json"
if (-not (Test-Path $seedFile)) {
    Write-Host "ERROR: patients-seed.json not found" -ForegroundColor Red
    exit 1
}

# Create temp JS file
$tempFile = [System.IO.Path]::GetTempFileName() -replace '\.tmp$', '.js'
"db.patients.deleteMany({});" | Out-File $tempFile -Encoding UTF8 -NoNewline
"db.patients.insertMany($(Get-Content $seedFile -Raw));" | Add-Content $tempFile

# Execute via mongosh
Get-Content $tempFile | docker exec -i patientrecord-mongo mongosh -u admin -p admin --authenticationDatabase admin patientrecords 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "Success! Database seeded with patient data." -ForegroundColor Green
    Write-Host ""
    Write-Host "Access the application:"
    Write-Host "  UI:  http://localhost:4200"
    Write-Host "  API: http://localhost:5001/api-docs"
    Write-Host ""
} else {
    Write-Host "Seeding failed" -ForegroundColor Red
    exit 1
}

# Cleanup
Remove-Item $tempFile -Force -ErrorAction SilentlyContinue
