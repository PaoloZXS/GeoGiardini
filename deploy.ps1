.
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location $scriptDir

.
$incrementScript = Join-Path $scriptDir 'increment_version.ps1'
if (-Not (Test-Path $incrementScript)) {
  Write-Error "Script di incremento versione non trovato: $incrementScript"
  Pop-Location
  exit 1
}

Write-Host "Incremento automaticamente la versione in version.txt prima del deploy..."
& $incrementScript

Write-Host "Eseguo il deploy su Vercel..."
vercel --prod --yes

Pop-Location
