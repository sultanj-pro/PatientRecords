# PatientRecords Database Cleanup Script
# Removes all patient data from MongoDB
# Usage: .\cleanup.ps1

Write-Host ""
Write-Host "PatientRecords Database Cleanup"
Write-Host ""

# Check MongoDB container
$mongoContainer = docker ps --filter "name=patientrecord-mongo" --format "{{.ID}}"
if ([string]::IsNullOrEmpty($mongoContainer)) {
    Write-Host "ERROR: MongoDB container not running" -ForegroundColor Red
    exit 1
}

# Get current patient count
$beforeCount = docker exec patientrecord-mongo mongosh -u admin -p admin --authenticationDatabase admin patientrecords --eval "db.patients.countDocuments()" --quiet
Write-Host "Current patient records: $beforeCount"
Write-Host ""

# Confirm deletion
Write-Host "This will DELETE all patient records from the database." -ForegroundColor Yellow
$confirm = Read-Host "Continue? (type 'yes' to confirm)"

if ($confirm -ne "yes") {
    Write-Host "Cancelled" -ForegroundColor Cyan
    exit 0
}

Write-Host ""
Write-Host "Removing patient data..."

# Create temp JS file to delete all patients
$tempFile = [System.IO.Path]::GetTempFileName() -replace '\.tmp$', '.js'
"db.patients.deleteMany({});`nprint('All patient records deleted');" | Out-File $tempFile -Encoding UTF8

# Execute deletion
Get-Content $tempFile | docker exec -i patientrecord-mongo mongosh -u admin -p admin --authenticationDatabase admin patientrecords 2>&1 | Out-Null

# Verify deletion
$afterCount = docker exec patientrecord-mongo mongosh -u admin -p admin --authenticationDatabase admin patientrecords --eval "db.patients.countDocuments()" --quiet

if ($afterCount -eq 0) {
    Write-Host ""
    Write-Host "✓ Cleanup complete!" -ForegroundColor Green
    Write-Host "  Before: $beforeCount patient records"
    Write-Host "  After:  $afterCount patient records"
    Write-Host ""
} else {
    Write-Host "ERROR: Cleanup failed - records remain" -ForegroundColor Red
    Remove-Item $tempFile -Force -ErrorAction SilentlyContinue
    exit 1
}

# Cleanup
Remove-Item $tempFile -Force
