#!/usr/bin/env pwsh
# Script para blanquear (limpiar) tablas de cartilla
# Ejecuta truncate_cartilla_tables.sql

param(
    [switch]$Confirm = $false
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$sqlFile = Join-Path $scriptDir "truncate_cartilla_tables.sql"

Write-Host "=== BLANQUEAR TABLAS DE CARTILLA ===" -ForegroundColor Yellow
Write-Host ""

# Leer configuracion de conexion desde .env o usar defaults
$envFile = Join-Path (Split-Path -Parent $scriptDir) ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^DATABASE_URL=(.+)$') {
            $env:DATABASE_URL = $matches[1]
        }
    }
}

# Extraer componentes de DATABASE_URL
if ($env:DATABASE_URL -match 'postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)') {
    $dbUser = $matches[1]
    $dbPass = $matches[2]
    $dbHost = $matches[3]
    $dbPort = $matches[4]
    $dbName = $matches[5]
} else {
    # Valores por defecto
    $dbUser = "postgres"
    $dbPass = "admin"
    $dbHost = "localhost"
    $dbPort = "5432"
    $dbName = "app_afiliados_genexus"
}

Write-Host "Configuracion de BD:" -ForegroundColor Cyan
Write-Host "  Host: $dbHost"
Write-Host "  Port: $dbPort"
Write-Host "  Database: $dbName"
Write-Host "  User: $dbUser"
Write-Host ""

# Contar registros actuales
Write-Host "[*] Contando registros actuales..." -ForegroundColor Cyan
$env:PGPASSWORD = $dbPass
$countQuery = "SELECT COUNT(*) FROM caendire;"
$currentCount = & psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -t -c $countQuery 2>$null
$currentCount = $currentCount.Trim()

Write-Host "  Registros en caendire: $currentCount" -ForegroundColor White
Write-Host ""

if ([int]$currentCount -eq 0) {
    Write-Host "[OK] Las tablas ya estan vacias. No hay nada que limpiar." -ForegroundColor Green
    exit 0
}

# Advertencia y confirmacion
Write-Host "[!] ADVERTENCIA:" -ForegroundColor Red
Write-Host "    Este script eliminara TODOS los registros de las tablas de cartilla." -ForegroundColor Red
Write-Host "    Se perderan $currentCount registros en caendire." -ForegroundColor Red
Write-Host ""

if (-not $Confirm) {
    $response = Read-Host "Esta seguro que desea continuar? (escriba 'SI' para confirmar)"
    if ($response -ne "SI") {
        Write-Host "[X] Operacion cancelada por el usuario." -ForegroundColor Yellow
        exit 1
    }
}

# Ejecutar SQL
Write-Host ""
Write-Host "[*] Ejecutando limpieza de tablas..." -ForegroundColor Cyan
$env:PGPASSWORD = $dbPass

try {
    & psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -f $sqlFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "[OK] Tablas de cartilla blanqueadas exitosamente" -ForegroundColor Green
        
        # Verificar conteo final
        $finalCount = & psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -t -c $countQuery 2>$null
        $finalCount = $finalCount.Trim()
        Write-Host "     Registros restantes en caendire: $finalCount" -ForegroundColor White
    } else {
        Write-Host ""
        Write-Host "[X] Error al ejecutar el script SQL" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host ""
    Write-Host "[X] Error: $_" -ForegroundColor Red
    exit 1
} finally {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}
