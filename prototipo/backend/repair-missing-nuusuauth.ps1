# Reparar usuarios GAM sin entrada en nuusuauth
# Uso: .\repair-missing-nuusuauth.ps1 [-DryRun]

param(
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

Write-Host "🔧 REPARACIÓN DE USUARIOS SIN NUUSUAUTH" -ForegroundColor Cyan
Write-Host ""

$scriptDir = $PSScriptRoot
if (-not $scriptDir) {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
}

Set-Location $scriptDir

if ($DryRun) {
    Write-Host "🏃 MODO DRY RUN - Solo mostrar usuarios afectados" -ForegroundColor Yellow
    Write-Host ""
    node repair-missing-nuusuauth.js --dry-run
} else {
    Write-Host "⚠️  MODO COMPLETO - Se crearán entradas en nuusuauth" -ForegroundColor Yellow
    Write-Host "   Password por defecto: 123456" -ForegroundColor Yellow
    Write-Host ""
    $confirm = Read-Host "¿Continuar? (S/N)"
    
    if ($confirm -eq 'S' -or $confirm -eq 's') {
        node repair-missing-nuusuauth.js
    } else {
        Write-Host "❌ Operación cancelada" -ForegroundColor Red
        exit 1
    }
}
