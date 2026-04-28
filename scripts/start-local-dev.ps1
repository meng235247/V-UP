$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$runtimeDir = Join-Path $root ".codex-runtime"
New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null

$firebaseLog = Join-Path $runtimeDir "firebase.out.log"
$viteLog = Join-Path $runtimeDir "vite.out.log"
$uploadLog = Join-Path $runtimeDir "upload.out.log"
$pidFile = Join-Path $runtimeDir "local-dev.pids.json"

$javaCandidates = @(
  "C:\Program Files\Java\jdk-21.0.11\bin",
  "C:\Program Files\Eclipse Adoptium\jdk-21.0.10.7-hotspot\bin",
  "C:\Program Files\Eclipse Adoptium\jdk-17.0.18.8-hotspot\bin"
)
$javaBin = $javaCandidates | Where-Object { Test-Path (Join-Path $_ "java.exe") } | Select-Object -First 1
if (-not $javaBin) {
  throw "Java not found. Install Temurin JDK 17+ first."
}

function Start-DevProcess {
  param(
    [Parameter(Mandatory=$true)][string]$Command
  )
  return Start-Process -FilePath "cmd.exe" -ArgumentList "/c", $Command -WorkingDirectory $root -PassThru
}

function Test-TcpPort {
  param(
    [Parameter(Mandatory=$true)][string]$TargetHost,
    [Parameter(Mandatory=$true)][int]$Port,
    [int]$TimeoutMs = 800
  )
  $client = New-Object System.Net.Sockets.TcpClient
  try {
    $async = $client.BeginConnect($TargetHost, $Port, $null, $null)
    if (-not $async.AsyncWaitHandle.WaitOne($TimeoutMs, $false)) {
      return $false
    }
    $client.EndConnect($async) | Out-Null
    return $true
  } catch {
    return $false
  } finally {
    try { $client.Close() } catch {}
    try { $client.Dispose() } catch {}
  }
}

function Wait-TcpPort {
  param(
    [Parameter(Mandatory=$true)][string]$TargetHost,
    [Parameter(Mandatory=$true)][int]$Port,
    [int]$TimeoutSec = 30
  )
  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  while ((Get-Date) -lt $deadline) {
    if (Test-TcpPort -TargetHost $TargetHost -Port $Port) {
      return $true
    }
    Start-Sleep -Milliseconds 500
  }
  return $false
}

$firebaseCmd = @(
  "set `"XDG_CONFIG_HOME=$runtimeDir\config`"",
  "set `"FIREBASE_EMULATORS_PATH=$runtimeDir\emulators`"",
  "set `"Path=$javaBin;%Path%`"",
  "npx.cmd firebase emulators:start --only auth,firestore,ui --project v-up-1eeb3 > `"$firebaseLog`" 2>&1"
) -join " && "

$viteCmd = "set CI=1 && npm.cmd run dev -- --host 127.0.0.1 --port 5173 > `"$viteLog`" 2>&1"
$uploadCmd = "node scripts\local-upload-server.js > `"$uploadLog`" 2>&1"

$firebase = Start-DevProcess -Command $firebaseCmd
$vite = Start-DevProcess -Command $viteCmd
$upload = Start-DevProcess -Command $uploadCmd

$pids = @{
  firebase = $firebase.Id
  vite = $vite.Id
  upload = $upload.Id
}
$pids | ConvertTo-Json | Set-Content -Path $pidFile -Encoding UTF8

$requiredPorts = @(
  @{ name = "web"; host = "127.0.0.1"; port = 5173; timeout = 30 },
  @{ name = "upload"; host = "127.0.0.1"; port = 5176; timeout = 30 },
  @{ name = "firestore"; host = "127.0.0.1"; port = 8081; timeout = 45 },
  @{ name = "auth"; host = "127.0.0.1"; port = 9099; timeout = 45 }
)

$failed = @()
foreach ($p in $requiredPorts) {
  if (-not (Wait-TcpPort -TargetHost $p.host -Port $p.port -TimeoutSec $p.timeout)) {
    $failed += "$($p.name)@$($p.host):$($p.port)"
  }
}

if ($failed.Count -gt 0) {
  Write-Host "Failed to start required services: $($failed -join ', ')"
  if (Test-Path $firebaseLog) {
    Write-Host "`n--- firebase.out.log (tail) ---"
    Get-Content $firebaseLog -Tail 80
  }
  if (Test-Path $viteLog) {
    Write-Host "`n--- vite.out.log (tail) ---"
    Get-Content $viteLog -Tail 80
  }
  if (Test-Path $uploadLog) {
    Write-Host "`n--- upload.out.log (tail) ---"
    Get-Content $uploadLog -Tail 80
  }
  throw "Local dev startup failed."
}

Write-Host "Local dev services started."
Write-Host "Web:      http://127.0.0.1:5173/index.html"
Write-Host "Auth:     http://127.0.0.1:9099"
Write-Host "Firestore:http://127.0.0.1:8081"
Write-Host "UI:       http://127.0.0.1:4000"
Write-Host ""
Write-Host "To stop all services:"
Write-Host "powershell -ExecutionPolicy Bypass -File scripts\stop-local-dev.ps1"
