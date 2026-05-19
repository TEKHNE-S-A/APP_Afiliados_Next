#!/usr/bin/env pwsh
# Script para importar cartilla completa (limpieza + importación)
# Actualiza las 9 tablas con UPSERT de catálogos

param(
    [Parameter(Mandatory=$false)]
    [string]$FilePath = "",
    
    [Parameter(Mandatory=$false)]
    [switch]$DryRun = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipClean = $false
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "=== IMPORTACION COMPLETA DE CARTILLA ===" -ForegroundColor Cyan
Write-Host ""

# Solicitar archivo si no se proporcionó
if (-not $FilePath) {
    $FilePath = Read-Host "Ruta completa del archivo JSONL"
}

# Verificar archivo
if (-not (Test-Path $FilePath)) {
    Write-Host "[X] Error: Archivo no encontrado: $FilePath" -ForegroundColor Red
    exit 1
}

$fileInfo = Get-Item $FilePath
Write-Host "Archivo: $($fileInfo.Name)" -ForegroundColor White
Write-Host "Tamaño: $([math]::Round($fileInfo.Length / 1MB, 2)) MB" -ForegroundColor White
Write-Host "Modo: $(if ($DryRun) { 'DRY RUN (sin guardar)' } else { 'PRODUCCION' })" -ForegroundColor $(if ($DryRun) { 'Yellow' } else { 'Green' })
Write-Host ""

# PASO 1: Limpiar tablas (opcional)
if (-not $SkipClean -and -not $DryRun) {
    Write-Host "[1/2] Limpiando tablas existentes..." -ForegroundColor Cyan
    Write-Host ""
    
    $cleanScript = Join-Path $scriptDir "truncate-cartilla.js"
    if (-not (Test-Path $cleanScript)) {
        Write-Host "[X] Error: No se encontro el script de limpieza: $cleanScript" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "[!] Se eliminaran TODAS las tablas de cartilla (datos + catalogos)" -ForegroundColor Yellow
    $confirm = Read-Host "Continuar? (escriba 'SI' para confirmar)"
    
    if ($confirm -ne "SI") {
        Write-Host "[X] Operacion cancelada" -ForegroundColor Yellow
        exit 1
    }
    
    # Ejecutar limpieza con confirmación automática
    $env:NODE_ENV = "production"
    echo "SI" | node $cleanScript
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[X] Error al limpiar tablas" -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
    Write-Host "[OK] Tablas limpiadas exitosamente" -ForegroundColor Green
    Write-Host ""
}

# PASO 2: Importar datos
Write-Host "$(if ($SkipClean -or $DryRun) { '[1/1]' } else { '[2/2]' }) Importando datos..." -ForegroundColor Cyan
Write-Host ""

$importScript = Join-Path (Split-Path -Parent $scriptDir) "import-cartilla-external.ps1"
if (-not (Test-Path $importScript)) {
    Write-Host "[X] Error: No se encontro el script de importacion: $importScript" -ForegroundColor Red
    exit 1
}

# Ejecutar importación
$importArgs = @(
    "-Input", $FilePath,
    "-BatchSize", "100"
)

if ($DryRun) {
    $importArgs += "-DryRun"
}

& $importScript @importArgs

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[X] Error durante la importacion" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "[OK] PROCESO COMPLETADO EXITOSAMENTE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Mostrar estadísticas finales
if (-not $DryRun) {
    Write-Host "Contando registros finales..." -ForegroundColor Cyan
    
    $countScript = @"
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const counts = {
    paises: await prisma.nupais.count(),
    provincias: await prisma.nuprovin.count(),
    localidades: await prisma.nulocali.count(),
    rubros: await prisma.carubro.count(),
    especialidades: await prisma.caespeci.count(),
    entidades: await prisma.caentida.count(),
    direcciones: await prisma.caendire.count(),
    telefonos: await prisma.caentele.count(),
    cartilla: await prisma.cacartil.count()
  };
  
  console.log('\nTablas de catalogos:');
  console.log('  Paises:        ' + counts.paises);
  console.log('  Provincias:    ' + counts.provincias);
  console.log('  Localidades:   ' + counts.localidades);
  console.log('  Rubros:        ' + counts.rubros);
  console.log('  Especialidades:' + counts.especialidades);
  console.log('\nTablas de datos:');
  console.log('  Entidades:     ' + counts.entidades);
  console.log('  Direcciones:   ' + counts.direcciones);
  console.log('  Telefonos:     ' + counts.telefonos);
  console.log('  Cartilla:      ' + counts.cartilla);
  
  await prisma.`$disconnect();
}

main().catch(console.error);
"@
    
    $tempCountScript = Join-Path $env:TEMP "count-cartilla.js"
    $countScript | Out-File -FilePath $tempCountScript -Encoding UTF8
    
    node $tempCountScript
    Remove-Item $tempCountScript -ErrorAction SilentlyContinue
}

Write-Host ""
