#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Aplica migración GEO a tabla caendire
.DESCRIPTION
  Agrega campos lat/lng, estado geocoding, updated_at e indices
  para soportar filtros GEO en cartillas
.NOTES
  Semana 11 - Cartillas con GEO
#>

param(
  [string]$DbHost = "localhost",
  [string]$DbPort = "5432",
  [string]$DbName = "app_afiliados_genexus",
  [string]$DbUser = "postgres"
)

$ErrorActionPreference = "Stop"

Write-Host "=== MIGRACION GEO: Cartillas ===" -ForegroundColor Cyan
Write-Host ""

# Leer contraseña
$SecurePassword = Read-Host "Password para $DbUser" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecurePassword)
$DbPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

$env:PGPASSWORD = $DbPassword

try {
  Write-Host "[1/3] Verificando conexión a BD..." -ForegroundColor Yellow
  $testQuery = "SELECT COUNT(*) FROM caendire;"
  $result = & psql -h $DbHost -p $DbPort -U $DbUser -d $DbName -t -c $testQuery 2>&1
  
  if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ FAIL: No se pudo conectar a la BD" -ForegroundColor Red
    Write-Host $result
    exit 1
  }
  
  $totalDirs = $result.Trim()
  Write-Host "✅ Conectado OK (caendire: $totalDirs registros)" -ForegroundColor Green
  
  Write-Host "[2/3] Aplicando migración SQL..." -ForegroundColor Yellow
  $sqlFile = Join-Path $PSScriptRoot "add_cartillas_geo_fields.sql"
  
  if (-not (Test-Path $sqlFile)) {
    Write-Host "❌ FAIL: No se encuentra $sqlFile" -ForegroundColor Red
    exit 1
  }
  
  & psql -h $DbHost -p $DbPort -U $DbUser -d $DbName -f $sqlFile
  
  if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ FAIL: Error al aplicar migración" -ForegroundColor Red
    exit 1
  }
  
  Write-Host "✅ Migración aplicada exitosamente" -ForegroundColor Green
  
  Write-Host "[3/3] Verificando resultados..." -ForegroundColor Yellow
  $verifyQuery = @"
SELECT 
  COUNT(*) FILTER (WHERE caendgeost = 'pending') as pendientes,
  COUNT(*) FILTER (WHERE caendlat IS NOT NULL AND caendlng IS NOT NULL) as con_coords,
  COUNT(*) as total
FROM caendire;
"@
  
  $result = & psql -h $DbHost -p $DbPort -U $DbUser -d $DbName -t -c $verifyQuery
  Write-Host ""
  Write-Host "Resultados:" -ForegroundColor Cyan
  Write-Host $result -ForegroundColor Gray
  Write-Host ""
  
  Write-Host "========================================" -ForegroundColor Green
  Write-Host "MIGRACION COMPLETADA" -ForegroundColor Green
  Write-Host "========================================" -ForegroundColor Green
  Write-Host ""
  Write-Host "Próximos pasos:" -ForegroundColor Cyan
  Write-Host "1. npx prisma db pull (actualizar schema desde BD)" -ForegroundColor Gray
  Write-Host "2. npx prisma generate (regenerar Prisma Client)" -ForegroundColor Gray
  Write-Host "3. Implementar geocoding batch (Semana 13)" -ForegroundColor Gray
  
} finally {
  $env:PGPASSWORD = $null
}
