$ErrorActionPreference = "Continue"

$root = Split-Path -Parent $PSScriptRoot
$runtimeDir = Join-Path $root ".codex-runtime"

Write-Host "=== Local Doctor ==="
Write-Host "Workspace: $root"
Write-Host ""

Write-Host "Ports (5173, 5176, 8081, 9099, 4000):"
cmd /c "netstat -ano -p tcp | findstr :5173"
cmd /c "netstat -ano -p tcp | findstr :5176"
cmd /c "netstat -ano -p tcp | findstr :8081"
cmd /c "netstat -ano -p tcp | findstr :9099"
cmd /c "netstat -ano -p tcp | findstr :4000"
Write-Host ""

function Try-Status {
  param([string]$Url)
  try {
    $status = (Invoke-WebRequest -UseBasicParsing $Url -TimeoutSec 5).StatusCode
    Write-Host "$Url -> $status"
  } catch {
    Write-Host "$Url -> FAILED ($($_.Exception.Message))"
  }
}

Write-Host "HTTP quick checks:"
Try-Status "http://127.0.0.1:5173/index.html"
Try-Status "http://127.0.0.1:5173/auth.html"
Try-Status "http://127.0.0.1:5173/dashboard.html"
Try-Status "http://127.0.0.1:5173/vtuber_profile.html?id=auroramizu"
Write-Host ""

if (Test-Path (Join-Path $runtimeDir "firebase.out.log")) {
  Write-Host "--- firebase.out.log (tail) ---"
  Get-Content (Join-Path $runtimeDir "firebase.out.log") -Tail 60
}
if (Test-Path (Join-Path $runtimeDir "vite.out.log")) {
  Write-Host "--- vite.out.log (tail) ---"
  Get-Content (Join-Path $runtimeDir "vite.out.log") -Tail 60
}
if (Test-Path (Join-Path $runtimeDir "upload.out.log")) {
  Write-Host "--- upload.out.log (tail) ---"
  Get-Content (Join-Path $runtimeDir "upload.out.log") -Tail 60
}
