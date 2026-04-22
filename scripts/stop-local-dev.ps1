$ErrorActionPreference = "Continue"

$root = Split-Path -Parent $PSScriptRoot
$pidFile = Join-Path $root ".codex-runtime\local-dev.pids.json"
$knownPorts = @(5173, 5176, 8081, 9099, 4000)

function Get-ListeningPidsByPort {
  param([int[]]$Ports)
  $results = @()
  foreach ($port in $Ports) {
    $lines = cmd /c "netstat -ano -p tcp | findstr :$port"
    foreach ($line in $lines) {
      $parts = ($line -split '\s+') | Where-Object { $_ -ne '' }
      if ($parts.Length -ge 5 -and $parts[3] -eq 'LISTENING') {
        $parsedPid = 0
        if ([int]::TryParse($parts[4], [ref]$parsedPid) -and $parsedPid -gt 0) {
          $results += $parsedPid
        }
      }
    }
  }
  return $results | Sort-Object -Unique
}

function Stop-LocalProcess {
  param(
    [int]$ProcessId,
    [string]$Label = "process"
  )
  if (-not $ProcessId -or $ProcessId -le 0) { return }
  try {
    Stop-Process -Id $ProcessId -Force -ErrorAction Stop
    Write-Host "Stopped $Label (PID $ProcessId)"
  } catch {
    Write-Host "$Label already stopped (PID $ProcessId)"
  }
}

if (Test-Path $pidFile) {
  $pids = Get-Content -Path $pidFile -Raw | ConvertFrom-Json
  foreach ($name in @("firebase", "vite", "upload")) {
    $procId = $pids.$name
    if ($procId) {
      Stop-LocalProcess -ProcessId $procId -Label $name
    }
  }
  Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
} else {
  Write-Host "No PID file found; falling back to known test ports."
}

$portPids = Get-ListeningPidsByPort -Ports $knownPorts
foreach ($procId in $portPids) {
  try {
    $procName = (Get-Process -Id $procId -ErrorAction Stop).ProcessName
    Stop-LocalProcess -ProcessId $procId -Label "port-bound $procName"
  } catch {
    Stop-LocalProcess -ProcessId $procId -Label "port-bound process"
  }
}

Write-Host "Done."
