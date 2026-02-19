# Container Fix Script
Write-Host "=== Current Container Status ===" -ForegroundColor Cyan
docker ps -a --filter "name=patientrecord" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

Write-Host "`n=== Available Images ===" -ForegroundColor Cyan
docker images --filter "reference=patientrecord-*" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"

Write-Host "`n=== Removing stopped shell and medications containers (if any) ===" -ForegroundColor Yellow
docker rm -f patientrecord-shell patientrecord-medications 2>&1 | Out-Null

Write-Host "`n=== Starting shell and medications containers ===" -ForegroundColor Green
docker compose up -d patientrecord-shell patientrecord-medications

Write-Host "`n=== Waiting 10 seconds for startup ===" -ForegroundColor Cyan
Start-Sleep -Seconds 10

Write-Host "`n=== Final Container Status ===" -ForegroundColor Green
docker ps --filter "name=patientrecord" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

Write-Host "`n=== Container Logs (last 5 lines each) ===" -ForegroundColor Cyan
Write-Host "`nShell logs:" -ForegroundColor Yellow
docker logs patientrecord-shell 2>&1 | Select-Object -Last 5
Write-Host "`nMedications logs:" -ForegroundColor Yellow
docker logs patientrecord-medications 2>&1 | Select-Object -Last 5
