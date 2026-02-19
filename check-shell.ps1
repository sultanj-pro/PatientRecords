# Check Shell Container Status
$output = @()

$output += "=== Shell Image Check ==="
$output += docker images patientrecord-shell --format "{{.Repository}}:{{.Tag}} - Size: {{.Size}}"

$output += "`n=== Starting Shell Container ==="
docker compose up -d patientrecord-shell 2>&1 | Out-Null

Start-Sleep -Seconds 5

$output += "`n=== Container Status ==="
$output += docker ps -a --filter "name=shell" --format "{{.Names}} - {{.Status}}"

$output += "`n=== Shell Logs (Last 30 lines) ==="
$output += docker logs patientrecord-shell --tail 30 2>&1

$output += "`n=== Port Check (4200) ==="
$output += netstat -ano | Select-String ":4200"

# Write to file
$output | Out-File -FilePath "shell-status.txt" -Encoding UTF8
Write-Host "Output written to shell-status.txt"
