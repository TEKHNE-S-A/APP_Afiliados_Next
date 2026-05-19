# Script para aplicar parámetros de Google Maps API
# PowerShell
# Uso: .\apply-google-maps-params.ps1

$ErrorActionPreference = "Stop"

Write-Host "`n===== APLICAR PARÁMETROS GOOGLE MAPS =====" -ForegroundColor Cyan

# Configuración de BD
$DB_HOST = "localhost"
$DB_PORT = "5432"
$DB_NAME = "app_afiliados_genexus"
$DB_USER = "postgres"
$DB_PASS = "12345678"

$SQL_FILE = Join-Path $PSScriptRoot "insert_google_maps_params.sql"

if (-not (Test-Path $SQL_FILE)) {
    Write-Host "❌ Error: No se encuentra $SQL_FILE" -ForegroundColor Red
    exit 1
}

Write-Host "📁 Archivo SQL: $SQL_FILE" -ForegroundColor Yellow
Write-Host "🗄️  Base de datos: $DB_NAME" -ForegroundColor Yellow

# Setear PGPASSWORD en el entorno
$env:PGPASSWORD = $DB_PASS

try {
    Write-Host "`n🔄 Ejecutando SQL..." -ForegroundColor Yellow
    
    # Ejecutar psql
    $output = & psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $SQL_FILE 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error ejecutando SQL" -ForegroundColor Red
        Write-Host $output -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Parámetros aplicados exitosamente" -ForegroundColor Green
    Write-Host $output -ForegroundColor Gray
    
    # Verificar parámetros insertados
    Write-Host "`n📊 Verificando parámetros..." -ForegroundColor Yellow
    
    $query = "SELECT nusisgrupa, nusistippa, nusisvalpa, nusisdescr FROM nusispar WHERE nusisgrupa = 'GOOGLE_MAPS' ORDER BY nusistippa;"
    $result = & psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -A -F "," -c $query
    
    Write-Host ""
    Write-Host "=== PARAMETROS GOOGLE MAPS ===" -ForegroundColor Cyan
    $result | ForEach-Object {
        $parts = $_ -split ','
        if ($parts.Length -ge 4) {
            Write-Host "  $($parts[1]): $($parts[2])" -ForegroundColor White
        }
    }
    
    Write-Host ""
    Write-Host "IMPORTANTE:" -ForegroundColor Yellow
    Write-Host "1. Actualiza el parametro 'ApiKey' con tu clave de Google Cloud Console" -ForegroundColor Yellow
    Write-Host "2. Habilita la API 'Geocoding API' en tu proyecto de Google Cloud" -ForegroundColor Yellow
    Write-Host "3. Configura limites de cuota y billing en Google Cloud Console" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Mas info: https://console.cloud.google.com/apis/library/geocoding-backend.googleapis.com" -ForegroundColor Cyan
    
    Write-Host "`n===== APLICACIÓN COMPLETADA =====" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    exit 1
} finally {
    # Limpiar variable de entorno
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}
