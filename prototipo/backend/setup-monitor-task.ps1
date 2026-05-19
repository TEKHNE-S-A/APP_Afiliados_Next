param(
    [string]$TaskName = 'APP_Afiliados_Backend_Monitor',
    [int]$IntervalMinutes = 1,
    [string]$BaseUrl = 'http://localhost:3000',
    [string]$WebhookUrl = '',
    [string]$BackendPath = $PSScriptRoot,
    [switch]$RunAsSystem,
    [switch]$Remove,
    [switch]$WhatIfOnly
)

$ErrorActionPreference = 'Stop'

function Invoke-Schtasks {
    param(
        [string[]]$Args
    )

    $output = & schtasks @Args 2>&1
    $exitCode = $LASTEXITCODE

    if ($exitCode -ne 0) {
        $joined = ($output | Out-String).Trim()
        throw "schtasks falló (exit=$exitCode): $joined"
    }

    return $output
}

if ($IntervalMinutes -lt 1) {
    throw 'IntervalMinutes debe ser >= 1'
}

$monitorScript = Join-Path $BackendPath 'ops\monitor-backend.ps1'
if (!(Test-Path $monitorScript)) {
    throw "No se encontró monitor-backend.ps1 en: $monitorScript"
}

if ($Remove) {
    Write-Host "Eliminando tarea: $TaskName" -ForegroundColor Yellow
    if ($WhatIfOnly) {
        Write-Host "[WhatIf] schtasks /Delete /TN $TaskName /F" -ForegroundColor Cyan
        exit 0
    }
    Invoke-Schtasks -Args @('/Delete', '/TN', $TaskName, '/F') | Out-Null
    Write-Host "Tarea eliminada." -ForegroundColor Green
    exit 0
}

$psArgs = "-NoProfile -ExecutionPolicy Bypass -File $monitorScript -BaseUrl $BaseUrl"
if (-not [string]::IsNullOrWhiteSpace($WebhookUrl)) {
    $psArgs += " -WebhookUrl $WebhookUrl"
}

Write-Host "Creando/actualizando tarea programada: $TaskName" -ForegroundColor Cyan
if ($WhatIfOnly) {
    Write-Host "[WhatIf] schtasks /Create /TN $TaskName /SC MINUTE /MO $IntervalMinutes /TR \"powershell.exe $psArgs\" /F" -ForegroundColor Cyan
    exit 0
}

$createParts = @(
    '/Create',
    '/TN', $TaskName,
    '/SC', 'MINUTE',
    '/MO', $IntervalMinutes,
    '/TR', "powershell.exe $psArgs",
    '/F'
)

if ($RunAsSystem) {
    $createParts += @('/RU', 'SYSTEM')
}

Invoke-Schtasks -Args $createParts | Out-Null

Write-Host 'Tarea creada correctamente.' -ForegroundColor Green
Write-Host "Nombre: $TaskName"
Write-Host "Frecuencia: cada $IntervalMinutes minuto(s)"
Write-Host "Comando: powershell.exe $psArgs"

$taskInfo = Invoke-Schtasks -Args @('/Query', '/TN', $TaskName, '/V', '/FO', 'LIST')
$taskInfo

if ($RunAsSystem) {
    $joinedInfo = ($taskInfo | Out-String)
    if ($joinedInfo -notmatch '(?i)Ejecutar como usuario:\s+SYSTEM' -and $joinedInfo -notmatch '(?i)Run As User:\s+SYSTEM') {
        throw 'La tarea no quedó configurada como SYSTEM. Ejecutar PowerShell como Administrador y volver a correr el script con -RunAsSystem.'
    }
}
