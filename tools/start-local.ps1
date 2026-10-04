param([int]$Port = 4173)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$url = "http://localhost:$Port"
try {
  $health = Invoke-RestMethod -Uri "$url/api/health" -TimeoutSec 2
  if ($health.version -eq '0.1.0' -and $health.ok) { Write-Output "Mind Mosaic is already running: $url"; exit 0 }
} catch { }
$logDirectory = Join-Path $projectRoot 'artifacts/local'
New-Item -ItemType Directory -Force -Path $logDirectory | Out-Null
$env:PORT = [string]$Port
$nodePath = (Get-Command node -ErrorAction Stop).Source
$serverPath = Join-Path $projectRoot 'dist/server.cjs'
$serverProcess = Start-Process -FilePath $nodePath -ArgumentList ('"' + $serverPath + '"') -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logDirectory 'server.log') -RedirectStandardError (Join-Path $logDirectory 'server-error.log') -PassThru
Set-Content -LiteralPath (Join-Path $logDirectory 'server.pid') -Value $serverProcess.Id
for ($attempt = 0; $attempt -lt 25; $attempt++) {
  Start-Sleep -Milliseconds 200
  if ($serverProcess.HasExited) { throw 'The game server stopped. Read artifacts/local/server-error.log.' }
  try {
    $health = Invoke-RestMethod -Uri "$url/api/health" -TimeoutSec 1
    if ($health.ok) { Write-Output "Mind Mosaic is ready: $url"; exit 0 }
  } catch { }
}
throw 'The game server did not become ready. Read artifacts/local/server-error.log.'
