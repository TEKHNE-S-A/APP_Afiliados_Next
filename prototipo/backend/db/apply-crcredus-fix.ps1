#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Aplica fix a crcredus.nuusuid para consistencia con migración GAM

.DESCRIPTION
  Actualiza crcredus.nuusuid de BPCHAR(40) a VARCHAR(100) para soportar
  UserID de GAM que pueden exceder 40 caracteres.
  
  Esta es una corrección a la migración GAM original que no actualizó
  todas las tablas relacionadas con nuusuid.

.EXAMPLE
  .\apply-crcredus-fix.ps1
#>

$ErrorActionPreference = "Stop"

# Configuración PostgreSQL (leer de config.json)
$configPath = Join-Path $PSScriptRoot "..\config.json"
if (-not (Test-Path $configPath)) {
    Write-Error "❌ No se encuentra config.json en: $configPath"
    exit 1
}

$config = Get-Content $configPath | ConvertFrom-Json
$db = $config.database

Write-Host "🔧 Aplicando fix a crcredus.nuusuid..." -ForegroundColor Cyan
Write-Host ""
Write-Host "📦 Base de datos: $($db.database)" -ForegroundColor Gray
Write-Host "🏠 Host: $($db.host):$($db.port)" -ForegroundColor Gray
Write-Host ""

# Verificar estado actual
Write-Host "🔍 Verificando estado actual de crcredus.nuusuid..." -ForegroundColor Yellow

$checkQuery = "SELECT column_name, data_type, CASE WHEN character_maximum_length IS NOT NULL THEN data_type || '(' || character_maximum_length || ')' ELSE data_type END as tipo_completo FROM information_schema.columns WHERE table_name = 'crcredus' AND column_name = 'nuusuid';"

$env:PGPASSWORD = $db.password
$checkCmd = "psql -h $($db.host) -p $($db.port) -U $($db.user) -d $($db.database) -c `"$checkQuery`""

Write-Host "Ejecutando verificación..." -ForegroundColor Gray
$currentState = Invoke-Expression $checkCmd

Write-Host ""
Write-Host "Estado actual:" -ForegroundColor White
Write-Host $currentState
Write-Host ""

# Confirmar con usuario
Write-Host "⚠️  ADVERTENCIA:" -ForegroundColor Yellow
Write-Host "  Esta operación actualizará el tipo de columna crcredus.nuusuid" -ForegroundColor Yellow
Write-Host "  de BPCHAR(40) a VARCHAR(100)" -ForegroundColor Yellow
Write-Host ""
$confirm = Read-Host "¿Deseas continuar? (S/N)"

if ($confirm -ne "S" -and $confirm -ne "s") {
    Write-Host "❌ Operación cancelada por el usuario" -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "🚀 Aplicando migración..." -ForegroundColor Green

# Aplicar el fix
$fixQuery = "BEGIN; ALTER TABLE crcredus ALTER COLUMN nuusuid TYPE VARCHAR(100); COMMENT ON COLUMN crcredus.nuusuid IS 'FK a nuusuari.nuusuid - soporta UserID de GAM (VARCHAR 100)'; SELECT tc.constraint_name, tc.table_name, kcu.column_name, ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name FROM information_schema.table_constraints AS tc JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name='crcredus' AND kcu.column_name='nuusuid'; COMMIT;"

$fixCmd = "psql -h $($db.host) -p $($db.port) -U $($db.user) -d $($db.database) -c `"$fixQuery`""

try {
    $result = Invoke-Expression $fixCmd
    
    Write-Host ""
    Write-Host "✅ Fix aplicado exitosamente" -ForegroundColor Green
    Write-Host ""
    
    # Verificar resultado final
    Write-Host "🔍 Verificando resultado final..." -ForegroundColor Cyan
    $finalCheck = Invoke-Expression $checkCmd
    
    Write-Host ""
    Write-Host "Estado final:" -ForegroundColor White
    Write-Host $finalCheck
    Write-Host ""
    
    Write-Host "📋 Resumen de cambios:" -ForegroundColor Cyan
    Write-Host "  ✅ crcredus.nuusuid: BPCHAR(40) → VARCHAR(100)" -ForegroundColor Green
    Write-Host "  ✅ Consistencia con nuusuari.nuusuid mantenida" -ForegroundColor Green
    Write-Host "  ✅ Soporte completo para UserID de GAM" -ForegroundColor Green
    Write-Host ""
    Write-Host "🎉 Migración completada" -ForegroundColor Green
    
} catch {
    Write-Host ""
    Write-Host "❌ Error durante la migración:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Verifica:" -ForegroundColor Yellow
    Write-Host "  - Credenciales de PostgreSQL en config.json" -ForegroundColor Yellow
    Write-Host "  - Servicio PostgreSQL corriendo" -ForegroundColor Yellow
    Write-Host "  - Usuario tiene permisos ALTER TABLE" -ForegroundColor Yellow
    exit 1
}
