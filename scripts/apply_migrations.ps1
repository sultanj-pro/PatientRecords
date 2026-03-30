param(
  [string]$Container = 'patientrecord-postgres',
  [string]$Db = 'patientrecords',
  [string]$User = 'admin'
)

Write-Host "Applying migrations to container=$Container db=$Db user=$User"

$migrationsPath = Join-Path -Path $PSScriptRoot -ChildPath '..\backend\shared\db\migrations' | Resolve-Path
$files = Get-ChildItem -Path $migrationsPath -Filter '*.sql' | Sort-Object Name
if ($files.Count -eq 0) {
  Write-Error "No migration files found in $migrationsPath"
  exit 1
}

foreach ($f in $files) {
  $local = $f.FullName
  $dest = "/tmp/$(Split-Path $f.Name -Leaf)"
  Write-Host "Copying $local -> $Container:$dest"
  docker cp "$local" "$Container:$dest"
  if ($LASTEXITCODE -ne 0) { Write-Error "docker cp failed"; exit 2 }

  Write-Host "Applying $dest"
  docker exec -i $Container psql -U $User -d $Db -f $dest
  if ($LASTEXITCODE -ne 0) { Write-Error "psql failed on $f.Name"; exit 3 }
}

Write-Host "Migrations applied successfully."
