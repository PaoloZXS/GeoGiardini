$versionFile = "version.txt"
if (-not (Test-Path $versionFile)) {
  Write-Error "File version.txt non trovato."
  exit 1
}

$versionText = Get-Content $versionFile -Raw
if ($versionText -match '^\s*v(\d+)\s*$') {
  $currentNumber = [int]$matches[1]
  $nextNumber = $currentNumber + 1
  $nextVersion = "v{0:000}" -f $nextNumber
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($versionFile, $nextVersion, $utf8NoBom)
  Write-Host "Versione aggiornata da $versionText a $nextVersion"
} else {
  Write-Error "Formato versione non valido in version.txt: '$versionText'"
  exit 1
}
