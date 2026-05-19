param(
    [switch]$ForceRestart,
    [int]$Port = 3000
)

$ErrorActionPreference = 'Stop'

Write-Host "=== Reiniciando Backend ===" -ForegroundColor Cyan

function Test-Health {
    param([int]$Port)
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:$Port/health" -UseBasicParsing -TimeoutSec 4
        return ($r.StatusCode -eq 200)
    } catch {
        return $false
    }
}

function Get-NodePath {
    $nodeFromPath = Get-Command node -ErrorAction SilentlyContinue
    if ($nodeFromPath -and $nodeFromPath.Source) {
        return $nodeFromPath.Source
    }

    $candidates = @(
        'C:\nvm4w\nodejs\node.exe',
        'C:\Program Files\nodejs\node.exe',
        'C:\Tools\node16\node-v16.20.2-win-x64\node.exe'
    )

    foreach ($candidate in $candidates) {
        if (Test-Path $candidate) {
            return $candidate
        }
    }

    throw 'No se encontró node.exe. Agregá Node al PATH o instalalo en una ruta conocida.'
}

$wd = $PSScriptRoot
$listeners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue

if ($listeners -and -not $ForceRestart) {
    if (Test-Health -Port $Port) {
        $procIds = $listeners | Select-Object -ExpandProperty OwningProcess -Unique
        Write-Host "INFO: Backend ya activo en puerto $Port (PID(s): $($procIds -join ', '))." -ForegroundColor Yellow
        Write-Host 'Usá -ForceRestart para reiniciar igualmente.' -ForegroundColor Yellow
        exit 0
    }
}

if ($listeners) {
    $procIds = $listeners | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($procId in $procIds) {
        Write-Host "Matando proceso $procId en puerto $Port" -ForegroundColor Yellow
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Milliseconds 700
}

$check = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($check) {
    Write-Host "ERROR: Puerto $Port aun ocupado" -ForegroundColor Red
    exit 1
}

$node = Get-NodePath
Write-Host "Node detectado: $node" -ForegroundColor Gray
Write-Host "Iniciando backend desde $wd" -ForegroundColor Green

Set-Location $wd
Start-Process -FilePath $node -ArgumentList 'server-soap.js' -WorkingDirectory $wd -WindowStyle Normal | Out-Null

 $maxWaitSeconds = 20
 $elapsed = 0
 while ($elapsed -lt $maxWaitSeconds) {
    Start-Sleep -Seconds 1
    $elapsed++
    if (Test-Health -Port $Port) {
        Write-Host "OK: Backend respondio /health en puerto $Port (en ${elapsed}s)" -ForegroundColor Green
        exit 0
    }
 }

Write-Host "ERROR: Backend no responde en /health (puerto $Port)" -ForegroundColor Red
Write-Host 'Sugerencia: ejecutar "node server-soap.js" en backend para ver traza completa.' -ForegroundColor Yellow
exit 1
