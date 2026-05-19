# Script PowerShell para ejecutar sync-users-from-gam.js
# Versión: 1.0.0
# Autor: Sistema de migración GAM
# Descripción: Wrapper PowerShell para facilitar la ejecución del script de sincronización

param(
    [string]$Email = "",
    [switch]$DryRun = $false,
    [switch]$SkipCredentials = $false,
    [switch]$Help = $false
)

# Colores
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

if ($Help) {
    Write-Host ""
    Write-ColorOutput Green "╔════════════════════════════════════════════════════════════════╗"
    Write-ColorOutput Green "║   Script de Sincronización Automática GAM → BD Local          ║"
    Write-ColorOutput Green "╚════════════════════════════════════════════════════════════════╝"
    Write-Host ""
    Write-Host "Uso:"
    Write-Host "  .\sync-users-from-gam.ps1                        # Todos los usuarios"
    Write-Host "  .\sync-users-from-gam.ps1 -DryRun                # Simulación sin cambios"
    Write-Host "  .\sync-users-from-gam.ps1 -Email user@test.com   # Solo un usuario"
    Write-Host "  .\sync-users-from-gam.ps1 -SkipCredentials       # Sin sync de credenciales"
    Write-Host ""
    Write-Host "Parámetros:"
    Write-Host "  -Email <string>        Email del usuario a sincronizar (opcional)"
    Write-Host "  -DryRun                Simular ejecución sin realizar cambios"
    Write-Host "  -SkipCredentials       Saltar sincronización de credenciales SOAP"
    Write-Host "  -Help                  Mostrar esta ayuda"
    Write-Host ""
    Write-Host "Ejemplos:"
    Write-Host "  # Simular sincronización de todos los usuarios"
    Write-ColorOutput Cyan "  .\sync-users-from-gam.ps1 -DryRun"
    Write-Host ""
    Write-Host "  # Sincronizar un solo usuario (producción)"
    Write-ColorOutput Cyan "  .\sync-users-from-gam.ps1 -Email marianr@tekhne.com.ar"
    Write-Host ""
    Write-Host "  # Sincronizar todos (producción)"
    Write-ColorOutput Yellow "  .\sync-users-from-gam.ps1"
    Write-Host ""
    exit 0
}

Write-Host ""
Write-ColorOutput Green "╔════════════════════════════════════════════════════════════════╗"
Write-ColorOutput Green "║   Sincronización GAM → BD Local                                ║"
Write-ColorOutput Green "╚════════════════════════════════════════════════════════════════╝"
Write-Host ""

# Validar que Node.js está instalado
$nodeVersion = node --version 2>$null
if (-not $nodeVersion) {
    Write-ColorOutput Red "❌ Error: Node.js no está instalado o no está en PATH"
    Write-Host ""
    Write-Host "Instala Node.js desde: https://nodejs.org/"
    Write-Host ""
    exit 1
}

Write-ColorOutput Gray "Node.js: $nodeVersion"
Write-Host ""

# Navegar al directorio del script
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location $scriptDir

# Construir argumentos
$nodeArgs = @()

if ($Email) {
    $nodeArgs += "--email=$Email"
    Write-ColorOutput Cyan "📧 Modo: Usuario único ($Email)"
}
else {
    Write-ColorOutput Cyan "📧 Modo: Todos los usuarios"
}

if ($DryRun) {
    $nodeArgs += "--dry-run"
    Write-ColorOutput Yellow "⚠️  MODO DRY-RUN: No se realizarán cambios"
}
else {
    Write-ColorOutput Yellow "⚠️  MODO PRODUCCIÓN: Se realizarán cambios en la BD"
}

if ($SkipCredentials) {
    $nodeArgs += "--skip-credentials"
    Write-ColorOutput Gray "⏭️  Saltando sincronización de credenciales"
}

Write-Host ""

# Confirmar ejecución si no es dry-run
if (-not $DryRun) {
    Write-ColorOutput Red "⚠️  ADVERTENCIA: Este script modificará la base de datos"
    Write-Host ""
    $confirm = Read-Host "¿Continuar? (S/N)"
    if ($confirm -ne "S" -and $confirm -ne "s") {
        Write-ColorOutput Yellow "Operación cancelada"
        Pop-Location
        exit 0
    }
    Write-Host ""
}

# Ejecutar script Node.js
Write-ColorOutput Gray "Ejecutando: node sync-users-from-gam.js $($nodeArgs -join ' ')"
Write-Host ""
Write-Host "════════════════════════════════════════════════════════════════"
Write-Host ""

node sync-users-from-gam.js @nodeArgs

Write-Host ""
Write-ColorOutput Green "✅ Script completado"
Write-Host ""

Pop-Location
