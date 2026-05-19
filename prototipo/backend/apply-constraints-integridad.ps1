#!/usr/bin/env pwsh
# Script: Aplicar constraints de integridad (Ítem 4 + Ítem 6)
# Fecha: 05/05/2026

param(
    [switch]$DryRun = $false
)

$ErrorActionPreference = "Stop"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "🔧 Aplicar Constraints de Integridad Referencial" -ForegroundColor Cyan
Write-Host "   Ítem 4: UNIQUE (email, CUIL)" -ForegroundColor Yellow
Write-Host "   Ítem 6: FK con ON DELETE CASCADE" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Cyan

# Variables de conexión BD
$dbHost = "localhost"
$dbPort = 5432
$dbName = "app_afiliados_genexus"
$dbUser = "postgres"

# Verificar si psql está disponible
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psqlPath) {
    Write-Host "❌ psql no está en PATH. Intentando ubicación PostgreSQL típica..." -ForegroundColor Red
    $psqlPath = "C:\Program Files\PostgreSQL\*\bin\psql.exe"
    $psqlPath = Get-Item $psqlPath -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
    if (-not $psqlPath) {
        Write-Host "❌ No se encontró psql. Instala PostgreSQL client tools." -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ psql encontrado: $psqlPath" -ForegroundColor Green

if ($DryRun) {
    Write-Host "`n📋 MODO DRY-RUN: Solo mostrando el SQL, sin ejecutar" -ForegroundColor Magenta
    $sqlFile = Join-Path $PSScriptRoot "db" "add_constraints_integridad.sql"
    if (Test-Path $sqlFile) {
        Write-Host "`n📄 Contenido del script SQL:`n" -ForegroundColor Cyan
        Get-Content $sqlFile
    } else {
        Write-Host "⚠️  Archivo SQL no encontrado: $sqlFile" -ForegroundColor Yellow
    }
    exit 0
}

# Ejecutar script SQL
Write-Host "`n⏳ Aplicando constraints en BD: $dbName..." -ForegroundColor Yellow

$sqlFile = Join-Path $PSScriptRoot "db" "add_constraints_integridad.sql"

if (-not (Test-Path $sqlFile)) {
    Write-Host "❌ Archivo SQL no encontrado: $sqlFile" -ForegroundColor Red
    exit 1
}

try {
    & $psqlPath -h $dbHost -p $dbPort -U $dbUser -d $dbName -f $sqlFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Constraints aplicadas exitosamente" -ForegroundColor Green
        Write-Host "`n📊 Cambios aplicados:" -ForegroundColor Cyan
        Write-Host "   • nuusuari.nuusumail → UNIQUE (previene emails duplicados)" -ForegroundColor Green
        Write-Host "   • crcreden.crcrecuil → UNIQUE (previene CUILs duplicados)" -ForegroundColor Green
        Write-Host "   • crcredus.nuusuid → FK con ON DELETE CASCADE" -ForegroundColor Green
        Write-Host "   • crcredus.crcreid → FK con ON DELETE CASCADE" -ForegroundColor Green
    } else {
        Write-Host "`n❌ Error al aplicar constraints (exit code: $LASTEXITCODE)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "`n❌ Error: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "✅ Operación completada" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
